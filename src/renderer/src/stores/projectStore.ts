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
      await window.api.startProject(id)
      await get().fetchProjects()
    } catch {
      // start may fail
    }
  },

  stopProject: async (id: string) => {
    try {
      await window.api.stopProject(id)
      await get().fetchProjects()
    } catch {
      // stop may fail
    }
  },

  restartProject: async (id: string) => {
    try {
      await window.api.restartProject(id)
      await get().fetchProjects()
    } catch {
      // restart may fail
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      await window.api.toggleFavorite(id)
      await get().fetchProjects()
    } catch {
      // toggle may fail
    }
  },

  scanProjects: async () => {
    set({ loading: true })
    try {
      await window.api.scanProjects()
      await get().fetchProjects()
    } catch {
      // scan may fail
    } finally {
      set({ loading: false })
    }
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
