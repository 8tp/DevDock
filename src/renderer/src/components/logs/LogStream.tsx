import React, { useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLogStore } from '../../stores/logStore'
import { LogLine } from './LogLine'
import { useProjectStore } from '../../stores/projectStore'

/** SVG chevron-down icon for scroll-to-bottom button */
const ChevronDownIcon: React.FC = () => (
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
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const LogStream: React.FC = () => {
  const entries = useLogStore((s) => s.entries)
  const filterProjectIds = useLogStore((s) => s.filterProjectIds)
  const filterLevel = useLogStore((s) => s.filterLevel)
  const searchQuery = useLogStore((s) => s.searchQuery)
  const autoScroll = useLogStore((s) => s.autoScroll)
  const setAutoScroll = useLogStore((s) => s.setAutoScroll)
  const projects = useProjectStore((s) => s.projects)

  // Compute filtered entries in the component with useMemo instead of
  // calling getFilteredEntries() inside a Zustand selector (which returns
  // a new array ref every render and causes infinite re-renders).
  const filteredEntries = React.useMemo(() => {
    const arr = entries ?? []
    const query = searchQuery.toLowerCase().trim()
    return arr.filter((entry) => {
      if (filterProjectIds.size > 0 && !filterProjectIds.has(entry.projectId)) return false
      if (filterLevel !== null && entry.level !== filterLevel) return false
      if (query && !entry.message.toLowerCase().includes(query)) return false
      return true
    })
  }, [entries, filterProjectIds, filterLevel, searchQuery])

  /** Map project IDs to their assigned colors for the gutter bar */
  const projectColorMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of projects) {
      map[p.id] = p.color
    }
    return map
  }, [projects])

  const parentRef = useRef<HTMLDivElement>(null)
  const isUserScrolling = useRef(false)

  const rowVirtualizer = useVirtualizer({
    count: filteredEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 30
  })

  /** Scroll to the bottom of the list */
  const scrollToBottom = useCallback(() => {
    if (filteredEntries.length > 0) {
      rowVirtualizer.scrollToIndex(filteredEntries.length - 1, { align: 'end' })
    }
  }, [filteredEntries.length, rowVirtualizer])

  /** Auto-scroll when new entries arrive */
  useEffect(() => {
    if (autoScroll && !isUserScrolling.current) {
      scrollToBottom()
    }
  }, [filteredEntries.length, autoScroll, scrollToBottom])

  /** Detect user scrolling to disable auto-scroll when scrolling up */
  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    let lastScrollTop = el.scrollTop

    const handleScroll = (): void => {
      const currentScrollTop = el.scrollTop
      const maxScrollTop = el.scrollHeight - el.clientHeight

      // User scrolled up — disable auto-scroll
      if (currentScrollTop < lastScrollTop && currentScrollTop < maxScrollTop - 50) {
        isUserScrolling.current = true
        setAutoScroll(false)
      }

      // User is at the bottom — re-enable auto-scroll
      if (currentScrollTop >= maxScrollTop - 10) {
        isUserScrolling.current = false
        if (!autoScroll) {
          setAutoScroll(true)
        }
      }

      lastScrollTop = currentScrollTop
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [autoScroll, setAutoScroll])

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Scrollable container */}
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ backgroundColor: 'var(--dd-bg)' }}
      >
        {filteredEntries.length === 0 ? (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'var(--dd-text-muted)' }}
          >
            <div className="text-center">
              <p className="text-sm" style={{ fontFamily: 'var(--dd-font-mono)' }}>
                No log entries
              </p>
              <p className="text-xs mt-1">
                Logs will appear here when services are running.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualItems.map((virtualRow) => {
              const entry = filteredEntries[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <LogLine
                    entry={entry}
                    projectColor={projectColorMap[entry.projectId]}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom floating button — shown when auto-scroll is off */}
      {!autoScroll && filteredEntries.length > 0 && (
        <button
          onClick={() => {
            isUserScrolling.current = false
            setAutoScroll(true)
            scrollToBottom()
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--dd-radius-full)] shadow-[var(--dd-shadow-md)] transition-all duration-[var(--dd-duration-normal)] cursor-pointer hover:brightness-110"
          style={{
            backgroundColor: 'var(--dd-accent)',
            color: 'var(--dd-text-inverse)',
            fontFamily: 'var(--dd-font-mono)'
          }}
          title="Scroll to bottom"
        >
          <ChevronDownIcon />
          Scroll to bottom
        </button>
      )}
    </div>
  )
}

LogStream.displayName = 'LogStream'

export { LogStream }
