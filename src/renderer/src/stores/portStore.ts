import { create } from 'zustand'
import type { PortBinding, PortConflict } from '@shared/types'

interface PortState {
  ports: PortBinding[]
  conflicts: PortConflict[]
  selectedPort: number | null
  loading: boolean

  fetchPorts: () => Promise<void>
  fetchConflicts: () => Promise<void>
  killPort: (port: number) => Promise<void>
  setSelectedPort: (port: number | null) => void
  setPorts: (ports: PortBinding[]) => void
}

export const usePortStore = create<PortState>((set, get) => ({
  ports: [],
  conflicts: [],
  selectedPort: null,
  loading: false,

  fetchPorts: async () => {
    set({ loading: true })
    try {
      const result = await window.api.listPorts()
      const ports = Array.isArray(result) ? (result as PortBinding[]) : []
      set({ ports })
    } catch {
      // IPC may fail
    } finally {
      set({ loading: false })
    }
  },

  fetchConflicts: async () => {
    try {
      const result = await window.api.getPortConflicts()
      const conflicts = Array.isArray(result) ? (result as PortConflict[]) : []
      set({ conflicts })
    } catch {
      // IPC may fail
    }
  },

  killPort: async (port: number) => {
    try {
      await window.api.killPort(port)
      await get().fetchPorts()
      await get().fetchConflicts()
    } catch {
      // kill may fail
    }
  },

  setSelectedPort: (port) => set({ selectedPort: port }),

  setPorts: (ports) => set({ ports })
}))
