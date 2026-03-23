// ─── ProcessManager Service ──────────────────────────────────────────────────
// Manages spawning, monitoring, and terminating child processes for DevDock.
// Based on PRD Section 6.1 — Project Dashboard & Process Control.
//
// Events emitted:
//   'started'  → { projectId: string; pid: number }
//   'stopped'  → { projectId: string; code: number | null; signal: string | null }
//   'error'    → { projectId: string; error: string }
//   'output'   → { projectId: string; data: string; source: 'stdout' | 'stderr' }

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { readFile } from 'fs/promises'
import path from 'path'
import treeKill from 'tree-kill'
import type { Project, ProcessInfo } from '../../shared/types'

// ─── Event Payload Types ─────────────────────────────────────────────────────

export interface ProcessStartedEvent {
  projectId: string
  pid: number
}

export interface ProcessStoppedEvent {
  projectId: string
  code: number | null
  signal: string | null
}

export interface ProcessErrorEvent {
  projectId: string
  error: string
}

export interface ProcessOutputEvent {
  projectId: string
  data: string
  source: 'stdout' | 'stderr'
}

// ─── Typed Event Map ─────────────────────────────────────────────────────────

export interface ProcessManagerEvents {
  started: [ProcessStartedEvent]
  stopped: [ProcessStoppedEvent]
  error: [ProcessErrorEvent]
  output: [ProcessOutputEvent]
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** How long to wait for a graceful shutdown before sending SIGKILL (ms) */
const KILL_TIMEOUT_MS = 5_000

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a .env file into a key-value record.
 *
 * Rules:
 * - Lines starting with `#` are comments and are skipped.
 * - Blank / whitespace-only lines are skipped.
 * - Format: `KEY=VALUE`
 * - Values may be optionally wrapped in single or double quotes, which are stripped.
 * - Inline comments after an un-quoted value are **not** stripped (matches `dotenv` behaviour).
 */
function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {}

  for (const raw of contents.split('\n')) {
    const line = raw.trim()

    // Skip empty lines and comments
    if (line === '' || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()

    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key) {
      env[key] = value
    }
  }

  return env
}

/**
 * Load and parse a .env file, resolving the path relative to the project root.
 * Returns an empty object if the file cannot be read.
 */
async function loadEnvFile(
  envFilePath: string,
  projectPath: string
): Promise<Record<string, string>> {
  try {
    const resolved = path.isAbsolute(envFilePath)
      ? envFilePath
      : path.resolve(projectPath, envFilePath)
    const contents = await readFile(resolved, 'utf-8')
    return parseEnvFile(contents)
  } catch {
    // File missing or unreadable — not fatal, just skip
    return {}
  }
}

/**
 * Wrap `tree-kill` in a promise.
 */
