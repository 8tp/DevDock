import React, { useCallback, useState } from 'react'
import type { LogEntry, LogLevel } from '@shared/types'

interface LogLineProps {
  entry: LogEntry
  projectColor?: string
}

/** Level-to-color mapping using design tokens */
const levelColors: Record<LogLevel, string> = {
  info: 'var(--dd-accent)',
  warn: 'var(--dd-status-warning)',
  error: 'var(--dd-status-error)',
  debug: 'var(--dd-text-muted)'
}

/** Level badge labels */
const levelLabels: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR',
  debug: 'DBG'
}

/** Format a timestamp into HH:MM:SS.mmm */
function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

/** Copy icon (clipboard outline) — 14x14 inline SVG */
const CopyIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

/** Check icon — shown briefly after copy */
const CheckIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const LogLine: React.FC<LogLineProps> = React.memo(({ entry, projectColor }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entry.message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard write may fail in some contexts; silently ignore
    }
  }, [entry.message])

  const levelColor = levelColors[entry.level]

  return (
    <div
      className="group flex items-start gap-2 px-3 py-0.5 hover:bg-[var(--dd-surface-2)] transition-colors duration-[var(--dd-duration-fast)] cursor-default"
      style={{ minHeight: 24 }}
    >
      {/* Project color gutter bar */}
      <div
        className="flex-shrink-0 self-stretch rounded-[var(--dd-radius-full)]"
        style={{
          width: 3,
          backgroundColor: projectColor || 'var(--dd-text-muted)'
        }}
      />

      {/* Timestamp */}
      <span
        className="flex-shrink-0 text-xs leading-6"
        style={{
          width: 80,
          color: 'var(--dd-text-muted)',
          fontFamily: 'var(--dd-font-mono)'
        }}
      >
        {formatTimestamp(entry.timestamp)}
      </span>

      {/* Level badge */}
      <span
        className="flex-shrink-0 inline-flex items-center justify-center text-[10px] font-semibold leading-none rounded-[var(--dd-radius-sm)] px-1.5 py-0.5"
        style={{
          minWidth: 36,
          backgroundColor: `color-mix(in srgb, ${levelColor} 15%, transparent)`,
          color: levelColor,
          fontFamily: 'var(--dd-font-mono)'
        }}
      >
        {levelLabels[entry.level]}
      </span>

      {/* Message */}
      <span
        className="flex-1 text-sm leading-6 whitespace-pre-wrap break-all"
        style={{
          color: entry.level === 'error' ? 'var(--dd-status-error)' : 'var(--dd-text-primary)',
          fontFamily: 'var(--dd-font-mono)'
        }}
      >
        {entry.message}
      </span>

      {/* Copy button — visible on hover */}
      <button
        onClick={handleCopy}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--dd-duration-fast)] p-0.5 rounded-[var(--dd-radius-sm)] hover:bg-[var(--dd-surface-3)] cursor-pointer"
        style={{ color: copied ? 'var(--dd-status-running)' : 'var(--dd-text-muted)' }}
        title="Copy log line"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
})

LogLine.displayName = 'LogLine'

export { LogLine }
export type { LogLineProps }
