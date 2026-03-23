// ─── MCP Tool Definitions ───────────────────────────────────────────────────
// Defines and implements the 8 MCP tools exposed by DevDock.
// Based on PRD Section 6.7 — MCP Server Integration.
//
// Tools:
//   1. list_projects     — Returns all tracked projects with status, port, git info
//   2. start_project     — Starts a project by name
//   3. stop_project      — Stops a project by name
//   4. get_port_map      — Returns all port bindings on the local machine
//   5. kill_port         — Kills the process on a given port
//   6. get_logs          — Returns recent logs, optionally filtered
//   7. launch_stack      — Launches a named stack
//   8. get_resource_usage — Returns CPU and memory usage for all managed services
// ────────────────────────────────────────────────────────────────────────────

import type BetterSqlite3 from 'better-sqlite3'
import type { PortScanner } from '../services/PortScanner'
import type { ProcessManager } from '../services/ProcessManager'
import type { LogAggregator } from '../services/LogAggregator'
import type { ResourceMonitor } from '../services/ResourceMonitor'
import type { Project, LogLevel } from '../../shared/types'
import * as queries from '../db/queries'

// ─── Types ──────────────────────────────────────────────────────────────────

/** Services required for tool execution, passed from the MCP server */
export interface MCPServices {
  db: BetterSqlite3.Database
  portScanner: PortScanner
  processManager: ProcessManager
  logAggregator: LogAggregator
  resourceMonitor: ResourceMonitor
}

/** JSON Schema property definition for a tool parameter */
interface ToolProperty {
  type: string
  description: string
  enum?: string[]
}

/** MCP tool definition returned by tools/list */
interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, ToolProperty>
    required?: string[]
  }
}

// ─── Tool Registry ──────────────────────────────────────────────────────────

/**
 * Returns the complete list of MCP tool definitions.
 * These are sent to the client in response to `tools/list`.
 */
