import React from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  runningCount: number
}

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

// ─── Icon Components (inline SVG, 20x20) ────────────────────────────────────

const FolderIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const GlobeIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const ListIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

const LayersIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const GearIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const CollapseIcon: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: `transform var(--dd-duration-normal) var(--dd-ease-out)`
    }}
  >
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
)

// ─── Nav Item Definitions ────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: <FolderIcon /> },
  { id: 'ports', label: 'Ports', icon: <GlobeIcon /> },
  { id: 'logs', label: 'Logs', icon: <ListIcon /> },
  { id: 'stacks', label: 'Stacks', icon: <LayersIcon /> },
  { id: 'settings', label: 'Settings', icon: <GearIcon /> }
]

// ─── Component ───────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ currentView, onViewChange, collapsed, onToggleCollapse, runningCount }) => {
    return (
      <nav
        className="dd-no-select flex flex-col shrink-0 h-full"
        style={{
          width: collapsed ? 52 : 220,
          backgroundColor: 'var(--dd-surface-0)',
          borderRight: '1px solid var(--dd-border)',
          transition: `width var(--dd-duration-slow) var(--dd-ease-out)`,
          overflow: 'hidden'
        }}
      >
        {/* Navigation Items */}
        <div className="flex flex-col gap-1 flex-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id
            const showBadge = item.id === 'projects' && runningCount > 0

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className="dd-focus-ring dd-no-drag flex items-center cursor-pointer"
                style={{
                  height: 36,
                  gap: collapsed ? 0 : 12,
                  paddingLeft: collapsed ? 0 : 12,
                  paddingRight: collapsed ? 0 : 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--dd-radius-md)',
                  backgroundColor: isActive
                    ? 'var(--dd-surface-2)'
                    : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: collapsed
                    ? 'none'
                    : isActive ? '3px solid var(--dd-accent)' : '3px solid transparent',
                  color: isActive ? 'var(--dd-text-primary)' : 'var(--dd-text-muted)',
                  transition: `background-color var(--dd-duration-fast) var(--dd-ease-out), color var(--dd-duration-fast) var(--dd-ease-out), border-left-color var(--dd-duration-fast) var(--dd-ease-out)`,
                  outline: 'none',
                  fontFamily: 'var(--dd-font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  width: '100%',
                  whiteSpace: 'nowrap'
                }}
                title={collapsed ? item.label : undefined}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--dd-surface-1)'
                    e.currentTarget.style.color = 'var(--dd-text-secondary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--dd-text-muted)'
                  }
                }}
              >
                {/* Icon */}
                <span className="shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
                  {item.icon}
                </span>

                {/* Label + Badge (hidden when collapsed) */}
                {!collapsed && (
                  <>
                    <span className="truncate" style={{ flex: 1, textAlign: 'left' }}>
                      {item.label}
                    </span>
                    {showBadge && (
                      <span
                        className="flex items-center justify-center font-mono font-medium shrink-0"
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 'var(--dd-radius-full)',
                          backgroundColor: 'color-mix(in srgb, var(--dd-status-running) 20%, transparent)',
                          color: 'var(--dd-status-running)',
                          fontSize: 11,
                          paddingLeft: 5,
                          paddingRight: 5,
                        }}
                      >
                        {runningCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Collapse Toggle (bottom) */}
        <div className="px-2 pb-3">
          <button
            onClick={onToggleCollapse}
            className="dd-focus-ring dd-no-drag flex items-center justify-center cursor-pointer"
            style={{
              width: '100%',
              height: 36,
              borderRadius: 'var(--dd-radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--dd-text-muted)',
              border: 'none',
              outline: 'none',
              transition: `color var(--dd-duration-fast) var(--dd-ease-out), background-color var(--dd-duration-fast) var(--dd-ease-out)`
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--dd-surface-2)'
              e.currentTarget.style.color = 'var(--dd-text-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--dd-text-muted)'
            }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>
      </nav>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export { Sidebar }
export type { SidebarProps }
