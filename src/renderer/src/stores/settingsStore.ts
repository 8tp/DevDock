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
      if (settings) set({ settings })
    } catch {
      // IPC may fail
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    try {
      await window.api.updateSettings(updates)
      await get().fetchSettings()
    } catch {
      // update may fail
    }
  },

  addScanDirectory: async (path: string, maxDepth?: number) => {
    try {
      await window.api.addScanDirectory(path, maxDepth)
      await get().fetchSettings()
    } catch {
      // add may fail
    }
  },

  removeScanDirectory: async (id: string) => {
    try {
      await window.api.removeScanDirectory(id)
      await get().fetchSettings()
    } catch {
      // remove may fail
    }
  }
}))
