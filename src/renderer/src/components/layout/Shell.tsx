import { useState } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { StatsBar } from './StatsBar'

interface ShellProps {
  children: React.ReactNode
  currentView: string
  onViewChange: (view: string) => void
}

/**
 * Shell - Root layout that composes TitleBar, Sidebar, main content, and StatsBar.
 *
 * Layout structure:
 *   TitleBar        (full width, 44px, top)
 *   Sidebar | Main  (fills remaining vertical space)
 *   StatsBar        (full width, 48px, bottom)
 */
function Shell({ children, currentView, onViewChange }: ShellProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  // TODO: Wire these to real Zustand stores when available
  const [runningCount] = useState(0)
  const [activePorts] = useState(0)
  const [totalCpu] = useState(0)
  const [totalMem] = useState(0)

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--dd-bg)' }}
    >
      {/* Title bar */}
      <TitleBar />

      {/* Middle: sidebar + main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentView={currentView}
          onViewChange={onViewChange}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          runningCount={runningCount}
        />

        {/* Main content area */}
        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: 'var(--dd-bg)' }}
        >
          {children}
        </main>
      </div>

      {/* Stats bar */}
      <StatsBar
        runningCount={runningCount}
        activePorts={activePorts}
        totalCpu={totalCpu}
        totalMem={totalMem}
      />
    </div>
  )
}

export { Shell }
export type { ShellProps }
