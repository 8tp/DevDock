// ─── MCP Server ─────────────────────────────────────────────────────────────
// Lightweight JSON-RPC based Model Context Protocol server for DevDock.
// Based on PRD Section 6.7 — MCP Server Integration.
//
// Exposes DevDock tools to AI coding assistants (Claude Code, Cursor, Windsurf)
// via stdio transport. Reads newline-delimited JSON-RPC requests from stdin,
// dispatches to tool handlers, and writes JSON-RPC responses to stdout.
//
// Security: binds only to 127.0.0.1 — no network exposure.
// ────────────────────────────────────────────────────────────────────────────

import { createInterface, Interface as ReadlineInterface } from 'readline'
import type BetterSqlite3 from 'better-sqlite3'
import type { PortScanner } from '../services/PortScanner'
import type { ProcessManager } from '../services/ProcessManager'
import type { LogAggregator } from '../services/LogAggregator'
import type { ResourceMonitor } from '../services/ResourceMonitor'
import { getTools, executeTool } from './tools'

// ─── Types ──────────────────────────────────────────────────────────────────

/** Services injected into the MCP server for tool execution */
export interface MCPServices {
  db: BetterSqlite3.Database
  portScanner: PortScanner
  processManager: ProcessManager
  logAggregator: LogAggregator
  resourceMonitor: ResourceMonitor
}

/** Standard JSON-RPC 2.0 request shape */
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown>
}

/** Standard JSON-RPC 2.0 success response */
interface JsonRpcSuccessResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result: unknown
}

/** Standard JSON-RPC 2.0 error response */
interface JsonRpcErrorResponse {
  jsonrpc: '2.0'
  id: string | number | null
  error: {
    code: number
    message: string
    data?: unknown
  }
}

type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

// ─── JSON-RPC Error Codes ───────────────────────────────────────────────────

const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INTERNAL_ERROR = -32603

// ─── MCP Server Info ────────────────────────────────────────────────────────

const SERVER_NAME = 'devdock'
const SERVER_VERSION = '1.0.0'
const PROTOCOL_VERSION = '2024-11-05'

// ─── MCPServer ──────────────────────────────────────────────────────────────

/**
 * A lightweight MCP server that communicates over stdio using JSON-RPC 2.0.
 *
 * Lifecycle:
 *   1. Construct with all required services
 *   2. Call `start()` to begin reading from stdin
 *   3. Call `stop()` to tear down the readline interface
 *
 * Supported methods:
 *   - `initialize`   — handshake, returns server capabilities
 *   - `initialized`  — client acknowledgement (notification, no response)
 *   - `tools/list`   — enumerate available tools
 *   - `tools/call`   — execute a tool by name with arguments
 *   - `ping`         — health check
 */
export class MCPServer {
  private running = false
  private services: MCPServices
  private rl: ReadlineInterface | null = null

  constructor(services: MCPServices) {
    this.services = services
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Start listening for JSON-RPC requests on stdin.
   * Each line is expected to be a complete JSON-RPC message.
   * Idempotent — calling start() on an already-running server is a no-op.
   */
  start(): void {
    if (this.running) return
    this.running = true

    this.rl = createInterface({
      input: process.stdin,
      terminal: false
    })

    this.rl.on('line', (line: string) => {
      // Fire-and-forget — errors are caught internally and sent as responses
      void this.handleLine(line)
    })

    this.rl.on('close', () => {
      this.running = false
    })
  }

  /**
   * Stop listening for requests and close the readline interface.
   */
  stop(): void {
    this.running = false

    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
  }

  /**
   * Whether the server is currently accepting requests.
   */
  isRunning(): boolean {
    return this.running
  }

  // ── Internal Request Processing ───────────────────────────────────────────

  /**
   * Process a single line from stdin: parse, route, respond.
   */
  private async handleLine(line: string): Promise<void> {
    const trimmed = line.trim()
    if (trimmed.length === 0) return

    let request: JsonRpcRequest

    try {
      request = JSON.parse(trimmed) as JsonRpcRequest
    } catch {
      this.sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: PARSE_ERROR, message: 'Parse error: invalid JSON' }
      })
      return
    }

    // Validate basic JSON-RPC structure
    if (!request.method || typeof request.method !== 'string') {
      this.sendResponse({
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: { code: INVALID_REQUEST, message: 'Invalid request: missing or invalid "method" field' }
      })
      return
    }

    // Notifications (no id) do not receive a response
    const isNotification = request.id === undefined || request.id === null

    try {
      const response = await this.dispatch(request)

      // 'initialized' is a notification — don't send a response
      if (request.method === 'initialized' || (isNotification && response === null)) {
        return
      }

      if (response !== null) {
        this.sendResponse(response)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.sendResponse({
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: { code: INTERNAL_ERROR, message: `Internal error: ${message}` }
      })
    }
  }

  /**
   * Route a parsed JSON-RPC request to the appropriate handler.
   */
  private async dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { id, method, params } = request

    switch (method) {
      // ── MCP Handshake ─────────────────────────────────────────────────
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        }

      // Client acknowledgement — this is a notification, no response needed
      case 'initialized':
        return null

      // ── Tool Discovery ────────────────────────────────────────────────
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            tools: getTools()
          }
        }

      // ── Tool Execution ────────────────────────────────────────────────
      case 'tools/call': {
        const toolParams = params as
          | { name: string; arguments?: Record<string, unknown> }
          | undefined

        if (!toolParams?.name || typeof toolParams.name !== 'string') {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: INVALID_REQUEST,
              message: 'Invalid tools/call: missing "name" in params'
            }
          }
        }

        const toolArgs = toolParams.arguments ?? {}

        try {
          const result = await executeTool(toolParams.name, toolArgs, this.services)

          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          }
        } catch (toolErr: unknown) {
          const toolMessage = toolErr instanceof Error ? toolErr.message : String(toolErr)

          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: toolMessage }, null, 2)
                }
              ],
              isError: true
            }
          }
        }
      }

      // ── Health Check ──────────────────────────────────────────────────
      case 'ping':
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {}
        }

      // ── Unknown Method ────────────────────────────────────────────────
      default:
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: METHOD_NOT_FOUND,
            message: `Method not found: ${method}`
          }
        }
    }
  }

  // ── Output ──────────────────────────────────────────────────────────────

  /**
   * Write a JSON-RPC response to stdout as a single newline-terminated line.
   */
  private sendResponse(response: JsonRpcResponse): void {
    if (!this.running) return

    try {
      process.stdout.write(JSON.stringify(response) + '\n')
    } catch {
      // stdout may be closed if the parent process disconnected — ignore
    }
  }
}
