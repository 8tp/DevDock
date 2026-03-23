import React, { useCallback } from 'react'
import type { Project } from '@shared/types'
import { Badge, StatusDot, Sparkline, Tooltip } from '../ui'

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const PlayIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3.5 2.5L11 7L3.5 11.5V2.5Z" fill="currentColor" />
  </svg>
)

const StopIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
  </svg>
)

const RestartIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M11.5 7A4.5 4.5 0 1 1 7 2.5M7 2.5L9 1M7 2.5L9 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const GlobeIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="7" cy="7" rx="2.5" ry="5" stroke="currentColor" strokeWidth="1.3" />
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

const CodeIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M4.5 4L1.5 7L4.5 10M9.5 4L12.5 7L9.5 10"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TerminalIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M4 6L6 7.5L4 9M7.5 9H10"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const StarOutlineIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5L9.8 5.8L14.5 6.2L10.9 9.4L12 14L8 11.5L4 14L5.1 9.4L1.5 6.2L6.2 5.8L8 1.5Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
)

const StarFilledIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5L9.8 5.8L14.5 6.2L10.9 9.4L12 14L8 11.5L4 14L5.1 9.4L1.5 6.2L6.2 5.8L8 1.5Z"
      fill="var(--dd-status-warning)"
      stroke="var(--dd-status-warning)"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(ms: number): string {
  if (ms <= 0) return ''
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatMemory(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
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
      if (project.port > 0) {
        window.api.openInBrowser(`http://localhost:${project.port}`)
      }
    }, [project.port])

    const handleOpenEditor = useCallback(() => {
      window.api.openInEditor(project.path)
    }, [project.path])

    const handleOpenTerminal = useCallback(() => {
      window.api.openInTerminal(project.path)
    }, [project.path])

    // Placeholder sparkline data — in a real implementation this would come from
    // resource history stored in the project store or fetched separately.
    const cpuHistory = isRunning ? [project.cpu * 0.6, project.cpu * 0.8, project.cpu * 0.7, project.cpu * 0.9, project.cpu] : []
    const memHistory = isRunning ? [project.mem * 0.7, project.mem * 0.85, project.mem * 0.75, project.mem * 0.9, project.mem] : []

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
        className={[
          'relative flex flex-col gap-3 p-4 rounded-[var(--dd-radius-lg)]',
          'border transition-all cursor-pointer',
          'dd-focus-ring dd-animate-fade-in'
        ].join(' ')}
        style={{
          backgroundColor: 'var(--dd-surface-1)',
          borderColor: selected ? 'var(--dd-border-focus)' : 'var(--dd-border)',
          borderLeftWidth: '4px',
          borderLeftColor: project.color
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            e.currentTarget.style.backgroundColor = 'var(--dd-surface-2)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--dd-surface-1)'
        }}
      >
        {/* Top Row: Framework badge + Favorite star */}
        <div className="flex items-center justify-between">
          <Badge variant="framework">{project.framework}</Badge>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            className="p-1 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring cursor-pointer"
            style={{ color: project.isFavorite ? 'var(--dd-status-warning)' : 'var(--dd-text-muted)' }}
            aria-label={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {project.isFavorite ? <StarFilledIcon /> : <StarOutlineIcon />}
          </button>
        </div>

        {/* Project Name */}
        <div
          className="text-sm font-bold truncate"
          style={{ color: 'var(--dd-text-primary)' }}
        >
          {project.name}
        </div>

        {/* Path */}
        <div
          className="text-xs font-mono truncate"
          style={{ color: 'var(--dd-text-muted)' }}
          title={project.path}
        >
          {project.path}
        </div>

        {/* Git Info Row */}
        {project.git?.isRepo && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="status" color="var(--dd-syntax-keyword)">
              {project.git.branch}
            </Badge>
            {project.git.ahead > 0 && (
              <span className="text-xs font-mono" style={{ color: 'var(--dd-status-running)' }}>
                +{project.git.ahead}
              </span>
            )}
            {project.git.behind > 0 && (
              <span className="text-xs font-mono" style={{ color: 'var(--dd-status-error)' }}>
                -{project.git.behind}
              </span>
            )}
            {project.git.dirty > 0 && (
              <span
                className="inline-flex items-center justify-center w-2 h-2 rounded-[var(--dd-radius-full)]"
                style={{ backgroundColor: 'var(--dd-status-warning)' }}
                title={`${project.git.dirty} uncommitted change${project.git.dirty > 1 ? 's' : ''}`}
              />
            )}
          </div>
        )}

        {/* Port + Status Row */}
        <div className="flex items-center gap-2">
          <StatusDot status={project.status} size="sm" />
          {project.port > 0 && (
            <span className="text-xs font-mono" style={{ color: 'var(--dd-text-secondary)' }}>
              :{project.port}
            </span>
          )}
          {isRunning && project.uptime > 0 && (
            <span className="text-xs" style={{ color: 'var(--dd-text-muted)' }}>
              {formatUptime(project.uptime)}
            </span>
          )}
        </div>

        {/* Resource Row (only when running) */}
        {isRunning && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Sparkline data={cpuHistory} color="var(--dd-accent)" width={60} height={20} />
              <span className="text-xs font-mono" style={{ color: 'var(--dd-text-secondary)' }}>
                {project.cpu.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkline data={memHistory} color="var(--dd-syntax-keyword)" width={60} height={20} />
              <span className="text-xs font-mono" style={{ color: 'var(--dd-text-secondary)' }}>
                {formatMemory(project.mem)}
              </span>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div
          className="flex items-center gap-1 pt-1"
          style={{ borderTop: '1px solid var(--dd-border)' }}
        >
          {/* Start / Stop toggle */}
          {canStop ? (
            <Tooltip content="Stop">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStop()
                }}
                className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring cursor-pointer"
                style={{ color: 'var(--dd-status-error)' }}
                aria-label="Stop project"
              >
                <StopIcon />
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Start">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStart()
                }}
                className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring cursor-pointer"
                style={{ color: 'var(--dd-status-running)' }}
                aria-label="Start project"
              >
                <PlayIcon />
              </button>
            </Tooltip>
          )}

          {/* Restart */}
          <Tooltip content="Restart">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRestart()
              }}
              disabled={!canStop}
              className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ color: 'var(--dd-text-secondary)' }}
              aria-label="Restart project"
            >
              <RestartIcon />
            </button>
          </Tooltip>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Open Browser */}
          <Tooltip content="Open in Browser">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenBrowser()
              }}
              disabled={project.port <= 0}
              className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              style={{ color: 'var(--dd-text-secondary)' }}
              aria-label="Open in browser"
            >
              <GlobeIcon />
            </button>
          </Tooltip>

          {/* Open Editor */}
          <Tooltip content="Open in Editor">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenEditor()
              }}
              className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring cursor-pointer"
              style={{ color: 'var(--dd-text-secondary)' }}
              aria-label="Open in editor"
            >
              <CodeIcon />
            </button>
          </Tooltip>

          {/* Open Terminal */}
          <Tooltip content="Open Terminal">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenTerminal()
              }}
              className="p-1.5 rounded-[var(--dd-radius-sm)] transition-colors hover:bg-[var(--dd-surface-3)] dd-focus-ring cursor-pointer"
              style={{ color: 'var(--dd-text-secondary)' }}
              aria-label="Open terminal"
            >
              <TerminalIcon />
            </button>
          </Tooltip>
        </div>
      </div>
    )
  }
)

ProjectCard.displayName = 'ProjectCard'

export default ProjectCard
