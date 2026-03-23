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
  valueColor?: string
}

const StatItem: React.FC<StatItemProps> = ({ dotColor, label, value, valueColor }) => (
  <div className="flex items-center gap-2">
    {dotColor && (
      <span
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, backgroundColor: dotColor }}
      />
    )}
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--dd-text-muted)',
        fontFamily: 'var(--dd-font-sans)'
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: valueColor || 'var(--dd-text-primary)',
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
          valueColor="var(--dd-status-running)"
        />
        <StatItem
          dotColor="var(--dd-accent)"
          label={activePorts === 1 ? 'port' : 'ports'}
          value={String(activePorts)}
          valueColor="var(--dd-accent)"
        />
        <StatItem
          label="CPU"
          value={`${totalCpu.toFixed(1)}%`}
          valueColor="var(--dd-status-warning)"
        />
        <StatItem
          label="Mem"
          value={`${totalMem.toFixed(0)} MB`}
          valueColor="var(--dd-syntax-keyword)"
        />
      </div>
    )
  }
)

StatsBar.displayName = 'StatsBar'

export { StatsBar }
export type { StatsBarProps }
