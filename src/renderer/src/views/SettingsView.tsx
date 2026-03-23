import { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useThemeStore } from '../stores/themeStore'
import { Button, Input, Kbd } from '../components/ui'
import type { Theme } from '@shared/types'

// ─── Constants ─────────────────────────────────────────────────────────────

const EDITOR_OPTIONS = [
  { value: 'code', label: 'VS Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'zed', label: 'Zed' },
  { value: 'webstorm', label: 'WebStorm' },
  { value: 'sublime', label: 'Sublime Text' },
  { value: 'vim', label: 'Vim' },
  { value: 'nvim', label: 'Neovim' }
]

const TERMINAL_OPTIONS = [
  { value: 'default', label: 'System Default' },
  { value: 'iterm', label: 'iTerm2' },
  { value: 'warp', label: 'Warp' },
  { value: 'kitty', label: 'Kitty' },
  { value: 'alacritty', label: 'Alacritty' },
  { value: 'hyper', label: 'Hyper' },
  { value: 'wezterm', label: 'WezTerm' }
]

const KEYBOARD_SHORTCUTS = [
  { keys: ['\u2318', 'K'], action: 'Open Command Palette', context: 'Global' },
  { keys: ['\u2318', '1\u20134'], action: 'Switch view (Projects, Ports, Logs, Stacks)', context: 'Global' },
  { keys: ['\u2318', ','], action: 'Open Settings', context: 'Global' },
  { keys: ['\u2318', 'N'], action: 'Add New Project', context: 'Global' },
  { keys: ['\u2318', 'L'], action: 'Toggle Log Panel', context: 'Global' },
  { keys: ['\u2318', '\\'], action: 'Toggle Sidebar', context: 'Global' },
  { keys: ['\u2318', 'F'], action: 'Focus Search / Filter', context: 'Current View' },
  { keys: ['J', '/', 'K'], action: 'Navigate up/down in lists', context: 'Lists' },
  { keys: ['Enter'], action: 'Expand / Select item', context: 'Lists' },
  { keys: ['Space'], action: 'Toggle Start/Stop', context: 'Project focused' },
  { keys: ['O'], action: 'Open in Browser', context: 'Project focused' },
  { keys: ['E'], action: 'Open in Editor', context: 'Project focused' },
  { keys: ['T'], action: 'Open Terminal', context: 'Project focused' },
  { keys: ['R'], action: 'Restart', context: 'Project focused' },
  { keys: ['Esc'], action: 'Close modal / Deselect', context: 'Global' },
  { keys: ['\u2318', '\u21E7', 'R'], action: 'Restart all running services', context: 'Global' },
  { keys: ['\u2318', '\u21E7', 'S'], action: 'Stop all running services', context: 'Global' },
  { keys: ['\u2318', '\u21E7', 'T'], action: 'Toggle theme', context: 'Global' }
]

// ─── Section Card Wrapper ──────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      className="rounded-[var(--dd-radius-lg)] border p-5"
      style={{
        backgroundColor: 'var(--dd-surface-1)',
        borderColor: 'var(--dd-border)'
      }}
    >
      <h2
        className="text-sm font-semibold mb-1"
        style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="text-xs mb-4"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          {description}
        </p>
      )}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  )
}