function treeKillAsync(pid: number, signal: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    treeKill(pid, signal, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// ─── ProcessManager ──────────────────────────────────────────────────────────

interface ManagedProcess {
  child: ChildProcess
  info: ProcessInfo
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ManagedProcess> = new Map()

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Spawn the project's start command as a child process.
   *
   * Resolves with the new PID once the process has been spawned.
   * Rejects if the project is already running or the spawn fails synchronously.
   */
  async start(project: Project): Promise<{ pid: number }> {
    if (this.processes.has(project.id)) {
      throw new Error(`Project "${project.name}" (${project.id}) is already running.`)
    }

    // Build environment: inherit current env, then layer .env file values
    const env: Record<string, string> = { ...process.env } as Record<string, string>

    if (project.envFile) {
      const envFileVars = await loadEnvFile(project.envFile, project.path)
      Object.assign(env, envFileVars)
    }

    // Spawn with shell: true so that the full startCmd string is interpreted
    // by the OS shell, supporting pipes, redirects, etc.
    const child = spawn(project.startCmd, [], {
      cwd: project.path,
      shell: true,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    // Guard: the spawn may fail synchronously and pid would be undefined
    if (child.pid === undefined) {
      return new Promise<{ pid: number }>((_, reject) => {
        child.once('error', (err) => {
          reject(new Error(`Failed to start project "${project.name}": ${err.message}`))
        })
      })
    }

    const info: ProcessInfo = {
      pid: child.pid,
      projectId: project.id,
      startedAt: Date.now()
    }

    this.processes.set(project.id, { child, info })

    // ── stdout ─────────────────────────────────────────────────────────────
    child.stdout?.on('data', (chunk: Buffer) => {
      this.emit('output', {
        projectId: project.id,
        data: chunk.toString(),
        source: 'stdout'
      } satisfies ProcessOutputEvent)
    })

    // ── stderr ─────────────────────────────────────────────────────────────
    child.stderr?.on('data', (chunk: Buffer) => {
      this.emit('output', {
        projectId: project.id,
        data: chunk.toString(),
        source: 'stderr'
      } satisfies ProcessOutputEvent)
    })

    // ── error ──────────────────────────────────────────────────────────────
    child.on('error', (err) => {
      this.emit('error', {
        projectId: project.id,
        error: err.message
      } satisfies ProcessErrorEvent)

      // Clean up the map so the project is no longer considered running
      this.processes.delete(project.id)
    })

    // ── close ──────────────────────────────────────────────────────────────
    child.on('close', (code, signal) => {
      this.processes.delete(project.id)

      this.emit('stopped', {
        projectId: project.id,
        code,
        signal
      } satisfies ProcessStoppedEvent)
    })

    this.emit('started', {
      projectId: project.id,
      pid: child.pid
    } satisfies ProcessStartedEvent)

    return { pid: child.pid }
  }

  /**
   * Stop a running project by killing its entire process tree.
   *
   * Sends SIGTERM first, then escalates to SIGKILL after {@link KILL_TIMEOUT_MS}.
   * Resolves once the process has exited (the 'close' handler cleans the map).
   * Resolves immediately if the project is not running.
   */
  async stop(projectId: string): Promise<void> {
    const managed = this.processes.get(projectId)
    if (!managed) return

    const { child } = managed
    const pid = child.pid

    // pid can be undefined if the process never started properly
    if (pid === undefined) {
      this.processes.delete(projectId)
      return
    }

    return new Promise<void>((resolve) => {
      let resolved = false

      const onExit = (): void => {
        if (!resolved) {
          resolved = true
          clearTimeout(killTimer)
          resolve()
        }
      }

      // Listen for the child to actually exit
      child.once('close', onExit)
      child.once('exit', onExit)

      // Attempt graceful shutdown with SIGTERM via tree-kill
      treeKillAsync(pid, 'SIGTERM').catch(() => {
        // tree-kill failed (process may already be dead) — ignore
      })

      // Escalation: if the process hasn't exited after the timeout, SIGKILL
      const killTimer = setTimeout(() => {
        if (!resolved) {
          treeKillAsync(pid, 'SIGKILL').catch(() => {
            // Best-effort — if SIGKILL also fails the process is likely gone
          })
          // Give SIGKILL a brief moment, then resolve regardless
          setTimeout(() => {
            if (!resolved) {
              resolved = true
              this.processes.delete(projectId)
              resolve()
            }
          }, 1_000)
        }
      }, KILL_TIMEOUT_MS)
    })
  }

  /**
   * Stop then start a project. Returns the new PID.
   */
  async restart(project: Project): Promise<{ pid: number }> {
    await this.stop(project.id)
    return this.start(project)
  }

  /**
   * Check if a project's process is currently alive.
   */
  isRunning(projectId: string): boolean {
    const managed = this.processes.get(projectId)
    if (!managed) return false

    // `child.killed` is true once *we* have sent a kill signal,
    // but the process may not have exited yet. `exitCode !== null`
    // is the definitive indicator that it has terminated.
    return managed.child.exitCode === null
  }

  /**
   * Get the {@link ProcessInfo} for a managed project, or `null` if not running.
   */
  getProcessInfo(projectId: string): ProcessInfo | null {
    return this.processes.get(projectId)?.info ?? null
  }

  /**
   * Get a snapshot of all currently-running process infos.
   */
  getAllProcesses(): Map<string, ProcessInfo> {
    const result = new Map<string, ProcessInfo>()
    for (const [id, managed] of this.processes) {
      result.set(id, managed.info)
    }
    return result
  }

  /**
   * Gracefully stop every managed process. Waits for all to terminate.
   */
  async stopAll(): Promise<void> {
    const ids = [...this.processes.keys()]
    await Promise.all(ids.map((id) => this.stop(id)))
  }
}
