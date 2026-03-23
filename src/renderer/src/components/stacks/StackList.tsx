import React, { useState, useEffect, useCallback } from 'react'
import type { Stack, Project } from '@shared/types'
import { Button, Badge } from '../ui'

interface StackListProps {
  onEdit: (stack: Stack) => void
  onNew: () => void
}

/**
 * StackList — Displays all defined stacks with launch/stop/delete controls.
 *
 * Fetches stacks and projects from window.api on mount.
 * Provides launch, stop, and delete actions per stack.
 */
const StackList: React.FC<StackListProps> = ({ onEdit, onNew }) => {
  const [stacks, setStacks] = useState<Stack[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [launchingIds, setLaunchingIds] = useState<Set<string>>(new Set())
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const [stackData, projectData] = await Promise.all([
        window.api.listStacks() as Promise<Stack[]>,
        window.api.listProjects() as Promise<Project[]>
      ])
      setStacks(stackData)
      setProjects(projectData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>()
    for (const p of projects) {
      map.set(p.id, p)
    }
    return map
  }, [projects])

  const handleLaunch = async (stackId: string): Promise<void> => {
    setLaunchingIds((prev) => new Set(prev).add(stackId))
    try {
      await window.api.launchStack(stackId)
      await fetchData()
    } finally {
      setLaunchingIds((prev) => {
        const next = new Set(prev)
        next.delete(stackId)
        return next
      })
    }
  }

  const handleStop = async (stackId: string): Promise<void> => {
    setStoppingIds((prev) => new Set(prev).add(stackId))
    try {
      await window.api.stopStack(stackId)
      await fetchData()
    } finally {
      setStoppingIds((prev) => {
        const next = new Set(prev)
        next.delete(stackId)
        return next
      })
    }
  }

  const handleDelete = async (stackId: string): Promise<void> => {
    await window.api.deleteStack(stackId)
    await fetchData()
  }

  /** Count how many projects in this stack are currently running */
  const getRunningCount = (stack: Stack): number => {
    return stack.projectIds.filter((id) => {
      const p = projectMap.get(id)
      return p && (p.status === 'running' || p.status === 'starting')
    }).length
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span
          className="text-sm"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Loading stacks...
        </span>
      </div>
    )
  }

  // Empty state
  if (stacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--dd-text-muted)' }}
        >
          <rect x="3" y="3" width="18" height="6" rx="1" />
          <rect x="3" y="15" width="18" height="6" rx="1" />
          <path d="M3 9v6" />
          <path d="M21 9v6" />
        </svg>
        <span
          className="text-lg font-medium"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          No stacks defined
        </span>
        <span
          className="text-sm text-center max-w-sm"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Create a stack to launch multiple projects at once in the correct dependency order.
        </span>
        <Button variant="primary" size="md" onClick={onNew}>
          Create Stack
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {stacks.map((stack) => {
        const runningCount = getRunningCount(stack)
        const isLaunching = launchingIds.has(stack.id)
        const isStopping = stoppingIds.has(stack.id)
        const allRunning = runningCount === stack.projectIds.length && stack.projectIds.length > 0
        const someRunning = runningCount > 0

        return (
          <div
            key={stack.id}
            className="rounded-[var(--dd-radius-lg)] border p-4 transition-colors duration-[var(--dd-duration-fast)]"
            style={{
              backgroundColor: 'var(--dd-surface-1)',
              borderColor: 'var(--dd-border)'
            }}
          >
            {/* Top row: name + badges */}
            <div className="flex items-center gap-3 mb-2">
              <h3
                className="text-sm font-semibold flex-1 truncate"
                style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
              >
                {stack.name}
              </h3>

              <Badge variant="count">
                {stack.projectIds.length} {stack.projectIds.length === 1 ? 'project' : 'projects'}
              </Badge>

              {someRunning && (
                <Badge
                  variant="status"
                  color={allRunning ? 'var(--dd-status-running)' : 'var(--dd-status-warning)'}
                >
                  {runningCount}/{stack.projectIds.length} running
                </Badge>
              )}

              {stack.autoStart && (
                <Badge variant="framework">auto-start</Badge>
              )}
            </div>

            {/* Description */}
            {stack.description && (
              <p
                className="text-xs mb-3 leading-relaxed"
                style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
              >
                {stack.description}
              </p>
            )}

            {/* Project list preview */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {stack.projectIds.map((pid) => {
                const project = projectMap.get(pid)
                if (!project) return null
                const statusColor =
                  project.status === 'running'
                    ? 'var(--dd-status-running)'
                    : project.status === 'error'
                      ? 'var(--dd-status-error)'
                      : 'var(--dd-text-muted)'

                return (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-[var(--dd-radius-full)]"
                    style={{
                      backgroundColor: 'var(--dd-surface-2)',
                      color: 'var(--dd-text-secondary)',
                      fontFamily: 'var(--dd-font-mono)'
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                    {project.name}
                  </span>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {!allRunning && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isLaunching}
                  onClick={() => void handleLaunch(stack.id)}
                >
                  {isLaunching ? 'Launching...' : 'Launch'}
                </Button>
              )}

              {someRunning && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isStopping}
                  onClick={() => void handleStop(stack.id)}
                >
                  {isStopping ? 'Stopping...' : 'Stop All'}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(stack)}
              >
                Edit
              </Button>

              <div className="flex-1" />

              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleDelete(stack.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

StackList.displayName = 'StackList'

export { StackList }
