import React, { useCallback, useMemo } from 'react'
import { useProjectStore } from '../../stores/projectStore'
import { Button, Input } from '../ui'
import ProjectCard from './ProjectCard'

// ─── Search Icon ─────────────────────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

// ─── Filter Type ─────────────────────────────────────────────────────────────

type FilterValue = 'all' | 'running' | 'stopped'

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Stopped', value: 'stopped' }
]

// ─── Component ───────────────────────────────────────────────────────────────

const ProjectList: React.FC = () => {
  const filter = useProjectStore((s) => s.filter)
  const searchQuery = useProjectStore((s) => s.searchQuery)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const setFilter = useProjectStore((s) => s.setFilter)
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery)
  const setSelectedProject = useProjectStore((s) => s.setSelectedProject)
  const startProject = useProjectStore((s) => s.startProject)
  const stopProject = useProjectStore((s) => s.stopProject)
  const restartProject = useProjectStore((s) => s.restartProject)
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite)
  const projects = useProjectStore((s) => s.projects)

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    let filtered = projects

    if (filter === 'running') {
      filtered = filtered.filter((p) => p.status === 'running' || p.status === 'starting')
    } else if (filter === 'stopped') {
      filtered = filtered.filter((p) => p.status === 'stopped' || p.status === 'error')
    }

    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query) ||
          p.framework.toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [projects, filter, searchQuery])

  const handleFilterChange = useCallback(
    (value: FilterValue) => {
      setFilter(value)
    },
    [setFilter]
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    [setSearchQuery]
  )

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--dd-text-primary)' }}>
            Projects
          </h2>
          <div className="flex items-center gap-1 p-0.5 rounded-[var(--dd-radius-md)]" style={{ backgroundColor: 'var(--dd-surface-2)' }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFilterChange(f.value)}
                className={[
                  'px-2.5 py-1 text-xs font-medium rounded-[var(--dd-radius-sm)]',
                  'transition-colors cursor-pointer'
                ].join(' ')}
                style={{
                  backgroundColor: filter === f.value ? 'var(--dd-surface-3)' : 'transparent',
                  color: filter === f.value ? 'var(--dd-text-primary)' : 'var(--dd-text-muted)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={handleSearchChange}
          icon={<SearchIcon />}
        />
      </div>

      {/* Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              selected={project.id === selectedProjectId}
              onStart={() => startProject(project.id)}
              onStop={() => stopProject(project.id)}
              onRestart={() => restartProject(project.id)}
              onToggleFavorite={() => toggleFavorite(project.id)}
              onSelect={() =>
                setSelectedProject(project.id === selectedProjectId ? null : project.id)
              }
            />
          ))}
        </div>
      ) : (
        <EmptyFilterState searchQuery={searchQuery} filter={filter} />
      )}
    </div>
  )
}

// ─── Empty Filter State ──────────────────────────────────────────────────────

interface EmptyFilterStateProps {
  searchQuery: string
  filter: FilterValue
}

const EmptyFilterState: React.FC<EmptyFilterStateProps> = ({ searchQuery, filter }) => {
  const setFilter = useProjectStore((s) => s.setFilter)
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery)

  let message = 'No projects match the current filters.'
  if (searchQuery.trim()) {
    message = `No projects found for "${searchQuery}".`
  } else if (filter === 'running') {
    message = 'No projects are currently running.'
  } else if (filter === 'stopped') {
    message = 'All projects are currently running.'
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        style={{ color: 'var(--dd-text-muted)' }}
      >
        <rect x="6" y="10" width="36" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 18H42" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" />
        <circle cx="17" cy="14" r="1.5" fill="currentColor" />
        <circle cx="22" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>
        {message}
      </p>
      {(searchQuery.trim() || filter !== 'all') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchQuery('')
            setFilter('all')
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

export default ProjectList
