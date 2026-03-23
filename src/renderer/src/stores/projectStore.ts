import { create } from 'zustand'
import type { Project } from '@shared/types'

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  filter: 'all' | 'running' | 'stopped'
  searchQuery: string
  loading: boolean

  // Actions
  fetchProjects: () => Promise<void>
  startProject: (id: string) => Promise<void>
  stopProject: (id: string) => Promise<void>
  restartProject: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  scanProjects: () => Promise<void>
  setFilter: (filter: 'all' | 'running' | 'stopped') => void
  setSearchQuery: (query: string) => void
  setSelectedProject: (id: string | null) => void

  // Computed (as getter functions)
  getFilteredProjects: () => Project[]
  getRunningCount: () => number
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  filter: 'all',
  searchQuery: '',
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const result = await window.api.listProjects()
      const projects = Array.isArray(result) ? (result as Project[]) : []
      set({ projects })
    } catch {
      // IPC may fail if main process isn't ready
    } finally {
      set({ loading: false })
    }
  },

  startProject: async (id: string) => {
    try {
      const result = await window.api.startProject(id)
      if (result && typeof result === 'object' && 'error' in result) {
        console.error('[DevDock] Start failed:', (result as { error: string }).error)
      }
    } catch (err) {
      console.error('[DevDock] Start project error:', err)
    }
    await get().fetchProjects()
  },

  stopProject: async (id: string) => {
    try {
      await window.api.stopProject(id)
    } catch (err) {
      console.error('[DevDock] Stop project error:', err)
    }
    await get().fetchProjects()
  },

  restartProject: async (id: string) => {
    try {
      const result = await window.api.restartProject(id)
      if (result && typeof result === 'object' && 'error' in result) {
        console.error('[DevDock] Restart failed:', (result as { error: string }).error)
      }
    } catch (err) {
      console.error('[DevDock] Restart project error:', err)
    }
    await get().fetchProjects()
  },

  toggleFavorite: async (id: string) => {
    try {
      await window.api.toggleFavorite(id)
    } catch (err) {
      console.error('[DevDock] Toggle favorite error:', err)
    }
    await get().fetchProjects()
  },

  scanProjects: async () => {
    set({ loading: true })
    try {
      await window.api.scanProjects()
    } catch (err) {
      console.error('[DevDock] Scan projects error:', err)
    }
    await get().fetchProjects()
    set({ loading: false })
  },

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedProject: (id) => set({ selectedProjectId: id }),

  getFilteredProjects: () => {
    const { projects, filter, searchQuery } = get()
    const query = searchQuery.toLowerCase().trim()

    let filtered = projects

    // Apply status filter
    if (filter === 'running') {
      filtered = filtered.filter(
        (p) => p.status === 'running' || p.status === 'starting'
      )
    } else if (filter === 'stopped') {
      filtered = filtered.filter(
        (p) => p.status === 'stopped' || p.status === 'error'
      )
    }

    // Apply search query
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query) ||
          p.framework.toLowerCase().includes(query)
      )
    }

    // Sort: favorites first, then alphabetical by name
    return filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  },

  getRunningCount: () => {
    return get().projects.filter((p) => p.status === 'running').length
  }
}))