export function getTools(): MCPTool[] {
  return [
    {
      name: 'list_projects',
      description:
        'Returns all tracked projects with their current status, port, framework, language, and git info. Use this to see what projects are available and which are running.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'start_project',
      description:
        'Starts a project by name. The project must be registered in DevDock. Returns the PID of the started process.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The project name to start (case-insensitive match)'
          }
        },
        required: ['name']
      }
    },
    {
      name: 'stop_project',
      description:
        'Stops a running project by name. Sends SIGTERM and escalates to SIGKILL if the process does not exit within the timeout.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The project name to stop (case-insensitive match)'
          }
        },
        required: ['name']
      }
    },
    {
      name: 'get_port_map',
      description:
        'Returns all TCP port bindings currently active on the local machine, including the PID, process name, and associated project (if any).',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'kill_port',
      description:
        'Kills the process tree occupying a given TCP port. Returns whether the kill was successful.',
      inputSchema: {
        type: 'object',
        properties: {
          port: {
            type: 'number',
            description: 'The TCP port number whose occupying process should be killed'
          }
        },
        required: ['port']
      }
    },
    {
      name: 'get_logs',
      description:
        'Returns recent log lines from managed processes. Supports filtering by project name, log level, and result count limit.',
      inputSchema: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            description: 'Filter logs to a specific project name (case-insensitive match)'
          },
          level: {
            type: 'string',
            description: 'Filter by log severity level',
            enum: ['info', 'warn', 'error', 'debug']
          },
          limit: {
            type: 'number',
            description: 'Maximum number of log lines to return (default: 100)'
          }
        }
      }
    },
    {
      name: 'launch_stack',
      description:
        'Launches all projects in a named stack in dependency order. Returns the status of each project after launch.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The stack name to launch (case-insensitive match)'
          }
        },
        required: ['name']
      }
    },
    {
      name: 'get_resource_usage',
      description:
        'Returns CPU and memory usage for all currently managed services, plus aggregate totals.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}

// ─── Tool Execution ─────────────────────────────────────────────────────────

/**
 * Execute a named MCP tool with the given arguments.
 *
 * @param name - The tool name (must match one of the registered tools)
 * @param args - The tool arguments (validated against the inputSchema by the caller)
 * @param services - Injected DevDock services for accessing state and performing actions
 * @returns The tool result, serialized to JSON by the server
 * @throws Error if the tool name is unknown or execution fails
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  services: MCPServices
): Promise<unknown> {
  switch (name) {
    case 'list_projects':
      return executeListProjects(services)

    case 'start_project':
      return executeStartProject(args, services)

    case 'stop_project':
      return executeStopProject(args, services)

    case 'get_port_map':
      return executeGetPortMap(services)

    case 'kill_port':
      return executeKillPort(args, services)

    case 'get_logs':
      return executeGetLogs(args, services)

    case 'launch_stack':
      return executeLaunchStack(args, services)

    case 'get_resource_usage':
      return executeGetResourceUsage(services)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ─── Tool Implementations ───────────────────────────────────────────────────

/**
 * list_projects: Fetches all projects from the database and enriches them
 * with runtime state (running/stopped, PID, resource usage).
 */
function executeListProjects(services: MCPServices): unknown {
  const { db, processManager, resourceMonitor } = services
  const projects = queries.listProjects(db)

  return {
    projects: projects.map((project) => enrichProjectWithRuntime(project, processManager, resourceMonitor))
  }
}

/**
 * start_project: Finds a project by name (case-insensitive) and starts it.
 */
async function executeStartProject(
  args: Record<string, unknown>,
  services: MCPServices
): Promise<unknown> {
  const { db, processManager } = services
  const name = args.name as string

  const project = findProjectByName(db, name)
  if (!project) {
    throw new Error(`Project not found: "${name}"`)
  }

  // Check if already running
  if (processManager.isRunning(project.id)) {
    const info = processManager.getProcessInfo(project.id)
    return {
      status: 'already_running',
      project: project.name,
      pid: info?.pid ?? null,
      message: `Project "${project.name}" is already running (PID: ${info?.pid})`
    }
  }

  const { pid } = await processManager.start(project)

  return {
    status: 'started',
    project: project.name,
    pid,
    message: `Project "${project.name}" started successfully (PID: ${pid})`
  }
}

/**
 * stop_project: Finds a project by name (case-insensitive) and stops it.
 */
async function executeStopProject(
  args: Record<string, unknown>,
  services: MCPServices
): Promise<unknown> {
  const { db, processManager } = services
  const name = args.name as string

  const project = findProjectByName(db, name)
  if (!project) {
    throw new Error(`Project not found: "${name}"`)
  }

  if (!processManager.isRunning(project.id)) {
    return {
      status: 'already_stopped',
      project: project.name,
      message: `Project "${project.name}" is not currently running`
    }
  }

  await processManager.stop(project.id)

  return {
    status: 'stopped',
    project: project.name,
    message: `Project "${project.name}" stopped successfully`
  }
}

/**
 * get_port_map: Returns all TCP port bindings currently detected on the system.
 */
function executeGetPortMap(services: MCPServices): unknown {
  const { portScanner } = services
  const ports = portScanner.getPorts()

  return {
    ports: ports.map((binding) => ({
      port: binding.port,
      protocol: binding.protocol,
      pid: binding.pid,
      processName: binding.processName,
      command: binding.command,
      projectId: binding.projectId
    })),
    count: ports.length
  }
}

/**
 * kill_port: Kills the process tree occupying the specified port.
 */
async function executeKillPort(
  args: Record<string, unknown>,
  services: MCPServices
): Promise<unknown> {
  const { portScanner } = services
  const port = args.port as number

  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Must be an integer between 1 and 65535.`)
  }

  // Check if anything is on that port
  const ports = portScanner.getPorts()
  const binding = ports.find((b) => b.port === port)

  if (!binding) {
    return {
      success: false,
      port,
      message: `No process found listening on port ${port}`
    }
  }

  const killed = await portScanner.killPort(port)

  return {
    success: killed,
    port,
    pid: binding.pid,
    processName: binding.processName,
    message: killed
      ? `Killed process "${binding.processName}" (PID: ${binding.pid}) on port ${port}`
      : `Failed to kill process on port ${port}`
  }
}

/**
 * get_logs: Returns recent log entries, optionally filtered by project and level.
 */
function executeGetLogs(
  args: Record<string, unknown>,
  services: MCPServices
): unknown {
  const { db, logAggregator } = services

  // Resolve project name to project ID if provided
  let projectId: string | undefined
  if (args.project !== undefined) {
    const projectName = args.project as string
    const project = findProjectByName(db, projectName)
    if (!project) {
      throw new Error(`Project not found: "${projectName}"`)
    }
    projectId = project.id
  }

  const level = args.level as LogLevel | undefined
  const limit = typeof args.limit === 'number' ? args.limit : 100

  // Validate level if provided
  if (level !== undefined) {
    const validLevels: LogLevel[] = ['info', 'warn', 'error', 'debug']
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid log level: "${level}". Must be one of: ${validLevels.join(', ')}`)
    }
  }

  const entries = logAggregator.getLines({
    projectId,
    level,
    limit
  })

  return {
    logs: entries.map((entry) => ({
      id: entry.id,
      projectId: entry.projectId,
      timestamp: new Date(entry.timestamp).toISOString(),
      level: entry.level,
      message: entry.message,
      source: entry.source
    })),
    count: entries.length,
    filters: {
      project: args.project ?? null,
      level: level ?? null,
      limit
    }
  }
}

/**
 * launch_stack: Finds a stack by name and launches all its projects in order.
 * Projects are started sequentially to respect dependency ordering.
 */
