// ─── ResourceMonitor Service ────────────────────────────────────────────────────
// Monitors CPU and memory usage for managed processes.
// Based on PRD Section 6.5 — Resource Monitoring.
//
// Events emitted:
//   'snapshot'   → { projectId: string; snapshot: ResourceSnapshot }
//   'error'      → { projectId: string; error: string }
// ────────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ResourceSnapshot } from '../../shared/types'
import {
  RESOURCE_MONITOR_INTERVAL,
  RESOURCE_HISTORY_LENGTH
} from '../../shared/constants'

const execFileAsync = promisify(execFile)

// ─── Event Payload Types ─────────────────────────────────────────────────────

export interface ResourceSnapshotEvent {
  projectId: string
  snapshot: ResourceSnapshot
}

export interface ResourceErrorEvent {
  projectId: string
  error: string
}

// ─── Typed Event Map ─────────────────────────────────────────────────────────

export interface ResourceMonitorEvents {
  snapshot: [ResourceSnapshotEvent]
  error: [ResourceErrorEvent]
}

// ─── ResourceMonitor ─────────────────────────────────────────────────────────

export class ResourceMonitor extends EventEmitter {
  private history: Map<string, ResourceSnapshot[]> = new Map()
  private pids: Map<string, number> = new Map()
  private timer: NodeJS.Timeout | null = null
  private maxSamples: number

