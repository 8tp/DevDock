import React, { useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { useSettingsStore } from '../stores/settingsStore'
import { ProjectList } from '../components/projects'
import { Button, Input } from '../components/ui'

// ─── Folder Icon ─────────────────────────────────────────────────────────────

const FolderPlusIcon: React.FC = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    style={{ color: 'var(--dd-text-muted)' }}
  >
    <path
      d="M6 14V38C6 40.2091 7.79086 42 10 42H38C40.2091 42 42 40.2091 42 38V18C42 15.7909 40.2091 14 38 14H24L20 8H10C7.79086 8 6 9.79086 6 12V14Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M24 22V34M18 28H30"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

// ─── Loading Skeleton ────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col gap-3 p-4 rounded-[var(--dd-radius-lg)] dd-animate-pulse"
        style={{
          backgroundColor: 'var(--dd-surface-1)',
          border: '1px solid var(--dd-border)',
          borderLeftWidth: '4px',
          borderLeftColor: 'var(--dd-border)'
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="h-5 w-16 rounded-[var(--dd-radius-full)]"
            style={{ backgroundColor: 'var(--dd-surface-3)' }}
          />
          <div
            className="h-4 w-4 rounded-[var(--dd-radius-sm)]"
            style={{ backgroundColor: 'var(--dd-surface-3)' }}
          />
        </div>
        <div
          className="h-5 w-3/4 rounded-[var(--dd-radius-sm)]"
          style={{ backgroundColor: 'var(--dd-surface-3)' }}
        />
        <div
          className="h-3 w-full rounded-[var(--dd-radius-sm)]"
          style={{ backgroundColor: 'var(--dd-surface-2)' }}
        />
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-[var(--dd-radius-full)]"
            style={{ backgroundColor: 'var(--dd-surface-3)' }}
          />
          <div
            className="h-3 w-12 rounded-[var(--dd-radius-sm)]"
            style={{ backgroundColor: 'var(--dd-surface-3)' }}
          />
        </div>
      </div>
    ))}
  </div>
)

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => {
  const scanProjects = useProjectStore((s) => s.scanProjects)
  const addScanDirectory = useSettingsStore((s) => s.addScanDirectory)
  const settings = useSettingsStore((s) => s.settings)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const [dirPath, setDirPath] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const hasScanDirs = (settings?.scanDirectories?.length ?? 0) > 0

  const handleAddAndScan = useCallback(async () => {
    const pathToAdd = dirPath.trim()
    if (!pathToAdd) return
    setScanning(true)
    try {
      await addScanDirectory(pathToAdd)
      setDirPath('')
      await scanProjects()
    } catch (err) {
      console.error('[DevDock] Add scan dir error:', err)
    }
    setScanning(false)
  }, [dirPath, addScanDirectory, scanProjects])

  const handleScanOnly = useCallback(async () => {
    setScanning(true)
    await scanProjects()
    setScanning(false)
  }, [scanProjects])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 h-full">
      <FolderPlusIcon />
      <div className="text-center">
        <h3 className="text-base font-semibold" style={{ color: 'var(--dd-text-primary)' }}>
          No projects discovered
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--dd-text-muted)' }}>
          {hasScanDirs
            ? 'No projects found in your scan directories. Try adding another directory.'
            : 'Add a directory to scan for projects (e.g. ~/dev or ~/projects).'}
        </p>
      </div>

      <div className="flex items-center gap-2 w-full max-w-md">
        <Input
          placeholder="~/dev"
          value={dirPath}
          onChange={(e) => setDirPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAddAndScan()
          }}
          className="flex-1"
        />
        <Button
          variant="primary"
          size="md"
          onClick={() => void handleAddAndScan()}
          disabled={!dirPath.trim() || scanning}
        >
          {scanning ? 'Scanning...' : 'Add & Scan'}
        </Button>
      </div>

      {hasScanDirs && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleScanOnly()}
          disabled={scanning}
        >
          Re-scan existing directories
        </Button>
      )}
    </div>
  )
}

// ─── Projects View ───────────────────────────────────────────────────────────

const ProjectsView: React.FC = () => {
  const loading = useProjectStore((s) => s.loading)
  const projects = useProjectStore((s) => s.projects)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Loading state
  if (loading && projects.length === 0) {
    return <LoadingSkeleton />
  }

  // Empty state — no projects at all
  if (!loading && projects.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col h-full p-6">
      <ProjectList />
    </div>
  )
}

export default ProjectsView
