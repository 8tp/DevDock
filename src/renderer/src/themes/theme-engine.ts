// ─── Theme Engine ──────────────────────────────────────────────────────────
// Loads, validates, and applies themes by injecting CSS custom properties
// onto the document root. Also exports all built-in theme definitions.

import type { Theme } from '@shared/types'

// ─── Required Tokens ──────────────────────────────────────────────────────
// Every theme must define values for each of these semantic tokens.

const REQUIRED_TOKENS = [
  'bg',
  'surface-0',
  'surface-1',
  'surface-2',
  'surface-3',
  'border',
  'border-focus',
  'text-primary',
  'text-secondary',
  'text-muted',
  'text-inverse',
  'accent',
  'accent-hover',
  'status-running',
  'status-stopped',
  'status-error',
  'status-warning',
  'status-info',
  'syntax-string',
  'syntax-number',
  'syntax-keyword',
  'syntax-comment',
  'syntax-function',
  'syntax-type'
]

// ─── Core API ─────────────────────────────────────────────────────────────

/**
 * Apply a theme by setting `--dd-*` CSS custom properties on <html>.
 * This triggers an immediate repaint — no restart required.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const [token, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--dd-${token}`, value)
  }
}

/**
 * Validate that a color map contains every required token.
 * Returns the list of missing keys (empty when valid).
 */
export function validateTheme(colors: Record<string, string>): {
  valid: boolean
  missing: string[]
} {
  const missing = REQUIRED_TOKENS.filter((token) => !colors[token])
  return { valid: missing.length === 0, missing }
}

/**
 * Merge a child theme's colors on top of a parent theme.
 * The child keeps its own metadata (id, name, etc.) and inherits
 * any tokens it does not explicitly override.
 */
export function mergeWithParent(theme: Theme, parent: Theme | null): Theme {
  if (!parent) return theme
  return {
    ...theme,
    colors: { ...parent.colors, ...theme.colors }
  }
}

/**
 * Return every built-in theme that ships with DevDock.
 */
export function getBuiltinThemes(): Theme[] {
  return [tokyoNight, tokyoNightStorm, catppuccinMocha, githubDark]
}

// ─── Built-in Theme Definitions ───────────────────────────────────────────

export const tokyoNight: Theme = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  type: 'builtin',
  filePath: null,
  parentThemeId: null,
  colors: {
    'bg': '#1A1B26',
    'surface-0': '#16161E',
    'surface-1': '#1A1B26',
    'surface-2': '#24283B',
    'surface-3': '#2F3549',
    'border': '#3B4261',
    'border-focus': '#7AA2F7',
    'text-primary': '#C0CAF5',
    'text-secondary': '#A9B1D6',
    'text-muted': '#565F89',
    'text-inverse': '#1A1B26',
    'accent': '#7AA2F7',
    'accent-hover': '#89B4FA',
    'status-running': '#9ECE6A',
    'status-stopped': '#565F89',
    'status-error': '#F7768E',
    'status-warning': '#E0AF68',
    'status-info': '#7DCFFF',
    'syntax-string': '#9ECE6A',
    'syntax-number': '#FF9E64',
    'syntax-keyword': '#BB9AF7',
    'syntax-comment': '#565F89',
    'syntax-function': '#7AA2F7',
    'syntax-type': '#2AC3DE'
  }
}

export const tokyoNightStorm: Theme = {
  id: 'tokyo-night-storm',
  name: 'Tokyo Night Storm',
  type: 'builtin',
  filePath: null,
  parentThemeId: null,
  colors: {
    'bg': '#24283B',
    'surface-0': '#1F2335',
    'surface-1': '#24283B',
    'surface-2': '#2F3549',
    'surface-3': '#3B4261',
    'border': '#3B4261',
    'border-focus': '#7AA2F7',
    'text-primary': '#C0CAF5',
    'text-secondary': '#A9B1D6',
    'text-muted': '#565F89',
    'text-inverse': '#24283B',
    'accent': '#7AA2F7',
    'accent-hover': '#89B4FA',
    'status-running': '#9ECE6A',
    'status-stopped': '#565F89',
    'status-error': '#F7768E',
    'status-warning': '#E0AF68',
    'status-info': '#7DCFFF',
    'syntax-string': '#9ECE6A',
    'syntax-number': '#FF9E64',
    'syntax-keyword': '#BB9AF7',
    'syntax-comment': '#565F89',
    'syntax-function': '#7AA2F7',
    'syntax-type': '#2AC3DE'
  }
}

export const catppuccinMocha: Theme = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  type: 'builtin',
  filePath: null,
  parentThemeId: null,
  colors: {
    'bg': '#1E1E2E',
    'surface-0': '#181825',
    'surface-1': '#1E1E2E',
    'surface-2': '#313244',
    'surface-3': '#45475A',
    'border': '#45475A',
    'border-focus': '#89B4FA',
    'text-primary': '#CDD6F4',
    'text-secondary': '#BAC2DE',
    'text-muted': '#6C7086',
    'text-inverse': '#1E1E2E',
    'accent': '#89B4FA',
    'accent-hover': '#B4BEFE',
    'status-running': '#A6E3A1',
    'status-stopped': '#6C7086',
    'status-error': '#F38BA8',
    'status-warning': '#FAB387',
    'status-info': '#89DCEB',
    'syntax-string': '#A6E3A1',
    'syntax-number': '#FAB387',
    'syntax-keyword': '#CBA6F7',
    'syntax-comment': '#6C7086',
    'syntax-function': '#89B4FA',
    'syntax-type': '#94E2D5'
  }
}

export const githubDark: Theme = {
  id: 'github-dark',
  name: 'GitHub Dark',
  type: 'builtin',
  filePath: null,
  parentThemeId: null,
  colors: {
    'bg': '#0D1117',
    'surface-0': '#010409',
    'surface-1': '#0D1117',
    'surface-2': '#161B22',
    'surface-3': '#21262D',
    'border': '#30363D',
    'border-focus': '#58A6FF',
    'text-primary': '#E6EDF3',
    'text-secondary': '#8B949E',
    'text-muted': '#484F58',
    'text-inverse': '#0D1117',
    'accent': '#58A6FF',
    'accent-hover': '#79C0FF',
    'status-running': '#3FB950',
    'status-stopped': '#484F58',
    'status-error': '#F85149',
    'status-warning': '#D29922',
    'status-info': '#58A6FF',
    'syntax-string': '#A5D6FF',
    'syntax-number': '#79C0FF',
    'syntax-keyword': '#FF7B72',
    'syntax-comment': '#484F58',
    'syntax-function': '#D2A8FF',
    'syntax-type': '#7EE787'
  }
}