  constructor(maxSamples: number = RESOURCE_HISTORY_LENGTH) {
    super()
    this.maxSamples = maxSamples
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Begin periodic resource monitoring. */
  start(): void {
    if (this.timer) return

    // Run an initial poll immediately, then schedule recurring polls.
    void this.poll()
    this.timer = setInterval(() => void this.poll(), RESOURCE_MONITOR_INTERVAL)
  }

  /** Stop periodic monitoring. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Begin tracking resource usage for a process.
   * Initializes an empty history buffer for the project.
   */
  trackProcess(projectId: string, pid: number): void {
    this.pids.set(projectId, pid)

    if (!this.history.has(projectId)) {
      this.history.set(projectId, [])
    }
  }

  /**
   * Stop tracking a process and remove its history.
   */
  untrackProcess(projectId: string): void {
    this.pids.delete(projectId)
    this.history.delete(projectId)
  }

  /**
   * Get the resource snapshot history for a specific project.
   * Returns an empty array if the project is not tracked.
   */
  getHistory(projectId: string): ResourceSnapshot[] {
    return this.history.get(projectId) ?? []
  }

  /**
   * Get resource snapshot history for all tracked projects.
   */
  getAllHistory(): Record<string, ResourceSnapshot[]> {
    const result: Record<string, ResourceSnapshot[]> = {}

    for (const [projectId, snapshots] of this.history) {
      result[projectId] = snapshots
    }

    return result
  }

  /**
   * Get aggregate resource usage across all tracked processes.
   * Uses the most recent snapshot from each project.
   */
  getAggregates(): { totalCpu: number; totalMem: number; processCount: number } {
    let totalCpu = 0
    let totalMem = 0
    let processCount = 0

    for (const [, snapshots] of this.history) {
      if (snapshots.length === 0) continue

      const latest = snapshots[snapshots.length - 1]
      totalCpu += latest.cpu
      totalMem += latest.mem
      processCount++
    }

    return { totalCpu, totalMem, processCount }
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /** Poll all tracked PIDs for resource usage. */
  private async poll(): Promise<void> {
    const entries = [...this.pids.entries()]

    // Poll all tracked processes concurrently.
    await Promise.allSettled(
      entries.map(([projectId, pid]) => this.pollProcess(projectId, pid))
    )
  }

  /** Query resource usage for a single process. */
  private async pollProcess(projectId: string, pid: number): Promise<void> {
    try {
      const snapshot = await this.queryProcessResources(pid)

      if (snapshot === null) {
        // Process no longer exists — untrack it silently.
        this.untrackProcess(projectId)
        return
      }

      // Add to circular history buffer.
      const history = this.history.get(projectId)
      if (history) {
        history.push(snapshot)

        // Evict oldest sample if over capacity.
        if (history.length > this.maxSamples) {
          history.shift()
        }
      }

      this.emit('snapshot', {
        projectId,
        snapshot
      } satisfies ResourceSnapshotEvent)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)

      // If we get an error querying, the process likely no longer exists.
      // Check if it's a "no such process" type error and untrack.
      if (this.isProcessGoneError(message)) {
        this.untrackProcess(projectId)
        return
      }

      this.emit('error', {
        projectId,
        error: message
      } satisfies ResourceErrorEvent)
    }
  }

  /**
   * Query CPU and memory for a single PID using platform-specific commands.
   * Returns null if the process does not exist.
   */
  private async queryProcessResources(pid: number): Promise<ResourceSnapshot | null> {
    const platform = process.platform

    switch (platform) {
      case 'darwin':
      case 'linux':
        return this.queryUnix(pid)
      case 'win32':
        return this.queryWin32(pid)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * macOS/Linux: `ps -p <PID> -o %cpu=,rss=`
   *
   * Sample output:
   * ```
   *   1.2  45678
   * ```
   *
   * - %cpu is the CPU percentage (can exceed 100% on multi-core)
   * - rss is resident set size in **kilobytes**
   */
  private async queryUnix(pid: number): Promise<ResourceSnapshot | null> {
    try {
      const { stdout } = await execFileAsync('ps', [
        '-p',
        String(pid),
        '-o',
        '%cpu=,rss='
      ])

      const trimmed = stdout.trim()
      if (!trimmed) return null

      const parts = trimmed.split(/\s+/)
      if (parts.length < 2) return null

      const cpu = parseFloat(parts[0])
      const rssKb = parseInt(parts[1], 10)

      if (isNaN(cpu) || isNaN(rssKb)) return null

      // Convert KB to MB.
      const memMb = rssKb / 1024

      return {
        pid,
        cpu: Math.round(cpu * 10) / 10,
        mem: Math.round(memMb * 10) / 10,
        timestamp: Date.now()
      }
    } catch (error: unknown) {
      // ps exits with non-zero if the PID does not exist.
      if (this.isExecError(error) && error.code === 1) {
        return null
      }
      throw error
    }
  }

  /**
   * Windows: `wmic process where ProcessId=<PID> get PercentProcessorTime,WorkingSetSize /FORMAT:CSV`
   *
   * Sample CSV output:
   * ```
   * Node,PercentProcessorTime,WorkingSetSize
   * HOSTNAME,5,12345678
   * ```
   *
   * - PercentProcessorTime is the CPU percentage
   * - WorkingSetSize is in **bytes**
   *
   * Falls back to `tasklist` for memory if wmic is unavailable.
   */
  private async queryWin32(pid: number): Promise<ResourceSnapshot | null> {
    try {
      const { stdout } = await execFileAsync('wmic', [
        'process',
        'where',
        `ProcessId=${pid}`,
        'get',
        'PercentProcessorTime,WorkingSetSize',
        '/FORMAT:CSV'
      ])

      const lines = stdout.trim().split('\n').filter((l) => l.trim() !== '')
      if (lines.length < 2) return null

      // The last non-empty line contains the data.
      const dataLine = lines[lines.length - 1].trim()
      const parts = dataLine.split(',')

      // CSV format: Node,PercentProcessorTime,WorkingSetSize
      if (parts.length < 3) return null

      const cpu = parseFloat(parts[1])
      const workingSetBytes = parseInt(parts[2], 10)

      if (isNaN(cpu) || isNaN(workingSetBytes)) return null

      // Convert bytes to MB.
      const memMb = workingSetBytes / (1024 * 1024)

      return {
        pid,
        cpu: Math.round(cpu * 10) / 10,
        mem: Math.round(memMb * 10) / 10,
        timestamp: Date.now()
      }
    } catch {
      // wmic may not be available on newer Windows versions.
      // Process may not exist — return null.
      return null
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Check if an error message indicates the process no longer exists. */
  private isProcessGoneError(message: string): boolean {
    const lower = message.toLowerCase()
    return (
      lower.includes('no such process') ||
      lower.includes('not found') ||
      lower.includes('no instance') ||
      lower.includes('access is denied')
    )
  }

  /** Type-guard for child_process exec errors that carry a code property. */
  private isExecError(
    error: unknown
  ): error is Error & { code: number; stdout: string } {
    return error instanceof Error && 'code' in error
  }
}
