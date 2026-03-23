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
      const ports = (await window.api.listPorts()) as PortBinding[]
      set({ ports })
    } finally {
      set({ loading: false })
    }
  },

  fetchConflicts: async () => {
    const conflicts = (await window.api.getPortConflicts()) as PortConflict[]
    set({ conflicts })
  },

  killPort: async (port: number) => {
    await window.api.killPort(port)
    await get().fetchPorts()
    await get().fetchConflicts()
  },

  setSelectedPort: (port) => set({ selectedPort: port }),

  setPorts: (ports) => set({ ports })
}))