async function executeLaunchStack(
  args: Record<string, unknown>,
  services: MCPServices
): Promise<unknown> {
  const { db, processManager } = services
  const name = args.name as string

  // Find the stack by name (case-insensitive)
  const stacks = queries.listStacks(db)
  const stack = stacks.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  )

  if (!stack) {
    const available = stacks.map((s) => s.name)
    throw new Error(
      `Stack not found: "${name}". Available stacks: ${available.length > 0 ? available.join(', ') : '(none)'}`
    )
  }

  // Resolve project IDs to full project objects
  const projects: Project[] = []
  const missingIds: string[] = []

  for (const projectId of stack.projectIds) {
    const project = queries.getProject(db, projectId)
    if (project) {
      projects.push(project)
    } else {
      missingIds.push(projectId)
    }
  }

  if (missingIds.length > 0) {
    throw new Error(
      `Stack "${stack.name}" references missing project IDs: ${missingIds.join(', ')}`
    )
  }

  // Launch projects sequentially in the order defined by the stack.
  // This respects the dependency ordering specified when the stack was created.
  const results: Array<{
    project: string
    status: 'started' | 'already_running' | 'error'
    pid: number | null
    error: string | null
  }> = []

  for (const project of projects) {
    try {
      if (processManager.isRunning(project.id)) {
        const info = processManager.getProcessInfo(project.id)
        results.push({
          project: project.name,
          status: 'already_running',
          pid: info?.pid ?? null,
          error: null
        })
      } else {
        const { pid } = await processManager.start(project)
        results.push({
          project: project.name,
          status: 'started',
          pid,
          error: null
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({
        project: project.name,
        status: 'error',
        pid: null,
        error: message
      })
    }
  }

  const startedCount = results.filter((r) => r.status === 'started').length
  const alreadyRunningCount = results.filter((r) => r.status === 'already_running').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return {
    stack: stack.name,
    results,
    summary: {
      total: projects.length,
      started: startedCount,
      alreadyRunning: alreadyRunningCount,
      errors: errorCount,
      message: `Stack "${stack.name}": ${startedCount} started, ${alreadyRunningCount} already running, ${errorCount} failed`
    }
  }
}

/**
 * get_resource_usage: Returns per-project resource snapshots and aggregate totals.
 */
function executeGetResourceUsage(services: MCPServices): unknown {
  const { resourceMonitor, processManager, db } = services

  const aggregates = resourceMonitor.getAggregates()
  const allHistory = resourceMonitor.getAllHistory()
  const allProcesses = processManager.getAllProcesses()

  // Build per-project resource info with the latest snapshot
  const perProject: Array<{
    projectId: string
    projectName: string
    pid: number
    cpu: number
    mem: number
    uptime: number
  }> = []

  for (const [projectId, info] of allProcesses) {
    const history = allHistory[projectId]
    const latest = history && history.length > 0 ? history[history.length - 1] : null

    // Resolve project name from DB
    const project = queries.getProject(db, projectId)
    const projectName = project?.name ?? projectId

    perProject.push({
      projectId,
      projectName,
      pid: info.pid,
      cpu: latest?.cpu ?? 0,
      mem: latest?.mem ?? 0,
      uptime: Date.now() - info.startedAt
    })
  }

  // Sort by memory usage descending (most resource-hungry first)
  perProject.sort((a, b) => b.mem - a.mem)

  return {
    processes: perProject,
    totals: {
      cpu: Math.round(aggregates.totalCpu * 10) / 10,
      mem: Math.round(aggregates.totalMem * 10) / 10,
      processCount: aggregates.processCount
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find a project by name using a case-insensitive match.
 * Returns the first matching project, or null if not found.
 */
function findProjectByName(
  db: BetterSqlite3.Database,
  name: string
): Project | null {
  const projects = queries.listProjects(db)
  const lowerName = name.toLowerCase()

  // Exact case-insensitive match first
  const exact = projects.find((p) => p.name.toLowerCase() === lowerName)
  if (exact) return exact

  // Partial match as fallback (name contains the search term)
  const partial = projects.find((p) => p.name.toLowerCase().includes(lowerName))
  return partial ?? null
}

/**
 * Enrich a database Project with live runtime state from ProcessManager
 * and ResourceMonitor.
 */
function enrichProjectWithRuntime(
  project: Project,
  processManager: ProcessManager,
  resourceMonitor: ResourceMonitor
): Record<string, unknown> {
  const isRunning = processManager.isRunning(project.id)
  const processInfo = processManager.getProcessInfo(project.id)
  const history = resourceMonitor.getHistory(project.id)
  const latestSnapshot = history.length > 0 ? history[history.length - 1] : null

  return {
    id: project.id,
    name: project.name,
    path: project.path,
    framework: project.framework,
    language: project.lang,
    port: project.port,
    startCmd: project.startCmd,
    color: project.color,
    isFavorite: project.isFavorite,
    status: isRunning ? 'running' : 'stopped',
    pid: processInfo?.pid ?? null,
    uptime: processInfo ? Date.now() - processInfo.startedAt : 0,
    cpu: latestSnapshot?.cpu ?? 0,
    mem: latestSnapshot?.mem ?? 0,
    git: project.git
  }
}
