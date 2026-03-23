/**
 * IPC Channel Definitions for DevDock
 *
 * This file defines all IPC channel name constants and their typed
 * request/response payloads. Both the main process and renderer
 * import from here to ensure type-safe communication.
 */

import type {
  Project,
  PortBinding,
  PortConflict,
  LogEntry,
  LogLevel,
  Stack,
  ResourceSnapshot,
  GitStatus,
  Theme,
  AppSettings,
  ScanDirectory
} from './types'

// ---------------------------------------------------------------------------
// Channel name constants
// ---------------------------------------------------------------------------

export const IPC = {
  // Projects
  PROJECTS_LIST: 'projects:list',
  PROJECTS_GET: 'projects:get',
  PROJECTS_START: 'projects:start',
  PROJECTS_STOP: 'projects:stop',
  PROJECTS_RESTART: 'projects:restart',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_SCAN: 'projects:scan',
  PROJECTS_TOGGLE_FAVORITE: 'projects:toggle-favorite',

  // Ports
  PORTS_LIST: 'ports:list',
  PORTS_KILL: 'ports:kill',
  PORTS_CONFLICTS: 'ports:conflicts',

  // Logs
  LOGS_GET: 'logs:get',
  LOGS_STREAM: 'logs:stream',
  LOGS_CLEAR: 'logs:clear',
  LOGS_EXPORT: 'logs:export',

  // Stacks
  STACKS_LIST: 'stacks:list',
  STACKS_CREATE: 'stacks:create',
  STACKS_UPDATE: 'stacks:update',
  STACKS_DELETE: 'stacks:delete',
  STACKS_LAUNCH: 'stacks:launch',
  STACKS_STOP: 'stacks:stop',

  // Resources
  RESOURCES_GET: 'resources:get',
  RESOURCES_STREAM: 'resources:stream',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_ADD_SCAN_DIR: 'settings:add-scan-dir',
  SETTINGS_REMOVE_SCAN_DIR: 'settings:remove-scan-dir',

  // Themes
  THEMES_LIST: 'themes:list',
  THEMES_APPLY: 'themes:apply',

  // Git
  GIT_STATUS: 'git:status',

  // System
  SYSTEM_OPEN_IN_EDITOR: 'system:open-in-editor',
  SYSTEM_OPEN_IN_TERMINAL: 'system:open-in-terminal',
  SYSTEM_OPEN_IN_BROWSER: 'system:open-in-browser',

  // Streaming events (main -> renderer)
  EVENT_PROJECT_STATUS: 'event:project-status',
  EVENT_PORT_UPDATE: 'event:port-update',
  EVENT_LOG_LINE: 'event:log-line',
  EVENT_RESOURCE_UPDATE: 'event:resource-update'
} as const

/** Union of every IPC channel string literal */
export type IPCChannel = (typeof IPC)[keyof typeof IPC]

// ---------------------------------------------------------------------------
// Request / Response payload map for invoke-style channels
// ---------------------------------------------------------------------------

export interface IPCPayloads {
  // Projects
  [IPC.PROJECTS_LIST]: { request: void; response: Project[] }
  [IPC.PROJECTS_GET]: { request: { id: string }; response: Project | null }
  [IPC.PROJECTS_START]: {
    request: { id: string }
    response: { success: boolean; error?: string }
  }
  [IPC.PROJECTS_STOP]: {
    request: { id: string }
    response: { success: boolean }
  }
  [IPC.PROJECTS_RESTART]: {
    request: { id: string }
    response: { success: boolean; error?: string }
  }
  [IPC.PROJECTS_UPDATE]: {
    request: { id: string; updates: Partial<Project> }
    response: Project
  }
  [IPC.PROJECTS_SCAN]: { request: void; response: Project[] }
  [IPC.PROJECTS_TOGGLE_FAVORITE]: { request: { id: string }; response: Project }

  // Ports
  [IPC.PORTS_LIST]: { request: void; response: PortBinding[] }
  [IPC.PORTS_KILL]: {
    request: { port: number }
    response: { success: boolean }
  }
  [IPC.PORTS_CONFLICTS]: { request: void; response: PortConflict[] }

  // Logs
  [IPC.LOGS_GET]: {
    request: {
      projectId?: string
      level?: LogLevel
      search?: string
      limit?: number
    }
    response: LogEntry[]
  }
  [IPC.LOGS_CLEAR]: { request: { projectId?: string }; response: void }
  [IPC.LOGS_EXPORT]: {
    request: { projectId?: string; format: 'log' | 'json' }
    response: string
  }

  // Stacks
  [IPC.STACKS_LIST]: { request: void; response: Stack[] }
  [IPC.STACKS_CREATE]: { request: Omit<Stack, 'id'>; response: Stack }
  [IPC.STACKS_UPDATE]: {
    request: { id: string; updates: Partial<Stack> }
    response: Stack
  }
  [IPC.STACKS_DELETE]: { request: { id: string }; response: void }
  [IPC.STACKS_LAUNCH]: {
    request: { id: string }
    response: { success: boolean; error?: string }
  }
  [IPC.STACKS_STOP]: {
    request: { id: string }
    response: { success: boolean }
  }

  // Resources
  [IPC.RESOURCES_GET]: {
    request: void
    response: Record<string, ResourceSnapshot[]>
  }

  // Settings
  [IPC.SETTINGS_GET]: { request: void; response: AppSettings }
  [IPC.SETTINGS_UPDATE]: {
    request: Partial<AppSettings>
    response: AppSettings
  }
  [IPC.SETTINGS_ADD_SCAN_DIR]: {
    request: { path: string; maxDepth?: number }
    response: ScanDirectory
  }
  [IPC.SETTINGS_REMOVE_SCAN_DIR]: { request: { id: string }; response: void }

  // Themes
  [IPC.THEMES_LIST]: { request: void; response: Theme[] }
  [IPC.THEMES_APPLY]: { request: { id: string }; response: Theme }

  // Git
  [IPC.GIT_STATUS]: {
    request: { projectPath: string }
    response: GitStatus
  }

  // System
  [IPC.SYSTEM_OPEN_IN_EDITOR]: { request: { path: string }; response: void }
  [IPC.SYSTEM_OPEN_IN_TERMINAL]: {
    request: { path: string }
    response: void
  }
  [IPC.SYSTEM_OPEN_IN_BROWSER]: { request: { url: string }; response: void }
}

// ---------------------------------------------------------------------------
// Streaming event payloads (main -> renderer, pushed via webContents.send)
// ---------------------------------------------------------------------------

export interface IPCEvents {
  [IPC.EVENT_PROJECT_STATUS]: {
    projectId: string
    status: Project['status']
    pid?: number | null
  }
  [IPC.EVENT_PORT_UPDATE]: { ports: PortBinding[] }
  [IPC.EVENT_LOG_LINE]: LogEntry
  [IPC.EVENT_RESOURCE_UPDATE]: {
    projectId: string
    snapshot: ResourceSnapshot
  }
}

// ---------------------------------------------------------------------------
// Utility types for type-safe IPC wiring
// ---------------------------------------------------------------------------

/** Extract the request type for a given invoke channel */
export type IPCRequest<C extends keyof IPCPayloads> = IPCPayloads[C]['request']

/** Extract the response type for a given invoke channel */
export type IPCResponse<C extends keyof IPCPayloads> = IPCPayloads[C]['response']

/** Extract the event payload type for a given streaming channel */
export type IPCEventPayload<C extends keyof IPCEvents> = IPCEvents[C]
