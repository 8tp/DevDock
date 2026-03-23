import { create } from 'zustand'
import type { LogEntry, LogLevel } from '@shared/types'

interface LogState {
  entries: LogEntry[]
  filterProjectIds: Set<string>
  filterLevel: LogLevel | null
  searchQuery: string
  autoScroll: boolean
  maxEntries: number

  addEntry: (entry: LogEntry) => void
  fetchLogs: (options?: {
    projectId?: string
    level?: LogLevel
    search?: string
    limit?: number
  }) => Promise<void>
  clearLogs: (projectId?: string) => Promise<void>
  setFilterLevel: (level: LogLevel | null) => void
  setSearchQuery: (query: string) => void
  toggleProjectFilter: (projectId: string) => void
  setAutoScroll: (enabled: boolean) => void
  getFilteredEntries: () => LogEntry[]
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  filterProjectIds: new Set<string>(),
  filterLevel: null,
  searchQuery: '',
  autoScroll: true,
  maxEntries: 10000,

  addEntry: (entry: LogEntry) => {
    set((state) => {
      const next = [...state.entries, entry]
      // Maintain circular buffer: drop oldest entries when over capacity
      if (next.length > state.maxEntries) {
        return { entries: next.slice(next.length - state.maxEntries) }
      }
      return { entries: next }
    })
  },

  fetchLogs: async (options) => {
    try {
      const result = await window.api.getLogs(options)
      const entries = Array.isArray(result) ? (result as LogEntry[]) : []
      set({ entries })
    } catch {
      // IPC may fail if main process isn't ready yet
    }
  },

  clearLogs: async (projectId?: string) => {
    try {
      await window.api.clearLogs(projectId)
    } catch {
      // IPC may fail
    }
    if (projectId) {
      set((state) => ({
        entries: state.entries.filter((e) => e.projectId !== projectId)
      }))
    } else {
      set({ entries: [] })
    }
  },

  setFilterLevel: (level) => set({ filterLevel: level }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleProjectFilter: (projectId: string) => {
    set((state) => {
      const next = new Set(state.filterProjectIds)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return { filterProjectIds: next }
    })
  },

  setAutoScroll: (enabled) => set({ autoScroll: enabled }),

  getFilteredEntries: () => {
    const { entries, filterProjectIds, filterLevel, searchQuery } = get()
    const query = searchQuery.toLowerCase().trim()

    return entries.filter((entry) => {
      // Filter by selected projects (empty set means show all)
      if (filterProjectIds.size > 0 && !filterProjectIds.has(entry.projectId)) {
        return false
      }

      // Filter by log level
      if (filterLevel !== null && entry.level !== filterLevel) {
        return false
      }

      // Filter by search query
      if (query && !entry.message.toLowerCase().includes(query)) {
        return false
      }

      return true
    })
  }
}))