// ─── Select Dropdown ───────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm rounded-[var(--dd-radius-md)] border outline-none transition-colors duration-[var(--dd-duration-fast)] dd-focus-ring px-3 py-1.5 cursor-pointer appearance-none"
      style={{
        backgroundColor: 'var(--dd-surface-2)',
        borderColor: 'var(--dd-border)',
        color: 'var(--dd-text-primary)',
        fontFamily: 'var(--dd-font-sans)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23565F89' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '32px'
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ─── SettingsView ──────────────────────────────────────────────────────────

function SettingsView(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const addScanDirectory = useSettingsStore((s) => s.addScanDirectory)
  const removeScanDirectory = useSettingsStore((s) => s.removeScanDirectory)

  const availableThemes = useThemeStore((s) => s.availableThemes)
  const currentTheme = useThemeStore((s) => s.currentTheme)
  const switchTheme = useThemeStore((s) => s.switchTheme)

  const [newDirPath, setNewDirPath] = useState('')

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  // ─── Scan Directories ──────────────────────────────────────────────────

  const handleAddDirectory = useCallback(async () => {
    const trimmed = newDirPath.trim()
    if (!trimmed) return
    await addScanDirectory(trimmed)
    setNewDirPath('')
  }, [newDirPath, addScanDirectory])

  const handleRemoveDirectory = useCallback(
    async (id: string) => {
      await removeScanDirectory(id)
    },
    [removeScanDirectory]
  )

  // ─── Editor / Terminal ─────────────────────────────────────────────────

  const handleEditorChange = useCallback(
    (value: string) => {
      void updateSettings({ editor: value })
    },
    [updateSettings]
  )

  const handleTerminalChange = useCallback(
    (value: string) => {
      void updateSettings({ terminal: value })
    },
    [updateSettings]
  )

  // ─── Theme ─────────────────────────────────────────────────────────────

  const handleThemeChange = useCallback(
    (themeId: string) => {
      switchTheme(themeId)
      void updateSettings({ currentThemeId: themeId })
    },
    [switchTheme, updateSettings]
  )

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <span
          className="text-sm"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Loading settings...
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-auto"
      style={{ padding: 'var(--dd-space-6)' }}
    >
      {/* Page header */}
      <h1
        className="text-lg font-semibold mb-6"
        style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
      >
        Settings
      </h1>

      <div className="flex flex-col gap-5 max-w-2xl">
        {/* ── Section 1: Scan Directories ─────────────────────────────── */}
        <SectionCard
          title="Scan Directories"
          description="Directories to scan for project discovery. DevDock will look for known framework markers in these paths."
        >
          {/* Existing directories */}
          <div className="flex flex-col gap-2 mb-3">
            {settings.scanDirectories.length === 0 ? (
              <span
                className="text-xs py-2"
                style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
              >
                No scan directories configured. Add one below to discover projects.
              </span>
            ) : (
              settings.scanDirectories.map((dir) => (
                <div
                  key={dir.id}
                  className="flex items-center gap-3 rounded-[var(--dd-radius-md)] px-3 py-2"
                  style={{ backgroundColor: 'var(--dd-surface-2)' }}
                >
                  <span
                    className="flex-1 text-sm truncate"
                    style={{
                      color: 'var(--dd-text-primary)',
                      fontFamily: 'var(--dd-font-mono)'
                    }}
                  >
                    {dir.path}
                  </span>
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-mono)' }}
                  >
                    depth: {dir.maxDepth}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRemoveDirectory(dir.id)}
                    aria-label={`Remove ${dir.path}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add new directory */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={newDirPath}
                onChange={(e) => setNewDirPath(e.target.value)}
                placeholder="/Users/you/projects"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleAddDirectory()
                  }
                }}
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => void handleAddDirectory()}
              disabled={!newDirPath.trim()}
            >
              Add
            </Button>
          </div>
        </SectionCard>

        {/* ── Section 2: Appearance / Theme ────────────────────────────── */}
        <SectionCard
          title="Appearance"
          description="Choose a theme. Changes apply instantly across the entire interface."
        >
          <div className="grid grid-cols-2 gap-2">
            {availableThemes.map((theme: Theme) => {
              const isActive = currentTheme?.id === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className="flex items-center gap-3 rounded-[var(--dd-radius-md)] border px-3 py-3 text-left transition-all duration-[var(--dd-duration-fast)] cursor-pointer"
                  style={{
                    backgroundColor: isActive ? 'var(--dd-surface-2)' : 'var(--dd-surface-0)',
                    borderColor: isActive ? 'var(--dd-accent)' : 'var(--dd-border)',
                    boxShadow: isActive ? '0 0 0 1px var(--dd-accent)' : 'none'
                  }}
                >
                  {/* Color preview swatches */}
                  <div className="flex gap-1 flex-shrink-0">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.colors['bg'] }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.colors['accent'] }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.colors['status-running'] }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.colors['status-error'] }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        color: isActive ? 'var(--dd-text-primary)' : 'var(--dd-text-secondary)',
                        fontFamily: 'var(--dd-font-sans)'
                      }}
                    >
                      {theme.name}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
                    >
                      {theme.type === 'builtin' ? 'Built-in' : 'Custom'}
                    </span>
                  </div>
                  {isActive && (
                    <svg
                      className="ml-auto flex-shrink-0"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: 'var(--dd-accent)' }}
                    >
                      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Section 3: Editor & Terminal ──────────────────────────────── */}
        <SectionCard
          title="Editor & Terminal"
          description="Configure which applications open when you click 'Open in Editor' or 'Open Terminal' on a project."
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
                htmlFor="editor-select"
              >
                Editor
              </label>
              <Select
                value={settings.editor}
                onChange={handleEditorChange}
                options={EDITOR_OPTIONS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
                htmlFor="terminal-select"
              >
                Terminal
              </label>
              <Select
                value={settings.terminal}
                onChange={handleTerminalChange}
                options={TERMINAL_OPTIONS}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 4: Keyboard Shortcuts ─────────────────────────────── */}
        <SectionCard
          title="Keyboard Shortcuts"
          description="Reference for all keyboard shortcuts. Uses Cmd on macOS, Ctrl on Windows/Linux."
        >
          <div className="flex flex-col">
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_2fr_1fr] gap-3 px-3 py-2 text-xs font-medium border-b"
              style={{
                color: 'var(--dd-text-muted)',
                borderColor: 'var(--dd-border)',
                fontFamily: 'var(--dd-font-sans)'
              }}
            >
              <span>Shortcut</span>
              <span>Action</span>
              <span>Context</span>
            </div>

            {/* Table rows */}
            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_2fr_1fr] gap-3 px-3 py-2 items-center border-b last:border-b-0"
                style={{ borderColor: 'var(--dd-border)' }}
              >
                <div className="flex items-center gap-1 flex-wrap">
                  {shortcut.keys.map((key, ki) => (
                    <span key={ki} className="flex items-center gap-1">
                      {ki > 0 && key === '/' ? (
                        <span
                          className="text-xs mx-0.5"
                          style={{ color: 'var(--dd-text-muted)' }}
                        >
                          /
                        </span>
                      ) : ki > 0 && key !== '/' ? (
                        <>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--dd-text-muted)' }}
                          >
                            +
                          </span>
                          <Kbd>{key}</Kbd>
                        </>
                      ) : (
                        <Kbd>{key}</Kbd>
                      )}
                    </span>
                  ))}
                </div>
                <span
                  className="text-xs"
                  style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
                >
                  {shortcut.action}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
                >
                  {shortcut.context}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 5: About ──────────────────────────────────────────── */}
        <SectionCard title="About">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-[var(--dd-radius-lg)] flex items-center justify-center"
                style={{ backgroundColor: 'var(--dd-accent)' }}
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: 'var(--dd-text-inverse)' }}
                >
                  D
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--dd-text-primary)', fontFamily: 'var(--dd-font-sans)' }}
                >
                  DevDock
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-mono)' }}
                >
                  v1.0.0
                </span>
              </div>
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--dd-text-secondary)', fontFamily: 'var(--dd-font-sans)' }}
            >
              The Local Development Command Center. Manage projects, monitor ports, orchestrate
              services, and aggregate logs from a single, beautiful interface.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void window.api.openInBrowser('https://github.com/devdock-app/devdock')}
                className="text-xs underline transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:opacity-80"
                style={{ color: 'var(--dd-accent)', fontFamily: 'var(--dd-font-sans)' }}
              >
                GitHub Repository
              </button>
              <button
                onClick={() => void window.api.openInBrowser('https://github.com/devdock-app/devdock/issues')}
                className="text-xs underline transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:opacity-80"
                style={{ color: 'var(--dd-accent)', fontFamily: 'var(--dd-font-sans)' }}
              >
                Report Issue
              </button>
              <button
                onClick={() => void window.api.openInBrowser('https://github.com/devdock-app/devdock/blob/main/LICENSE')}
                className="text-xs underline transition-colors duration-[var(--dd-duration-fast)] cursor-pointer hover:opacity-80"
                style={{ color: 'var(--dd-accent)', fontFamily: 'var(--dd-font-sans)' }}
              >
                MIT License
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Bottom spacer for scroll breathing room */}
        <div className="h-4" />
      </div>
    </div>
  )
}

export { SettingsView }
