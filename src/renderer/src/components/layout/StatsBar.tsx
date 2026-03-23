import React from 'react'

interface StatsBarProps {
  runningCount: number
  activePorts: number
  totalCpu: number
  totalMem: number
}

// ─── Stat Item (internal) ────────────────────────────────────────────────────

interface StatItemProps {
  dotColor?: string
  label: string
  value: string
}

const StatItem: React.FC<StatItemProps> = ({ dotColor, label, value }) => (
  <div className="flex items-center gap-2">
    {dotColor && (
      <span
        className="shrink-0"
        style={{
          width: 6,
          height: 6,
          borderRadius: 'var(--dd-radius-full)',
          backgroundColor: dotColor
        }}
      />
    )}
    <span style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}>
      {label}
    </span>
    <span
      style={{
        color: 'var(--dd-text-primary)',
        fontFamily: 'var(--dd-font-mono)'
      }}
    >
      {value}
    </span>
  </div>
)

// ─── StatsBar ────────────────────────────────────────────────────────────────

const StatsBar: React.FC<StatsBarProps> = React.memo(
  ({ runningCount, activePorts, totalCpu, totalMem }) => {
    return (
      <div
        className="dd-no-select flex items-center gap-6 px-4 shrink-0"
        style={{
          height: 48,
          backgroundColor: 'var(--dd-surface-0)',
          borderTop: '1px solid var(--dd-border)',
          fontSize: 12
        }}
      >
        <StatItem
          dotColor={runningCount > 0 ? 'var(--dd-status-running)' : 'var(--dd-status-stopped)'}
          label={runningCount === 1 ? 'running' : 'running'}
          value={String(runningCount)}
        />
        <StatItem
          dotColor="var(--dd-accent)"
          label={activePorts === 1 ? 'port' : 'ports'}
          value={String(activePorts)}
        />
        <StatItem
          label="CPU"
          value={`${totalCpu.toFixed(1)}%`}
        />
        <StatItem
          label="Mem"
          value={`${totalMem.toFixed(0)} MB`}
        />
      </div>
    )
  }
)

StatsBar.displayName = 'StatsBar'

export { StatsBar }
export type { StatsBarProps }
