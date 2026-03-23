// ─── Shared Type Definitions for DevDock ───────────────────────────────────
// All interfaces and type unions used across main, preload, and renderer.
// This file is the single source of truth for data shapes in the application.

// ─── Enumerations & Unions ─────────────────────────────────────────────────

/** Supported framework identifiers, detected via marker files */
export type Framework =
  | 'next.js'
  | 'vite'
  | 'angular'
  | 'sveltekit'
  | 'node.js'
  | 'django'
  | 'fastapi'
  | 'rails'
  | 'go'
  | 'rust'
  | '.net'
  | 'laravel'
  | 'docker-compose'
  | 'docker'
  | 'unknown'

/** Primary language of the project */
export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'csharp'
  | 'php'
  | 'java'
  | 'unknown'

/** Lifecycle state of a managed project */
export type ProjectStatus = 'running' | 'stopped' | 'starting' | 'error'

/** Log severity level */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

// ─── Health Check (Discriminated Union) ────────────────────────────────────

interface HealthCheckTcp {
  type: 'tcp'
  port: number
}

interface HealthCheckHttp {
  type: 'http'
  url: string
  expectedStatus?: number
}

interface HealthCheckCommand {
  type: 'command'
  cmd: string
}

interface HealthCheckNone {
  type: 'none'
}

/** Health check configuration for stack dependencies */
export type HealthCheck =
  | HealthCheckTcp
  | HealthCheckHttp
  | HealthCheckCommand
  | HealthCheckNone

// ─── Core Entities ─────────────────────────────────────────────────────────

/** Git repository status for a project */
export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  dirty: number
  isRepo: boolean
}

/** A discovered or manually-added development project */
export interface Project {
  id: string
  name: string
  path: string
  framework: Framework
  lang: Language
  port: number
  startCmd: string
  envFile: string | null
  color: string
  isFavorite: boolean
  scanDirId: string
  status: ProjectStatus
  pid: number | null
  uptime: number
  cpu: number
  mem: number
  git: GitStatus | null
}

/** A live TCP/UDP port binding detected on the system */
export interface PortBinding {
  port: number
  protocol: 'tcp' | 'udp'
  pid: number
  processName: string
  command: string
  /** null when the port is not matched to a DevDock-managed project */
  projectId: string | null
}

/** Two or more bindings competing for the same port */
export interface PortConflict {
  port: number
  bindings: PortBinding[]
}

/** A named group of projects launched together in dependency order */
export interface Stack {
  id: string
  name: string
  description: string
  projectIds: string[]
  autoStart: boolean
}

/** An edge in the stack dependency graph */
export interface StackDependency {
  stackId: string
  projectId: string
  dependsOnProjectId: string
  healthCheck: HealthCheck
}

/** A single log line captured from a managed process */
export interface LogEntry {
  id: string
  projectId: string
  timestamp: number
  level: LogLevel
  message: string
  source: 'stdout' | 'stderr'
}

// ─── Theming ───────────────────────────────────────────────────────────────

/** A registered theme (built-in or user-created) */
export interface Theme {
  id: string
  name: string
  type: 'builtin' | 'user'
  /** null for built-in themes bundled in the app */
  filePath: string | null
  /** null if this theme does not inherit from another */
  parentThemeId: string | null
  /** Semantic token overrides — keys are CSS custom property names */
  colors: Record<string, string>
}

// ─── Settings & Configuration ──────────────────────────────────────────────

/** A filesystem directory to scan for project discovery */
export interface ScanDirectory {
  id: string
  path: string
  maxDepth: number
  excludePatterns: string[]
}

/** Top-level application settings */
export interface AppSettings {
  scanDirectories: ScanDirectory[]
  currentThemeId: string
  sidebarCollapsed: boolean
  editor: string
  terminal: string
  logBufferSize: number
  resourceAlertCpu: number
  resourceAlertMem: number
  mcpEnabled: boolean
  autoStartStacks: boolean
}

// ─── Runtime / Monitoring ──────────────────────────────────────────────────

/** A point-in-time CPU/memory sample for a process */
export interface ResourceSnapshot {
  pid: number
  cpu: number
  mem: number
  timestamp: number
}

/** Metadata about a running child process managed by DevDock */
export interface ProcessInfo {
  pid: number
  projectId: string
  startedAt: number
}
