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

const sizeMap: Record<NonNullable<StatusDotProps['size']>, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3'
}

const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md' }) => {
  const color = statusColorMap[status]
  const sizeClass = sizeMap[size]

  let animationClass = ''
  if (status === 'running') {
    animationClass = 'dd-animate-pulse'
  }

  return (
    <span className="relative inline-flex items-center justify-center" aria-label={status}>
      {status === 'starting' && (
        <span
          className={`absolute ${sizeClass} rounded-[var(--dd-radius-full)]`}
          style={{
            backgroundColor: 'transparent',
            animation: 'dd-spin 1s linear infinite',
            borderTop: `2px solid ${color}`,
            borderRight: '2px solid transparent',
            borderBottom: '2px solid transparent',
            borderLeft: '2px solid transparent'
          }}
        />
      )}
      <span
        className={[
          'inline-block rounded-[var(--dd-radius-full)]',
          sizeClass,
          animationClass
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

export default StatusDot
