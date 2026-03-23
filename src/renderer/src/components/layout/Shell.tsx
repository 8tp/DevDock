import { useState, useMemo } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { StatsBar } from './StatsBar'
import { useProjectStore } from '../../stores/projectStore'
import { usePortStore } from '../../stores/portStore'

interface ShellProps {
  children: React.ReactNode
  currentView: string
  onViewChange: (view: string) => void
}

function Shell({ children, currentView, onViewChange }: ShellProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  const projects = useProjectStore((s) => s.projects)
  const ports = usePortStore((s) => s.ports)

  const runningCount = useMemo(
    () => projects.filter((p) => p.status === 'running').length,
    [projects]
  )
  const activePorts = ports.length

  // CPU and memory are aggregated from running projects
  const { totalCpu, totalMem } = useMemo(() => {
    let cpu = 0
    let mem = 0
    for (const p of projects) {
      if (p.status === 'running') {
        cpu += p.cpu
        mem += p.mem
      }
    }
    return { totalCpu: cpu, totalMem: mem }
  }, [projects])

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--dd-bg)' }}
    >
      <TitleBar />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentView={currentView}
          onViewChange={onViewChange}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          runningCount={runningCount}
        />

        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: 'var(--dd-bg)' }}
        >
          {children}
        </main>
      </div>

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
