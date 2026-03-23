// ─── Tray Icon & Context Menu ────────────────────────────────────────────────
// Creates a system tray icon with a context menu for quick access to DevDock.
// On macOS, clicking the tray icon toggles the main window visibility.
// The tray provides "Stop All Services" and "Quit" actions.

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import type { ProcessManager } from './services/ProcessManager'

// ─── Tray Creation ──────────────────────────────────────────────────────────

/**
 * Create the system tray icon and wire up its context menu.
 *
 * @param getMainWindow  Getter for the current main BrowserWindow (may be null)
 * @param processManager ProcessManager instance for the "Stop All" action
 * @returns              The Electron Tray instance (caller should keep a reference
 *                       to prevent garbage-collection)
 */
export function createTray(
  getMainWindow: () => BrowserWindow | null,
  processManager: ProcessManager,
  iconPath: string
): Tray {
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true)
  const tray = new Tray(icon)

  tray.setToolTip('DevDock')

  // ── Context Menu ────────────────────────────────────────────────────────
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show DevDock',
      click: (): void => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Stop All Services',
      click: async (): Promise<void> => {
        await processManager.stopAll()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit DevDock',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // ── Click-to-toggle (primarily useful on macOS) ─────────────────────────
  tray.on('click', () => {
    const win = getMainWindow()
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    }
  })

  return tray
}
