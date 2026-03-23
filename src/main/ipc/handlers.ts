import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { spawn } from 'child_process'
import { IPC } from '@shared/ipc-channels'
import type { DevDockDatabase } from '../db/schema'
import type { PortScanner } from '../services/PortScanner'
import type { ProjectDiscovery } from '../services/ProjectDiscovery'
import type { ProcessManager } from '../services/ProcessManager'
import type { GitService } from '../services/GitService'
import type { LogAggregator } from '../services/LogAggregator'
import type { ResourceMonitor } from '../services/ResourceMonitor'
import * as queries from '../db/queries'

interface Services {
  db: DevDockDatabase
  portScanner: PortScanner
  projectDiscovery: ProjectDiscovery
  processManager: ProcessManager
  gitService: GitService
  logAggregator: LogAggregator
  resourceMonitor: ResourceMonitor
}

export function registerIPCHandlers(services: Services): void {
  const { db, portScanner, projectDiscovery, processManager, gitService, logAggregator, resourceMonitor } = services
  const database = db.getDb()

  // Projects
  ipcMain.handle(IPC.PROJECTS_LIST, async () => {
    const projects = queries.listProjects(database)
    // Enrich with runtime state
    for (const project of projects) {
      const info = processManager.getProcessInfo(project.id)
      if (info) {
        project.status = 'running'
        project.pid = info.pid
        project.uptime = Date.now() - info.startedAt
      }
      // Enrich with git status
      try {
        project.git = await gitService.getStatus(project.path)
      } catch {
        project.git = null
      }
      // Enrich with resource data
      const history = resourceMonitor.getHistory(project.id)
      if (history.length > 0) {
        const latest = history[history.length - 1]
        project.cpu = latest.cpu
        project.mem = latest.mem
      }
    }
    return projects
  })

  ipcMain.handle(IPC.PROJECTS_GET, async (_event, { id }: { id: string }) => {
    const project = queries.getProject(database, id)
    if (!project) return null
    // Same enrichment as above
    const info = processManager.getProcessInfo(id)
    if (info) {
      project.status = 'running'
      project.pid = info.pid
      project.uptime = Date.now() - info.startedAt
    }
    try {
      project.git = await gitService.getStatus(project.path)
    } catch { project.git = null }
    return project
  })

  ipcMain.handle(IPC.PROJECTS_START, async (_event, { id }: { id: string }) => {
    const project = queries.getProject(database, id)
    if (!project) return { success: false, error: 'Project not found' }
    try {
      const { pid } = await processManager.start(project)
      resourceMonitor.trackProcess(id, pid)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.PROJECTS_STOP, async (_event, { id }: { id: string }) => {
    await processManager.stop(id)
    resourceMonitor.untrackProcess(id)
    return { success: true }
  })

  ipcMain.handle(IPC.PROJECTS_RESTART, async (_event, { id }: { id: string }) => {
    const project = queries.getProject(database, id)
    if (!project) return { success: false, error: 'Project not found' }
    try {
      resourceMonitor.untrackProcess(id)
      const { pid } = await processManager.restart(project)
      resourceMonitor.trackProcess(id, pid)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.PROJECTS_UPDATE, (_event, { id, updates }: { id: string; updates: Record<string, unknown> }) => {
    return queries.updateProject(database, id, updates)
  })

  ipcMain.handle(IPC.PROJECTS_SCAN, async () => {
    const scanDirs = queries.listScanDirectories(database)
    const discovered = await projectDiscovery.discover(scanDirs)
    const projects = []
    for (const d of discovered) {
      const project = queries.upsertProject(database, {
        id: crypto.randomUUID(),
        name: d.name,
        path: d.path,
        framework: d.framework,
        lang: d.lang,
        port: d.port,
        startCmd: d.startCmd,
        envFile: d.envFile,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })
      projects.push(project)
    }
    return projects
  })

  ipcMain.handle(IPC.PROJECTS_TOGGLE_FAVORITE, (_event, { id }: { id: string }) => {
    return queries.toggleFavorite(database, id)
  })

  // Ports
  ipcMain.handle(IPC.PORTS_LIST, () => {
    return portScanner.getPorts()
  })

  ipcMain.handle(IPC.PORTS_KILL, async (_event, { port }: { port: number }) => {
    const success = await portScanner.killPort(port)
    return { success }
  })

  ipcMain.handle(IPC.PORTS_CONFLICTS, () => {
    const projects = queries.listProjects(database)
    return portScanner.findConflicts(projects.map(p => ({ id: p.id, port: p.port })))
  })

  // Logs
  ipcMain.handle(IPC.LOGS_GET, (_event, options) => {
    return logAggregator.getLines(options)
  })

  ipcMain.handle(IPC.LOGS_CLEAR, (_event, options) => {
    logAggregator.clear(options?.projectId)
  })

  ipcMain.handle(IPC.LOGS_EXPORT, (_event, options) => {
    return logAggregator.export(options)
  })

  // Stacks
  ipcMain.handle(IPC.STACKS_LIST, () => queries.listStacks(database))
  ipcMain.handle(IPC.STACKS_CREATE, (_event, data) => queries.createStack(database, data))
  ipcMain.handle(IPC.STACKS_UPDATE, (_event, { id, updates }) => queries.updateStack(database, id, updates))
  ipcMain.handle(IPC.STACKS_DELETE, (_event, { id }) => queries.deleteStack(database, id))

  ipcMain.handle(IPC.STACKS_LAUNCH, async (_event, { id }: { id: string }) => {
    const stacks = queries.listStacks(database)
    const stack = stacks.find(s => s.id === id)
    if (!stack) return { success: false, error: 'Stack not found' }
    try {
      for (const projectId of stack.projectIds) {
        const project = queries.getProject(database, projectId)
        if (project && project.status !== 'running') {
          const { pid } = await processManager.start(project)
          resourceMonitor.trackProcess(projectId, pid)
        }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.STACKS_STOP, async (_event, { id }: { id: string }) => {
    const stacks = queries.listStacks(database)
    const stack = stacks.find(s => s.id === id)
    if (!stack) return { success: false }
    for (const projectId of stack.projectIds) {
      await processManager.stop(projectId)
      resourceMonitor.untrackProcess(projectId)
    }
    return { success: true }
  })

  // Resources
  ipcMain.handle(IPC.RESOURCES_GET, () => resourceMonitor.getAllHistory())

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    // Build AppSettings from individual settings
    const scanDirs = queries.listScanDirectories(database)
    return {
      scanDirectories: scanDirs,
      currentThemeId: queries.getSetting(database, 'currentThemeId') || 'tokyo-night',
      sidebarCollapsed: queries.getSetting(database, 'sidebarCollapsed') === 'true',
      editor: queries.getSetting(database, 'editor') || 'code',
      terminal: queries.getSetting(database, 'terminal') || 'default',
      logBufferSize: parseInt(queries.getSetting(database, 'logBufferSize') || '10000'),
      resourceAlertCpu: parseInt(queries.getSetting(database, 'resourceAlertCpu') || '90'),
      resourceAlertMem: parseInt(queries.getSetting(database, 'resourceAlertMem') || '512'),
      mcpEnabled: queries.getSetting(database, 'mcpEnabled') === 'true',
      autoStartStacks: queries.getSetting(database, 'autoStartStacks') === 'true'
    }
  })

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_event, updates) => {
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'scanDirectories') {
        queries.setSetting(database, key, String(value))
      }
    }
    // Return full settings
    const scanDirs = queries.listScanDirectories(database)
    return {
      scanDirectories: scanDirs,
      currentThemeId: queries.getSetting(database, 'currentThemeId') || 'tokyo-night',
      sidebarCollapsed: queries.getSetting(database, 'sidebarCollapsed') === 'true',
      editor: queries.getSetting(database, 'editor') || 'code',
      terminal: queries.getSetting(database, 'terminal') || 'default',
      logBufferSize: parseInt(queries.getSetting(database, 'logBufferSize') || '10000'),
      resourceAlertCpu: parseInt(queries.getSetting(database, 'resourceAlertCpu') || '90'),
      resourceAlertMem: parseInt(queries.getSetting(database, 'resourceAlertMem') || '512'),
      mcpEnabled: queries.getSetting(database, 'mcpEnabled') === 'true',
      autoStartStacks: queries.getSetting(database, 'autoStartStacks') === 'true'
    }
  })

  ipcMain.handle(IPC.SETTINGS_ADD_SCAN_DIR, (_event, { path, maxDepth }) => {
    return queries.addScanDirectory(database, path, maxDepth)
  })

  ipcMain.handle(IPC.SETTINGS_REMOVE_SCAN_DIR, (_event, { id }) => {
    queries.removeScanDirectory(database, id)
  })

  // Themes
  ipcMain.handle(IPC.THEMES_LIST, () => queries.listThemes(database))
  ipcMain.handle(IPC.THEMES_APPLY, (_event, { id }) => {
    queries.setSetting(database, 'currentThemeId', id)
    const themes = queries.listThemes(database)
    return themes.find(t => t.id === id) || themes[0]
  })

  // Git
  ipcMain.handle(IPC.GIT_STATUS, async (_event, { projectPath }) => {
    return gitService.getStatus(projectPath)
  })

  // System
  ipcMain.handle(IPC.SYSTEM_OPEN_IN_EDITOR, (_event, { path }) => {
    const editor = queries.getSetting(database, 'editor') || 'code'
    spawn(editor, [path], { detached: true, stdio: 'ignore' }).unref()
  })

  ipcMain.handle(IPC.SYSTEM_OPEN_IN_TERMINAL, (_event, { path }) => {
    if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', path], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', 'cmd', '/K', `cd /d "${path}"`], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('x-terminal-emulator', ['--working-directory', path], { detached: true, stdio: 'ignore' }).unref()
    }
  })

  ipcMain.handle(IPC.SYSTEM_OPEN_IN_BROWSER, (_event, { url }) => {
    shell.openExternal(url)
  })

  // Native directory picker
  ipcMain.handle('system:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a directory to scan for projects'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}

