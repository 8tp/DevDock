import { useEffect } from 'react'
import type { LogEntry } from '@shared/types'
import { useLogStore } from '../stores/logStore'
import { useProjectStore } from '../stores/projectStore'
import { LogFilter } from '../components/logs/LogFilter'
import { LogStream } from '../components/logs/LogStream'

const LogsView: React.FC = () => {
  const fetchLogs = useLogStore((s) => s.fetchLogs)
  const addEntry = useLogStore((s) => s.addEntry)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)

  /** Fetch initial log data and project list on mount */
  useEffect(() => {
    fetchLogs()
    fetchProjects()
  }, [fetchLogs, fetchProjects])

  /** Subscribe to real-time log streaming from the main process */
  useEffect(() => {
    const unsubscribe = window.api.onLogLine((data: unknown) => {
      const entry = data as LogEntry
      addEntry(entry)
    })

    return () => {
      unsubscribe()
    }
  }, [addEntry])

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: 'var(--dd-font-sans)' }}
    >
      {/* Header with filter controls */}
      <LogFilter />

      {/* Main log stream area — fills remaining space */}
      <LogStream />
    </div>
  )
}

LogsView.displayName = 'LogsView'

export { LogsView }
export default LogsView
