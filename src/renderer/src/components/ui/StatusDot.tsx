import React from 'react'

interface StatusDotProps {
  status: 'running' | 'stopped' | 'starting' | 'error'
  size?: 'sm' | 'md'
}

const statusColorMap: Record<StatusDotProps['status'], string> = {
  running: 'var(--dd-status-running)',
  stopped: 'var(--dd-status-stopped)',
  starting: 'var(--dd-status-warning)',
  error: 'var(--dd-status-error)'
}

const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md' }) => {
  const color = statusColorMap[status]
  const dotSize = size === 'sm' ? 7 : 9

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: dotSize + 4, height: dotSize + 4 }}
      aria-label={status}
    >
      {status === 'running' && (
        <span
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            animation: 'dd-pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        />
      )}
      {status === 'starting' && (
        <span
          className="absolute rounded-full"
          style={{
            width: dotSize + 2,
            height: dotSize + 2,
            borderTop: `2px solid ${color}`,
            borderRight: '2px solid transparent',
            borderBottom: '2px solid transparent',
            borderLeft: '2px solid transparent',
            animation: 'dd-spin 1s linear infinite'
          }}
        />
      )}
      <span
        className="relative rounded-full"
        style={{ width: dotSize, height: dotSize, backgroundColor: color }}
      />
    </span>
  )
}

export default StatusDot
