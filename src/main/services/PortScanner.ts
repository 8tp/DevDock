// ─── PortScanner Service ──────────────────────────────────────────────────────
// Scans TCP listening ports on the local machine using platform-specific commands.
// Emits 'update' events when the set of active ports changes.
// ──────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events'
import { execFile } from 'child_process'
import { promisify } from 'util'
import treeKill from 'tree-kill'
import type { PortBinding, PortConflict } from '@shared/types'
import { PORT_SCAN_INTERVAL } from '@shared/constants'

const execFileAsync = promisify(execFile)
const treeKillAsync = promisify(treeKill)

/**
 * PortScanner detects TCP ports in LISTEN state on the local machine.
 *
 * - Uses `lsof` on macOS, `netstat` on Windows, and `ss` on Linux.
 * - Polls every PORT_SCAN_INTERVAL (2 s) and emits 'update' only when the
 *   set of bindings has actually changed (compared by serialised snapshot).
 * - Provides conflict detection and the ability to kill a process by port.
 */
export class PortScanner extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private currentPorts: PortBinding[] = []
  private previousSnapshot: string = ''

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Begin periodic port scanning. */
  start(): void {
    if (this.timer) return

    // Run an initial scan immediately, then schedule recurring scans.
    void this.poll()
    this.timer = setInterval(() => void this.poll(), PORT_SCAN_INTERVAL)
  }

  /** Stop periodic scanning. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Run a single port scan and return the current list of bindings. */
  async scan(): Promise<PortBinding[]> {
    const platform = process.platform

    switch (platform) {
      case 'darwin':
        return this.scanDarwin()
      case 'win32':
        return this.scanWin32()
      case 'linux':
        return this.scanLinux()
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /** Return the most recently scanned ports (synchronous). */
  getPorts(): PortBinding[] {
    return this.currentPorts
  }

  /**
   * Detect port conflicts between a list of expected project ports and the
   * currently scanned bindings. A conflict is reported when two or more
   * bindings share the same port number.
   */
  findConflicts(projects: { id: string; port: number }[]): PortConflict[] {
    const portMap = new Map<number, PortBinding[]>()

    // Group current bindings by port number.
    for (const binding of this.currentPorts) {
      const existing = portMap.get(binding.port)
      if (existing) {
        existing.push(binding)
      } else {
        portMap.set(binding.port, [binding])
      }
    }

    // Also check project expectations — a project expecting a port that is
    // already occupied by a *different* process is a conflict too.
    for (const project of projects) {
      if (project.port <= 0) continue

      const bindings = portMap.get(project.port)
      if (bindings) {
        // Flag any binding that is NOT already associated with this project.
        const foreign = bindings.some((b) => b.projectId !== project.id)
        if (foreign && bindings.length === 1) {
          // Single occupant but it belongs to a different project → conflict.
          // Duplicate the entry so findConflicts sees ≥ 2 parties.
          // (The project itself is not yet running, so we create a synthetic binding.)
          const synthetic: PortBinding = {
            port: project.port,
            protocol: 'tcp',
            pid: 0,
            processName: '(expected)',
            command: '',
            projectId: project.id
          }
          bindings.push(synthetic)
        }
      }
    }

    const conflicts: PortConflict[] = []
    for (const [port, bindings] of portMap) {
      if (bindings.length > 1) {
        conflicts.push({ port, bindings })
      }
    }

    return conflicts
  }

  /**
   * Kill the process (and its whole tree) occupying `port`.
   * Returns true if a matching process was found and a kill signal sent.
   */
  async killPort(port: number): Promise<boolean> {
    const binding = this.currentPorts.find((b) => b.port === port)
    if (!binding) return false

    try {
      await treeKillAsync(binding.pid)
      // Refresh immediately so consumers get updated state.
      await this.poll()
      return true
    } catch {
      return false
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /** Perform a scan and conditionally emit 'update'. */
  private async poll(): Promise<void> {
    try {
      const ports = await this.scan()
      this.currentPorts = ports

      const snapshot = JSON.stringify(
        ports.map((p) => `${p.port}:${p.pid}:${p.processName}`).sort()
      )

      if (snapshot !== this.previousSnapshot) {
        this.previousSnapshot = snapshot
        this.emit('update', ports)
      }
    } catch (error) {
      this.emit('error', error)
    }
  }

  // ── Platform Parsers ─────────────────────────────────────────────────────

  /**
   * macOS: `lsof -iTCP -sTCP:LISTEN -P -n`
   *
   * Sample output:
   * ```
   * COMMAND   PID   USER   FD   TYPE   DEVICE SIZE/OFF NODE NAME
   * node    12345   user   22u  IPv6   0x…     0t0  TCP *:3000 (LISTEN)
   * node    12345   user   23u  IPv4   0x…     0t0  TCP 127.0.0.1:8080 (LISTEN)
   * ```
   */
  private async scanDarwin(): Promise<PortBinding[]> {
    try {
      const { stdout } = await execFileAsync('lsof', [
        '-iTCP',
        '-sTCP:LISTEN',
        '-P',
        '-n'
      ])
      return this.parseLsof(stdout)
    } catch (error: unknown) {
      // lsof exits with code 1 when no results are found.
      if (this.isExecError(error) && error.code === 1 && error.stdout === '') {
        return []
      }
      throw error
    }
  }

  /**
   * Windows: `netstat -ano` piped through `findstr LISTENING`
   *
   * Sample output:
   * ```
   *   TCP    0.0.0.0:3000       0.0.0.0:0       LISTENING       1234
   *   TCP    [::]:8080          [::]:0           LISTENING       5678
   * ```
   *
   * Note: We cannot use a shell pipe with execFile, so we run netstat and
   * filter in-process.
   */
  private async scanWin32(): Promise<PortBinding[]> {
    const { stdout } = await execFileAsync('netstat', ['-ano'])
    const processNames = await this.getWin32ProcessNames()
    return this.parseNetstat(stdout, processNames)
  }

  /**
   * Linux: `ss -tlnp`
   *
   * Sample output:
   * ```
   * State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
   * LISTEN  0       128     0.0.0.0:8080        0.0.0.0:*          users:(("node",pid=1234,fd=20))
   * ```
   */
  private async scanLinux(): Promise<PortBinding[]> {
    const { stdout } = await execFileAsync('ss', ['-tlnp'])
    return this.parseSs(stdout)
  }

  // ── Parsers ──────────────────────────────────────────────────────────────

  private parseLsof(output: string): PortBinding[] {
    const lines = output.split('\n')
    const bindings: PortBinding[] = []
    const seen = new Set<string>()

    // Skip header line.
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(/\s+/)
      if (parts.length < 9) continue

      const processName = parts[0]
      const pid = parseInt(parts[1], 10)
      const namePart = parts[parts.length - 1] // e.g. "*:3000" or "(LISTEN)"

      // The NAME field can end with "(LISTEN)" — the actual address:port is
      // the field just before it if that happens.
      let addressPort = namePart
      if (namePart === '(LISTEN)') {
        addressPort = parts[parts.length - 2]
      }

      const port = this.extractPortFromAddress(addressPort)
      if (port === null || isNaN(pid)) continue

      // Deduplicate by port+pid (lsof can report the same socket on IPv4 and IPv6).
      const key = `${port}:${pid}`
      if (seen.has(key)) continue
      seen.add(key)

      bindings.push({
        port,
        protocol: 'tcp',
        pid,
        processName,
        command: processName,
        projectId: null
      })
    }

    return bindings
  }

  private parseNetstat(
    output: string,
    processNames: Map<number, string>
  ): PortBinding[] {
    const lines = output.split('\n')
    const bindings: PortBinding[] = []
    const seen = new Set<string>()

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.includes('LISTENING')) continue

      // Expected format: TCP  0.0.0.0:3000  0.0.0.0:0  LISTENING  1234
      const parts = line.split(/\s+/)
      if (parts.length < 5) continue

      const proto = parts[0].toLowerCase()
      if (proto !== 'tcp') continue

      const localAddress = parts[1]
      const pid = parseInt(parts[parts.length - 1], 10)
      if (isNaN(pid)) continue

      const port = this.extractPortFromAddress(localAddress)
      if (port === null) continue

      const key = `${port}:${pid}`
      if (seen.has(key)) continue
      seen.add(key)

      const name = processNames.get(pid) ?? 'unknown'

      bindings.push({
        port,
        protocol: 'tcp',
        pid,
        processName: name,
        command: name,
        projectId: null
      })
    }

    return bindings
  }

  private parseSs(output: string): PortBinding[] {
    const lines = output.split('\n')
    const bindings: PortBinding[] = []
    const seen = new Set<string>()

    // Skip header line.
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(/\s+/)
      if (parts.length < 5) continue

      // Local Address:Port is typically the 4th column (index 3).
      const localAddress = parts[3]
      const port = this.extractPortFromAddress(localAddress)
      if (port === null) continue

      // Parse the "users:" section for process info.
      // Format: users:(("node",pid=1234,fd=20))
      let pid = 0
      let processName = 'unknown'

      const usersMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/)
      if (usersMatch) {
        processName = usersMatch[1]
        pid = parseInt(usersMatch[2], 10)
      }

      const key = `${port}:${pid}`
      if (seen.has(key)) continue
      seen.add(key)

      bindings.push({
        port,
        protocol: 'tcp',
        pid,
        processName,
        command: processName,
        projectId: null
      })
    }

    return bindings
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Extract the port number from strings like:
   * - `*:3000`
   * - `127.0.0.1:8080`
   * - `0.0.0.0:3000`
   * - `[::]:8080`
   * - `[::1]:3000`
   */
  private extractPortFromAddress(address: string): number | null {
    if (!address) return null

    // Handle IPv6 bracket notation: [::]:8080 or [::1]:3000
    const ipv6Match = address.match(/\]:(\d+)$/)
    if (ipv6Match) {
      return parseInt(ipv6Match[1], 10)
    }

    // Handle standard host:port or *:port
    const lastColon = address.lastIndexOf(':')
    if (lastColon === -1) return null

    const portStr = address.substring(lastColon + 1)
    const port = parseInt(portStr, 10)
    return isNaN(port) ? null : port
  }

  /**
   * On Windows, netstat only gives PIDs. We use `tasklist` to build a
   * PID → process-name lookup table.
   */
  private async getWin32ProcessNames(): Promise<Map<number, string>> {
    const map = new Map<number, string>()

    try {
      const { stdout } = await execFileAsync('tasklist', ['/FO', 'CSV', '/NH'])

      for (const line of stdout.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
        const match = trimmed.match(/^"([^"]+)","(\d+)"/)
        if (match) {
          const name = match[1]
          const pid = parseInt(match[2], 10)
          if (!isNaN(pid)) {
            map.set(pid, name)
          }
        }
      }
    } catch {
      // tasklist may not be available; fall back to empty map.
    }

    return map
  }

  /** Type-guard for child_process exec errors that carry stdout/code. */
  private isExecError(
    error: unknown
  ): error is Error & { code: number; stdout: string } {
    return error instanceof Error && 'code' in error && 'stdout' in error
  }
}
