import React, { useCallback } from 'react'
import type { LogLevel } from '@shared/types'
import { useLogStore } from '../../stores/logStore'

/** SVG search icon (16x16) */
const SearchIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

/** SVG trash / clear icon (16x16) */
const TrashIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

/** SVG download / export icon (16x16) */
const DownloadIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

/** SVG auto-scroll / arrow-down-circle icon (16x16) */
const AutoScrollIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 12 16 16 12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </svg>
)

/** Level filter buttons */
const levels: Array<{ label: string; value: LogLevel | null }> = [
  { label: 'ALL', value: null },
  { label: 'INFO', value: 'info' },
  { label: 'WARN', value: 'warn' },
  { label: 'ERROR', value: 'error' },
  { label: 'DEBUG', value: 'debug' }
]

/** Level-to-color mapping for the active state */
const levelActiveColors: Record<string, string> = {
  ALL: 'var(--dd-accent)',
  INFO: 'var(--dd-accent)',
  WARN: 'var(--dd-status-warning)',
  ERROR: 'var(--dd-status-error)',
  DEBUG: 'var(--dd-text-muted)'
}

const LogFilter: React.FC = () => {
  const filterLevel = useLogStore((s) => s.filterLevel)
  const searchQuery = useLogStore((s) => s.searchQuery)
  const autoScroll = useLogStore((s) => s.autoScroll)
  const setFilterLevel = useLogStore((s) => s.setFilterLevel)
  const setSearchQuery = useLogStore((s) => s.setSearchQuery)
  const setAutoScroll = useLogStore((s) => s.setAutoScroll)
  const clearLogs = useLogStore((s) => s.clearLogs)

  const handleExport = useCallback(async () => {
    try {
      await window.api.exportLogs({ format: 'log' })
    } catch {
      // Export may fail silently
    }
  }, [])

  const handleClear = useCallback(async () => {
    await clearLogs()
  }, [clearLogs])

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
      style={{
        backgroundColor: 'var(--dd-surface-0)',
        borderBottom: '1px solid var(--dd-border)'
      }}
    >
      {/* Level filter toggle group */}
      <div
        className="flex items-center rounded-[var(--dd-radius-md)] overflow-hidden"
        style={{ backgroundColor: 'var(--dd-surface-2)' }}
      >
        {levels.map(({ label, value }) => {
          const isActive =
            (value === null && filterLevel === null) || filterLevel === value
          const activeColor = levelActiveColors[label]

          return (
            <button
              key={label}
              onClick={() => setFilterLevel(value)}
              className="px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--dd-duration-fast)] cursor-pointer"
              style={{
                fontFamily: 'var(--dd-font-mono)',
                backgroundColor: isActive
                  ? `color-mix(in srgb, ${activeColor} 20%, transparent)`
                  : 'transparent',
                color: isActive ? activeColor : 'var(--dd-text-muted)'
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Search input */}
      <div className="relative flex items-center flex-1 max-w-xs">
        <span
          className="absolute left-2.5 flex items-center pointer-events-none"
          style={{ color: 'var(--dd-text-muted)' }}
        >
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-full text-xs rounded-[var(--dd-radius-md)] border outline-none pl-8 pr-3 py-1.5 transition-colors duration-[var(--dd-duration-fast)] placeholder:text-[var(--dd-text-muted)] dd-focus-ring"
          style={{
            backgroundColor: 'var(--dd-surface-2)',
            borderColor: 'var(--dd-border)',
            color: 'var(--dd-text-primary)',
            fontFamily: 'var(--dd-font-mono)'
          }}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auto-scroll toggle */}
      <button
        onClick={() => setAutoScroll(!autoScroll)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--dd-radius-md)] transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:bg-[var(--dd-surface-2)]"
        style={{
          color: autoScroll ? 'var(--dd-accent)' : 'var(--dd-text-muted)'
        }}
        title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
      >
        <AutoScrollIcon />
        <span style={{ fontFamily: 'var(--dd-font-mono)' }}>Auto</span>
      </button>

      {/* Clear button */}
      <button
        onClick={handleClear}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--dd-radius-md)] transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:bg-[var(--dd-surface-2)]"
        style={{ color: 'var(--dd-text-muted)' }}
        title="Clear logs"
      >
        <TrashIcon />
      </button>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--dd-radius-md)] transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:bg-[var(--dd-surface-2)]"
        style={{ color: 'var(--dd-text-muted)' }}
        title="Export logs"
      >
        <DownloadIcon />
      </button>
    </div>
  )
}

LogFilter.displayName = 'LogFilter'

export { LogFilter }
