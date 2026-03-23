import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

interface SettingsState {
  settings: AppSettings | null
  loading: boolean

  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  addScanDirectory: (path: string, maxDepth?: number) => Promise<void>
  removeScanDirectory: (id: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = (await window.api.getSettings()) as AppSettings
      set({ settings })
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    await window.api.updateSettings(updates)
    await get().fetchSettings()
  },

  addScanDirectory: async (path: string, maxDepth?: number) => {
    await window.api.addScanDirectory(path, maxDepth)
    await get().fetchSettings()
  },

  removeScanDirectory: async (id: string) => {
    await window.api.removeScanDirectory(id)
    await get().fetchSettings()
  }
}))
