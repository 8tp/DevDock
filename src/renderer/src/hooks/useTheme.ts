import { useThemeStore } from '../stores/themeStore'

/**
 * Convenience hook for accessing theme state and actions.
 *
 * Selects each slice individually so that components only re-render
 * when the specific value they consume changes.
 */
export function useTheme() {
  const currentTheme = useThemeStore((s) => s.currentTheme)
  const availableThemes = useThemeStore((s) => s.availableThemes)
  const switchTheme = useThemeStore((s) => s.switchTheme)

  return { currentTheme, availableThemes, switchTheme } as const
}
