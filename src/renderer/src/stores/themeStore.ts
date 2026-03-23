import { create } from 'zustand'
import type { Theme } from '@shared/types'
import { getBuiltinThemes, applyTheme } from '../themes/theme-engine'

interface ThemeState {
  currentTheme: Theme | null
  availableThemes: Theme[]

  initialize: () => void
  switchTheme: (themeId: string) => void
}

const DEFAULT_THEME_ID = 'tokyo-night'

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: null,
  availableThemes: [],

  initialize: () => {
    const themes = getBuiltinThemes()
    const defaultTheme =
      themes.find((t) => t.id === DEFAULT_THEME_ID) ?? themes[0]

    if (defaultTheme) {
      applyTheme(defaultTheme)
    }

    set({
      availableThemes: themes,
      currentTheme: defaultTheme ?? null
    })
  },

  switchTheme: (themeId: string) => {
    const { availableThemes } = get()
    const theme = availableThemes.find((t) => t.id === themeId)
    if (!theme) return

    applyTheme(theme)
    set({ currentTheme: theme })
  }
}))
