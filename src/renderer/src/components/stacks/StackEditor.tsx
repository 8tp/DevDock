import React, { useState, useEffect, useCallback } from 'react'
import type { Stack, Project } from '@shared/types'
import { Button, Input } from '../ui'

interface StackEditorProps {
  onSave: (data: { name: string; description: string; projectIds: string[]; autoStart: boolean }) => void
  onCancel: () => void
  initialData?: Stack
}

/**
 * StackEditor — Form for creating or editing a stack.
 *
 * Provides inputs for name, description, project multi-select (checkboxes),
 * and an auto-start toggle. Fetches available projects from window.api.
 */
const StackEditor: React.FC<StackEditorProps> = ({ onSave, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(initialData?.projectIds ?? [])
  )
  const [autoStart, setAutoStart] = useState(initialData?.autoStart ?? false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  useEffect(() => {
    window.api.listProjects().then((data: unknown) => {
      setProjects(data as Project[])
      setLoadingProjects(false)
    })
  }, [])

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      projectIds: Array.from(selectedProjectIds),
      autoStart
    })
  }

  const isValid = name.trim().length > 0 && selectedProjectIds.size > 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium"
          style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
          htmlFor="stack-name"
        >
          Stack Name
        </label>
        <Input
          id="stack-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Full Stack Dev"
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium"
          style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
          htmlFor="stack-description"
        >
          Description
        </label>
        <textarea
          id="stack-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this stack does..."
          rows={3}
          className="w-full text-sm rounded-[var(--dd-radius-md)] border outline-none resize-none transition-colors duration-[var(--dd-duration-fast)] placeholder:text-[var(--dd-text-muted)] dd-focus-ring px-3 py-2"
          style={{
            backgroundColor: 'var(--dd-surface-2)',
            borderColor: 'var(--dd-border)',
            color: 'var(--dd-text-primary)',
            fontFamily: 'var(--dd-font-sans)'
          }}
        />
      </div>

      {/* Project multi-select */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium"
          style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Projects ({selectedProjectIds.size} selected)
        </label>

        <div
          className="rounded-[var(--dd-radius-md)] border max-h-48 overflow-auto"
          style={{
            backgroundColor: 'var(--dd-surface-2)',
            borderColor: 'var(--dd-border)'
          }}
        >
          {loadingProjects ? (
            <div className="flex items-center justify-center py-6">
              <span
                className="text-xs"
                style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
              >
                Loading projects...
              </span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <span
                className="text-xs"
                style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
              >
                No projects found. Add a scan directory in Settings first.
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              {projects.map((project) => {
                const isSelected = selectedProjectIds.has(project.id)
                return (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-[var(--dd-duration-fast)] hover:bg-[var(--dd-surface-3)]"
                    style={{
                      borderBottom: '1px solid var(--dd-border)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleProject(project.id)}
                      className="accent-[var(--dd-accent)] w-3.5 h-3.5 cursor-pointer"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span
                        className="text-sm truncate"
                        style={{
                          color: isSelected ? 'var(--dd-text-primary)' : 'var(--dd-text-secondary)',
                          fontFamily: 'var(--dd-font-sans)'
                        }}
                      >
                        {project.name}
                      </span>
                      <span
                        className="text-xs truncate"
                        style={{
                          color: 'var(--dd-text-muted)',
                          fontFamily: 'var(--dd-font-mono)'
                        }}
                      >
                        {project.path}
                      </span>
                    </div>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{
                        color: 'var(--dd-text-muted)',
                        fontFamily: 'var(--dd-font-mono)'
                      }}
                    >
                      :{project.port}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Auto-start toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <button
          type="button"
          role="switch"
          aria-checked={autoStart}
          onClick={() => setAutoStart((prev) => !prev)}
          className="relative w-9 h-5 rounded-full transition-colors duration-[var(--dd-duration-fast)] flex-shrink-0 cursor-pointer"
          style={{
            backgroundColor: autoStart ? 'var(--dd-accent)' : 'var(--dd-surface-3)'
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-[var(--dd-duration-fast)]"
            style={{
              backgroundColor: 'var(--dd-text-primary)',
              transform: autoStart ? 'translateX(16px)' : 'translateX(0)'
            }}
          />
        </button>
        <span
          className="text-sm"
          style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Auto-start on DevDock launch
        </span>
      </label>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="md" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="md" type="submit" disabled={!isValid}>
          {initialData ? 'Update Stack' : 'Create Stack'}
        </Button>
      </div>
    </form>
  )
}

StackEditor.displayName = 'StackEditor'

export { StackEditor }
export type { StackEditorProps }
