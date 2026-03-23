import { app, BrowserWindow, shell, Tray, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DevDockDatabase } from './db/schema'
import { PortScanner } from './services/PortScanner'
import { ProjectDiscovery } from './services/ProjectDiscovery'
import { ProcessManager } from './services/ProcessManager'
import { GitService } from './services/GitService'
import { LogAggregator } from './services/LogAggregator'
import { ResourceMonitor } from './services/ResourceMonitor'
import { registerIPCHandlers, setupStreamingEvents } from './ipc/handlers'
import { createTray } from './tray'
import { MCPServer } from './mcp/server'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// Initialize services
const db = new DevDockDatabase()
const portScanner = new PortScanner()
const projectDiscovery = new ProjectDiscovery()
const processManager = new ProcessManager()
const gitService = new GitService()
const logAggregator = new LogAggregator()
const resourceMonitor = new ResourceMonitor()

const services = {
  db,
  portScanner,
  projectDiscovery,
  processManager,
  gitService,
  logAggregator,
  resourceMonitor
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'DevDock',
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#1A1B26',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.name = 'DevDock'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.devdock.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set Content Security Policy for production
  if (!is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:"
          ]
        }
      })
    })
  }

  // Register IPC handlers and streaming events
  registerIPCHandlers(services)
  setupStreamingEvents(services, () => mainWindow)

  // Start background services
  portScanner.start()
  resourceMonitor.start()

  createWindow()

  // Create system tray icon with context menu
  tray = createTray(() => mainWindow, processManager)

  // Initialize MCP server (opt-in, controlled by settings)
  const mcpServer = new MCPServer({
    db: db.getDb(),
    portScanner,
    processManager,
    logAggregator,
    resourceMonitor
  })
  void mcpServer

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  portScanner.stop()
  resourceMonitor.stop()
  await processManager.stopAll()
  if (tray) {
    tray.destroy()
    tray = null
  }
  db.close()
})
