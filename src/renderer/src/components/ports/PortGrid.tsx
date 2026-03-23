import React from 'react'
import { usePortStore } from '../../stores/portStore'
import { PortTile } from './PortTile'
import { PortDetail } from './PortDetail'
import Badge from '../ui/Badge'

/**
 * PortGrid — Responsive grid of PortTile components with a detail panel.
 *
 * Reads port data directly from portStore (no props needed).
 * Shows a header with title + port count, a flex-wrap grid of tiles,
 * and a PortDetail panel when a tile is selected.
 */
const PortGrid: React.FC = () => {
  const ports = usePortStore((s) => s.ports)
  const conflicts = usePortStore((s) => s.conflicts)
  const selectedPort = usePortStore((s) => s.selectedPort)
  const setSelectedPort = usePortStore((s) => s.setSelectedPort)
  const killPort = usePortStore((s) => s.killPort)
  const loading = usePortStore((s) => s.loading)

  // Build a set of conflicted port numbers for quick lookup
  const conflictPorts = React.useMemo(() => {
    const set = new Set<number>()
    for (const c of conflicts) {
      set.add(c.port)
    }
    return set
  }, [conflicts])

  // Find the selected binding
  const selectedBinding = React.useMemo(
    () => ports.find((p) => p.port === selectedPort) ?? null,
    [ports, selectedPort]
  )

  const handleTileClick = (port: number): void => {
    setSelectedPort(selectedPort === port ? null : port)
  }

  const handleKill = async (): Promise<void> => {
    if (selectedPort !== null) {
      await killPort(selectedPort)
      setSelectedPort(null)
    }
  }

  const handleCloseDetail = (): void => {
    setSelectedPort(null)
  }

  // Empty state
  if (!loading && ports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span
          className="text-lg font-medium"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          No ports detected
        </span>
        <span
          className="text-sm"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Start a project or service to see active ports here.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Port Map
        </h2>
        <Badge variant="count">{ports.length}</Badge>
        {conflicts.length > 0 && (
          <Badge variant="status" color="var(--dd-status-error)">
            {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}
          </Badge>
        )}
        {loading && (
          <span
            className="text-xs"
            style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
          >
            Scanning...
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="flex flex-wrap gap-2">
        {ports.map((binding) => (
          <PortTile
            key={`${binding.protocol}-${binding.port}`}
            binding={binding}
            isConflict={conflictPorts.has(binding.port)}
            isManaged={binding.projectId !== null}
            selected={selectedPort === binding.port}
            onClick={() => handleTileClick(binding.port)}
          />
        ))}
      </div>

      {/* Detail panel for selected port */}
      {selectedBinding && (
        <PortDetail
          binding={selectedBinding}
          onKill={handleKill}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}

PortGrid.displayName = 'PortGrid'

export { PortGrid }
