import { useEffect } from 'react'
import { usePortStore } from '../stores/portStore'
import { PortGrid } from '../components/ports'
import type { PortBinding } from '@shared/types'

/**
 * PortsView — Full page view for the Ports feature.
 *
 * - Fetches ports + conflicts on mount
 * - Subscribes to real-time port updates via window.api.onPortUpdate
 * - Renders the PortGrid component
 */
function PortsView(): React.JSX.Element {
  const fetchPorts = usePortStore((s) => s.fetchPorts)
  const fetchConflicts = usePortStore((s) => s.fetchConflicts)
  const setPorts = usePortStore((s) => s.setPorts)

  // Initial data fetch
  useEffect(() => {
    void fetchPorts()
    void fetchConflicts()
  }, [fetchPorts, fetchConflicts])

  // Real-time port update subscription
  useEffect(() => {
    const unsubscribe = window.api.onPortUpdate((data: unknown) => {
      const payload = data as { ports?: PortBinding[] }
      if (payload && Array.isArray(payload.ports)) {
        setPorts(payload.ports)
      }
    })
    return unsubscribe
  }, [setPorts])

  return (
    <div
      className="h-full overflow-auto"
      style={{ padding: 'var(--dd-space-6)' }}
    >
      <PortGrid />
    </div>
  )
}

export { PortsView }