export function setupStreamingEvents(services: Services, getMainWindow: () => BrowserWindow | null): void {
  const { processManager, portScanner, logAggregator, resourceMonitor } = services

  processManager.on('output', ({ projectId, data, source }) => {
    logAggregator.addLine(projectId, data, source)
  })

  processManager.on('started', ({ projectId, pid }) => {
    getMainWindow()?.webContents.send(IPC.EVENT_PROJECT_STATUS, { projectId, status: 'running', pid })
  })

  processManager.on('stopped', ({ projectId }) => {
    getMainWindow()?.webContents.send(IPC.EVENT_PROJECT_STATUS, { projectId, status: 'stopped', pid: null })
  })

  processManager.on('error', ({ projectId }) => {
    getMainWindow()?.webContents.send(IPC.EVENT_PROJECT_STATUS, { projectId, status: 'error', pid: null })
  })

  portScanner.on('update', (ports) => {
    getMainWindow()?.webContents.send(IPC.EVENT_PORT_UPDATE, { ports })
  })

  logAggregator.on('line', (entry) => {
    getMainWindow()?.webContents.send(IPC.EVENT_LOG_LINE, entry)
  })

  resourceMonitor.on('snapshot', ({ projectId, snapshot }) => {
    getMainWindow()?.webContents.send(IPC.EVENT_RESOURCE_UPDATE, { projectId, snapshot })
  })
}
