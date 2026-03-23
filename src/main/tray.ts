import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import type { ProcessManager } from './services/ProcessManager'

/**
 * Create a 32x32 (@2x retina) tray icon programmatically.
 * Draws a "D" letterform in white on transparent background.
 * scaleFactor=2 means macOS treats this as a 16x16 logical icon.
 */
function createTrayImage(): Electron.NativeImage {
  const S = 32
  const buf = Buffer.alloc(S * S * 4, 0)

  const px = (x: number, y: number): void => {
    if (x >= 0 && x < S && y >= 0 && y < S) {
      const i = (y * S + x) * 4
      buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255; buf[i + 3] = 255
    }
  }

  // Fill a rectangle
  const rect = (x0: number, y0: number, w: number, h: number): void => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        px(x, y)
  }

  // The "D" shape at 32x32
  // Vertical bar: x=7..11, y=5..26
  rect(7, 5, 5, 22)
  // Top horizontal: x=7..20, y=5..9
  rect(7, 5, 14, 5)
  // Bottom horizontal: x=7..20, y=22..26
  rect(7, 22, 14, 5)
  // Right vertical: x=21..25, y=9..22
  rect(21, 9, 5, 14)
  // Top-right corner fill: x=19..22, y=7..10
  rect(19, 7, 4, 3)
  // Bottom-right corner fill: x=19..22, y=20..23
  rect(19, 20, 4, 3)

  // Cut out the inner counter of the D
  // Inner space: x=12..20, y=10..21
  const clear = (x: number, y: number): void => {
    if (x >= 0 && x < S && y >= 0 && y < S) {
      const i = (y * S + x) * 4
      buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0
    }
  }
  const clearRect = (x0: number, y0: number, w: number, h: number): void => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        clear(x, y)
  }
  clearRect(12, 10, 9, 12)
  // Re-add the accent bar inside the counter
  rect(14, 14, 5, 3)

  return nativeImage.createFromBuffer(buf, { width: S, height: S, scaleFactor: 2.0 })
}

export function createTray(
  getMainWindow: () => BrowserWindow | null,
  processManager: ProcessManager
): Tray {
  const icon = createTrayImage()
  const tray = new Tray(icon)
  tray.setToolTip('DevDock')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show DevDock',
      click: (): void => {
        const win = getMainWindow()
        if (win) { win.show(); win.focus() }
      }
    },
    { type: 'separator' },
    {
      label: 'Stop All Services',
      click: async (): Promise<void> => { await processManager.stopAll() }
    },
    { type: 'separator' },
    {
      label: 'Quit DevDock',
      click: (): void => { app.quit() }
    }
  ])

  tray.setContextMenu(contextMenu)

  return tray
}
