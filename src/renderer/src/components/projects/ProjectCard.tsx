import React, { useCallback } from 'react'
import type { Project } from '@shared/types'
import { StatusDot, Sparkline } from '../ui'

// ─── Inline SVG Icons (12x12 for compact layout) ────────────────────────────

const PlayIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 2L10 6L3 10V2Z" fill="currentColor" />
  </svg>
)

const StopIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor" />
  </svg>
)

const RestartIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M10 6A4 4 0 1 1 6 2M6 2L8 0.5M6 2L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const GlobeIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
    <ellipse cx="6" cy="6" rx="2" ry="4.5" stroke="currentColor" strokeWidth="1.1" />
    <line x1="1.5" y1="6" x2="10.5" y2="6" stroke="currentColor" strokeWidth="1.1" />
  </svg>
)

const CodeIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M4 3.5L1.5 6L4 8.5M8 3.5L10.5 6L8 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TerminalIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
    <path d="M3.5 5L5 6.2L3.5 7.5M6.5 7.5H8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M6 1L7.3 4.2L10.8 4.5L8.1 6.9L9 10.3L6 8.4L3 10.3L3.9 6.9L1.2 4.5L4.7 4.2L6 1Z"
      fill={filled ? 'var(--dd-status-warning)' : 'none'}
      stroke={filled ? 'var(--dd-status-warning)' : 'currentColor'}
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(ms: number): string {
  if (ms <= 0) return ''
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onToggleFavorite: () => void
  onSelect: () => void
  selected?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

const ProjectCard: React.FC<ProjectCardProps> = React.memo(
  ({ project, onStart, onStop, onRestart, onToggleFavorite, onSelect, selected = false }) => {
    const isRunning = project.status === 'running'
    const isStarting = project.status === 'starting'
    const canStop = isRunning || isStarting

    const handleOpenBrowser = useCallback(() => {
      if (project.port > 0) window.api.openInBrowser(`http://localhost:${project.port}`)
    }, [project.port])
    const handleOpenEditor = useCallback(() => { window.api.openInEditor(project.path) }, [project.path])
    const handleOpenTerminal = useCallback(() => { window.api.openInTerminal(project.path) }, [project.path])

    const cpuData = isRunning ? [project.cpu * 0.6, project.cpu * 0.8, project.cpu * 0.7, project.cpu * 0.9, project.cpu] : []
    const memData = isRunning ? [project.mem * 0.7, project.mem * 0.85, project.mem * 0.75, project.mem * 0.9, project.mem] : []

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
        className="dd-focus-ring dd-animate-fade-in rounded-[var(--dd-radius-md)] border transition-all cursor-pointer"
        style={{
          backgroundColor: 'var(--dd-surface-1)',
          borderColor: selected ? 'var(--dd-border-focus)' : 'var(--dd-border)',
          borderLeftWidth: 3,
          borderLeftColor: canStop ? project.color : 'var(--dd-border)',
        }}
        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--dd-surface-2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--dd-surface-1)' }}
      >
        {/* ─── Main Row: always visible, compact ─── */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          {/* Status dot */}
          <StatusDot status={project.status} size="sm" />

          {/* Name */}
          <span
            className="font-semibold truncate"
            style={{ fontSize: 13, color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)', minWidth: 0, flex: '0 1 auto' }}
          >
            {project.name}
          </span>

          {/* Framework badge */}
          <span
            className="shrink-0 uppercase"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: project.color,
              backgroundColor: `color-mix(in srgb, ${project.color} 10%, transparent)`,
              padding: '2px 6px',
              borderRadius: 'var(--dd-radius-sm)',
              fontFamily: 'var(--dd-font-mono)',
            }}
          >
            {project.framework}
          </span>

          {/* Git branch */}
          {project.git?.isRepo && (
            <span
              className="shrink-0 truncate hidden sm:inline"
              style={{
                fontSize: 11,
                color: 'var(--dd-text-muted)',
                fontFamily: 'var(--dd-font-mono)',
                maxWidth: 120,
              }}
            >
              {project.git.branch}
              {project.git.dirty > 0 && (
                <span style={{ color: 'var(--dd-status-warning)', marginLeft: 3 }}>*</span>
              )}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-2" />

          {/* Resource sparklines (only when running) */}
          {isRunning && (
            <div className="flex items-center gap-3 shrink-0 hidden md:flex">
              <div className="flex items-center gap-1">
                <Sparkline data={cpuData} color="var(--dd-accent)" width={48} height={16} />
                <span style={{ fontSize: 10, fontFamily: 'var(--dd-font-mono)', color: 'var(--dd-text-muted)' }}>
                  {project.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkline data={memData} color="var(--dd-syntax-keyword)" width={48} height={16} />
                <span style={{ fontSize: 10, fontFamily: 'var(--dd-font-mono)', color: 'var(--dd-text-muted)' }}>
                  {project.mem.toFixed(0)}M
                </span>
              </div>
            </div>
          )}

          {/* Uptime */}
          {isRunning && project.uptime > 0 && (
            <span className="shrink-0" style={{ fontSize: 10, color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-mono)' }}>
              {formatUptime(project.uptime)}
            </span>
          )}

          {/* Port */}
          {project.port > 0 && (
            <span
              className="shrink-0"
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--dd-font-mono)',
                color: isRunning ? project.color : 'var(--dd-text-muted)',
              }}
            >
              :{project.port}
            </span>
          )}

          {/* Start/Stop button */}
          {canStop ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStop() }}
              className="shrink-0 p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] cursor-pointer"
              style={{ color: 'var(--dd-status-error)' }}
              aria-label="Stop"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStart() }}
              className="shrink-0 p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] cursor-pointer"
              style={{ color: 'var(--dd-status-running)' }}
              aria-label="Start"
            >
              <PlayIcon />
            </button>
          )}
        </div>

        {/* ─── Expanded Detail (shown when selected) ─── */}
        <div className="dd-card-detail" style={selected ? { gridTemplateRows: '1fr' } : undefined}>
          <div>
            <div
              className="flex items-center gap-1 px-3 pb-2.5"
              style={{ borderTop: '1px solid var(--dd-border)' }}
            >
              {/* Path */}
              <span
                className="truncate flex-1 pt-2"
                style={{ fontSize: 11, color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-mono)' }}
                title={project.path}
              >
                {project.path}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 pt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
                  className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] cursor-pointer"
                  style={{ color: project.isFavorite ? 'var(--dd-status-warning)' : 'var(--dd-text-muted)' }}
                  aria-label="Favorite"
                >
                  <StarIcon filled={project.isFavorite} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRestart() }}
                  disabled={!canStop}
                  className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] disabled:opacity-30 cursor-pointer"
                  style={{ color: 'var(--dd-text-muted)' }}
                  aria-label="Restart"
                >
                  <RestartIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenBrowser() }}
                  disabled={project.port <= 0}
                  className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] disabled:opacity-30 cursor-pointer"
                  style={{ color: 'var(--dd-text-muted)' }}
                  aria-label="Browser"
                >
                  <GlobeIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenEditor() }}
                  className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] cursor-pointer"
                  style={{ color: 'var(--dd-text-muted)' }}
                  aria-label="Editor"
                >
                  <CodeIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenTerminal() }}
                  className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] cursor-pointer"
                  style={{ color: 'var(--dd-text-muted)' }}
                  aria-label="Terminal"
                >
                  <TerminalIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

ProjectCard.displayName = 'ProjectCard'

export default ProjectCard
