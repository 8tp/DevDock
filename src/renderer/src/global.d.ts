/** API exposed by the preload script via contextBridge */
interface DevDockAPI {
  // Projects
  listProjects: () => Promise<any>
  getProject: (id: string) => Promise<any>
  startProject: (id: string) => Promise<any>
  stopProject: (id: string) => Promise<any>
  restartProject: (id: string) => Promise<any>
  updateProject: (id: string, updates: Record<string, unknown>) => Promise<any>
  scanProjects: () => Promise<any>
  toggleFavorite: (id: string) => Promise<any>

  // Ports
  listPorts: () => Promise<any>
  killPort: (port: number) => Promise<any>
  getPortConflicts: () => Promise<any>

  // Logs
  getLogs: (options?: { projectId?: string; level?: string; search?: string; limit?: number }) => Promise<any>
  clearLogs: (projectId?: string) => Promise<any>
  exportLogs: (options?: { projectId?: string; format: 'log' | 'json' }) => Promise<any>

  // Stacks
  listStacks: () => Promise<any>
  createStack: (data: { name: string; description: string; projectIds: string[]; autoStart: boolean }) => Promise<any>
  updateStack: (id: string, updates: Record<string, unknown>) => Promise<any>
  deleteStack: (id: string) => Promise<any>
  launchStack: (id: string) => Promise<any>
  stopStack: (id: string) => Promise<any>

  // Resources
  getResources: () => Promise<any>

  // Settings
  getSettings: () => Promise<any>
  updateSettings: (updates: Record<string, unknown>) => Promise<any>
  addScanDirectory: (path: string, maxDepth?: number) => Promise<any>
  removeScanDirectory: (id: string) => Promise<any>

  // Themes
  listThemes: () => Promise<any>
  applyTheme: (id: string) => Promise<any>

  // Git
  getGitStatus: (projectPath: string) => Promise<any>

  // System
  openInEditor: (path: string) => Promise<any>
  openInTerminal: (path: string) => Promise<any>
  openInBrowser: (url: string) => Promise<any>
  pickDirectory: () => Promise<string | null>

  // Event subscriptions
  onProjectStatus: (callback: (data: unknown) => void) => () => void
  onPortUpdate: (callback: (data: unknown) => void) => () => void
  onLogLine: (callback: (data: unknown) => void) => () => void
  onResourceUpdate: (callback: (data: unknown) => void) => () => void
}

declare global {
  interface Window {
    api: DevDockAPI
  }
}

export {}
