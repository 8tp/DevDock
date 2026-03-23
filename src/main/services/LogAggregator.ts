// ─── LogAggregator Service ────────────────────────────────────────────────
// Captures and aggregates logs from all managed processes.
// Based on PRD Section 6.4 — Unified Log Viewer.

import { EventEmitter } from 'events'
import type { LogEntry, LogLevel } from '../../shared/types'
import { MAX_LOG_LINES } from '../../shared/constants'

/** Options for filtering log queries */
interface GetLinesOptions {
  projectId?: string
  level?: LogLevel
  search?: string
  limit?: number
}

/** Options for exporting logs */
interface ExportOptions {
  projectId?: string
  format: 'log' | 'json'
}

/** Regex patterns for detecting log levels (case insensitive) */
const LEVEL_PATTERNS: Array<{ level: LogLevel; pattern: RegExp }> = [
  { level: 'error', pattern: /\bERROR\b/i },
  { level: 'warn', pattern: /\b(?:WARN|WARNING)\b/i },
  { level: 'debug', pattern: /\bDEBUG\b/i },
  { level: 'info', pattern: /\bINFO\b/i }
]

export class LogAggregator extends EventEmitter {
  private buffers: Map<string, LogEntry[]> = new Map()
  private maxLines: number
  private idCounter: number = 0

  constructor(maxLines?: number) {
    super()
    this.maxLines = maxLines ?? MAX_LOG_LINES
  }

  /**
   * Ingest raw process output. Data may contain multiple newline-delimited lines.
   * Each line is parsed for log level, wrapped in a LogEntry, stored in the
   * project's circular buffer, and emitted as a 'line' event.
   */
  addLine(projectId: string, data: string, source: 'stdout' | 'stderr'): void {
    const lines = data.split(/\r?\n/)

    for (const raw of lines) {
      // Skip empty trailing lines from the split
      if (raw.length === 0) continue

      const id = `${Date.now()}-${this.idCounter++}`
      const level = this.detectLevel(raw, source)
      const entry: LogEntry = {
        id,
        projectId,
        timestamp: Date.now(),
        level,
        message: raw,
        source
      }

      // Get or create the project buffer
      let buffer = this.buffers.get(projectId)
      if (!buffer) {
        buffer = []
        this.buffers.set(projectId, buffer)
      }

      // Circular buffer: drop the oldest entry when at capacity
      if (buffer.length >= this.maxLines) {
        buffer.shift()
      }

      buffer.push(entry)

      this.emit('line', entry)
    }
  }

  /**
   * Query stored log entries with optional filtering.
   *
   * - `projectId` — restrict to a single project's buffer
   * - `level`     — keep only entries matching this severity
   * - `search`    — case-insensitive substring match; prefix with `/` for regex
   * - `limit`     — return only the most recent N entries (applied last)
   *
   * Results are always sorted ascending by timestamp.
   */
  getLines(options: GetLinesOptions = {}): LogEntry[] {
    const { projectId, level, search, limit } = options

    // Collect entries from the relevant buffers
    let entries: LogEntry[]
    if (projectId !== undefined) {
      entries = [...(this.buffers.get(projectId) ?? [])]
    } else {
      entries = []
      for (const buffer of this.buffers.values()) {
        entries.push(...buffer)
      }
    }

    // Filter by level
    if (level !== undefined) {
      entries = entries.filter((e) => e.level === level)
    }

    // Filter by search term (plain substring or regex)
    if (search !== undefined && search.length > 0) {
      if (search.startsWith('/')) {
        // Treat as regex — strip leading slash and optional trailing slash
        const raw = search.endsWith('/') ? search.slice(1, -1) : search.slice(1)
        try {
          const re = new RegExp(raw, 'i')
          entries = entries.filter((e) => re.test(e.message))
        } catch {
          // If the regex is invalid, fall back to literal substring match
          const lower = search.toLowerCase()
          entries = entries.filter((e) => e.message.toLowerCase().includes(lower))
        }
      } else {
        const lower = search.toLowerCase()
        entries = entries.filter((e) => e.message.toLowerCase().includes(lower))
      }
    }

    // Sort by timestamp (ascending)
    entries.sort((a, b) => a.timestamp - b.timestamp)

    // Apply limit (most recent N)
    if (limit !== undefined && limit > 0 && entries.length > limit) {
      entries = entries.slice(-limit)
    }

    return entries
  }

  /**
   * Clear stored log entries.
   * If `projectId` is provided, only that buffer is cleared; otherwise all buffers.
   */
  clear(projectId?: string): void {
    if (projectId !== undefined) {
      this.buffers.delete(projectId)
    } else {
      this.buffers.clear()
    }
  }

  /**
   * Export log entries as a formatted string.
   *
   * - `'log'`  — one line per entry: `[ISO timestamp] [LEVEL] message`
   * - `'json'` — pretty-printed JSON array of LogEntry objects
   */
  export(options: ExportOptions): string {
    const lines = this.getLines({ projectId: options.projectId })

    if (options.format === 'json') {
      return JSON.stringify(lines, null, 2)
    }

    // Plain text log format
    return lines
      .map((entry) => {
        const ts = new Date(entry.timestamp).toISOString()
        const lvl = entry.level.toUpperCase().padEnd(5)
        return `[${ts}] [${lvl}] ${entry.message}`
      })
      .join('\n')
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Detect log level by scanning the message for well-known keywords.
   * Falls back to 'info' for stdout and 'error' for stderr.
   */
  private detectLevel(message: string, source: 'stdout' | 'stderr'): LogLevel {
    for (const { level, pattern } of LEVEL_PATTERNS) {
      if (pattern.test(message)) {
        return level
      }
    }
    return source === 'stderr' ? 'error' : 'info'
  }
}
