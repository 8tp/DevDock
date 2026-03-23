import { useEffect, useRef } from 'react'

interface ShortcutConfig {
  /** The key to match against event.key (lowercase). Examples: 'k', '1', 'j', 'space', 'escape', ',', '\\', 'f', 'l' */
  key: string
  /** Cmd on macOS, Ctrl on Windows/Linux */
  meta?: boolean
  /** Shift modifier */
  shift?: boolean
  /** Handler to invoke when the shortcut fires */
  handler: () => void
  /** Whether this shortcut is active. Defaults to true. */
  enabled?: boolean
}

/**
 * Normalise an event.key value to a canonical lowercase form so that
 * config entries like 'space' and 'escape' match the browser-native
 * key values (' ' and 'Escape').
 */
function normaliseKey(raw: string): string {
  const lower = raw.toLowerCase()
  switch (lower) {
    case ' ':
      return 'space'
    case 'escape':
      return 'escape'
    case 'enter':
      return 'enter'
    default:
      return lower
  }
}

/**
 * Returns true when the element currently focused is an input, textarea,
 * select, or contentEditable node – in which case non-modified shortcuts
 * (single-key like j/k/space) should generally be suppressed to avoid
 * interfering with typing.
 */
function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Register multiple keyboard shortcuts.
 *
 * Automatically maps the `meta` flag to ⌘ (metaKey) on macOS and Ctrl
 * (ctrlKey) on Windows / Linux, matching the PRD §9 specification.
 *
 * Single-key shortcuts (no meta modifier) are suppressed when the focus
 * is inside an editable element so that normal typing is not disrupted.
 *
 * @example
 * ```tsx
 * useKeyboard([
 *   { key: 'k', meta: true, handler: openCommandPalette },
 *   { key: '1', meta: true, handler: () => navigate('/projects') },
 *   { key: 'j', handler: moveDown },
 *   { key: 'escape', handler: closeModal },
 * ])
 * ```
 */
export function useKeyboard(shortcuts: ShortcutConfig[]): void {
  // Keep a stable ref to the latest shortcuts array so the keydown
  // listener always sees fresh handlers without needing to re-bind.
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const pressedKey = normaliseKey(event.key)
      const metaPressed = event.metaKey || event.ctrlKey
      const shiftPressed = event.shiftKey

      for (const shortcut of shortcutsRef.current) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) continue

        const wantsMeta = shortcut.meta ?? false
        const wantsShift = shortcut.shift ?? false
        const configKey = shortcut.key.toLowerCase()

        // Key must match
        if (pressedKey !== configKey) continue

        // Modifier flags must match
        if (wantsMeta !== metaPressed) continue
        if (wantsShift !== shiftPressed) continue

        // For non-modified shortcuts, skip if the user is typing in an
        // editable field (inputs, textareas, contentEditable).
        if (!wantsMeta && !wantsShift && isEditableTarget(event)) continue

        event.preventDefault()
        event.stopPropagation()
        shortcut.handler()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [])
}

/**
 * Detect if the app is running on macOS.
 * Used to display the correct modifier key symbol in the UI.
 */
export function isMac(): boolean {
  // navigator.platform is deprecated but widely available and sufficient
  // for Electron desktop targets. userAgentData is only on Chromium and
  // not always exposed, so we fall back to platform first.
  if (typeof navigator !== 'undefined' && navigator.platform) {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }
  return false
}

/**
 * Return the platform-appropriate modifier key symbol.
 * macOS: ⌘   Windows/Linux: Ctrl
 */
export function getModKey(): string {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * Format a shortcut for display in the UI.
 *
 * @example
 * formatShortcut({ key: 'k', meta: true })          // '⌘ K' on Mac, 'Ctrl K' on Win
 * formatShortcut({ key: 'r', meta: true, shift: true }) // '⌘ ⇧ R'
 * formatShortcut({ key: 'j' })                       // 'J'
 */
export function formatShortcut(shortcut: Pick<ShortcutConfig, 'key' | 'meta' | 'shift'>): string {
  const parts: string[] = []
  if (shortcut.meta) parts.push(getModKey())
  if (shortcut.shift) parts.push(isMac() ? '⇧' : 'Shift')

  const keyLabel = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key
  parts.push(keyLabel)

  return parts.join(' ')
}

export type { ShortcutConfig }
