import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { LogLevel } from '../shared/types'

// Type-safe invoke helper
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args)
}

const api = {
  // Projects
  listProjects: () => invoke(IPC.PROJECTS_LIST),
  getProject: (id: string) => invoke(IPC.PROJECTS_GET, { id }),
  startProject: (id: string) => invoke(IPC.PROJECTS_START, { id }),
  stopProject: (id: string) => invoke(IPC.PROJECTS_STOP, { id }),
  restartProject: (id: string) => invoke(IPC.PROJECTS_RESTART, { id }),
  updateProject: (id: string, updates: Record<string, unknown>) => invoke(IPC.PROJECTS_UPDATE, { id, updates }),
  scanProjects: () => invoke(IPC.PROJECTS_SCAN),
  toggleFavorite: (id: string) => invoke(IPC.PROJECTS_TOGGLE_FAVORITE, { id }),

  // Ports
  listPorts: () => invoke(IPC.PORTS_LIST),
  killPort: (port: number) => invoke(IPC.PORTS_KILL, { port }),
  getPortConflicts: () => invoke(IPC.PORTS_CONFLICTS),

  // Logs
  getLogs: (options?: { projectId?: string; level?: LogLevel; search?: string; limit?: number }) => invoke(IPC.LOGS_GET, options),
  clearLogs: (projectId?: string) => invoke(IPC.LOGS_CLEAR, { projectId }),
  exportLogs: (options?: { projectId?: string; format: 'log' | 'json' }) => invoke(IPC.LOGS_EXPORT, options),

  // Stacks
  listStacks: () => invoke(IPC.STACKS_LIST),
  createStack: (data: { name: string; description: string; projectIds: string[]; autoStart: boolean }) => invoke(IPC.STACKS_CREATE, data),
  updateStack: (id: string, updates: Record<string, unknown>) => invoke(IPC.STACKS_UPDATE, { id, updates }),
  deleteStack: (id: string) => invoke(IPC.STACKS_DELETE, { id }),
  launchStack: (id: string) => invoke(IPC.STACKS_LAUNCH, { id }),
  stopStack: (id: string) => invoke(IPC.STACKS_STOP, { id }),

  // Resources
  getResources: () => invoke(IPC.RESOURCES_GET),

  // Settings
  getSettings: () => invoke(IPC.SETTINGS_GET),
  updateSettings: (updates: Record<string, unknown>) => invoke(IPC.SETTINGS_UPDATE, updates),
  addScanDirectory: (path: string, maxDepth?: number) => invoke(IPC.SETTINGS_ADD_SCAN_DIR, { path, maxDepth }),
  removeScanDirectory: (id: string) => invoke(IPC.SETTINGS_REMOVE_SCAN_DIR, { id }),

  // Themes
  listThemes: () => invoke(IPC.THEMES_LIST),
  applyTheme: (id: string) => invoke(IPC.THEMES_APPLY, { id }),

  // Git
  getGitStatus: (projectPath: string) => invoke(IPC.GIT_STATUS, { projectPath }),

  // System
  openInEditor: (path: string) => invoke(IPC.SYSTEM_OPEN_IN_EDITOR, { path }),
  openInTerminal: (path: string) => invoke(IPC.SYSTEM_OPEN_IN_TERMINAL, { path }),
  openInBrowser: (url: string) => invoke(IPC.SYSTEM_OPEN_IN_BROWSER, { url }),
  pickDirectory: () => invoke<string | null>('system:pick-directory'),

  // Event subscriptions (streaming from main process)
  onProjectStatus: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EVENT_PROJECT_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_PROJECT_STATUS, handler)
  },
  onPortUpdate: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EVENT_PORT_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_PORT_UPDATE, handler)
  },
  onLogLine: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EVENT_LOG_LINE, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_LOG_LINE, handler)
  },
  onResourceUpdate: (callback: (data: unknown) => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data)
    ipcRenderer.on(IPC.EVENT_RESOURCE_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC.EVENT_RESOURCE_UPDATE, handler)
  }
}

export type DevDockAPI = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
