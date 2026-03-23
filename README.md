<p align="center">
  <img src="resources/icon-256.png" alt="DevDock" width="128" />
</p>

<h1 align="center">DevDock</h1>

<p align="center">
  <strong>The Local Development Command Center</strong>
  <br />
  <sub>Manage projects, monitor ports, aggregate logs, and orchestrate services — all from one place.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-7AA2F7?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/electron-33-24283B?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/typescript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-9ECE6A?style=flat-square" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-supported-C0CAF5?style=flat-square&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-supported-C0CAF5?style=flat-square&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Linux-supported-C0CAF5?style=flat-square&logo=linux&logoColor=white" alt="Linux" />
</p>

---

## Why DevDock

Modern developers juggle 5-15 local services across multiple projects. Managing them means a patchwork of terminal tabs, Activity Monitor, browser bookmarks, and tribal knowledge about which port belongs to what.

**DevDock fixes this.** It's a persistent, always-on dashboard that automatically discovers your projects, monitors ports, aggregates logs, tracks resource usage, and orchestrates multi-service stacks — all with a single click.

| Problem | DevDock |
|---------|--------|
| Port collisions between projects | Real-time port map with conflict detection |
| Forgetting which services to start | Zero-config auto-discovery of 14 frameworks |
| Zombie processes eating CPU/memory | Per-process resource monitoring with sparklines |
| Logs scattered across terminal tabs | Unified, searchable, virtualized log stream |
| Manually starting 5+ services | One-click stack orchestration |

## Features

**Project Discovery** — Point DevDock at a directory and it detects Next.js, Vite, Angular, SvelteKit, Node.js, Django, FastAPI, Rails, Go, Rust, .NET, Laravel, Docker Compose, and Docker projects. Start, stop, and restart any project with one click. Git branch, ahead/behind, and dirty file count on every card.

**Port Monitor** — Live TCP port scanning every 2 seconds using native OS commands (lsof / netstat / ss). Color-coded grid: green for managed ports, blue for external, red for conflicts. Kill any process by port number.

**Log Aggregation** — All process stdout/stderr in a single virtualized view. Auto-detected log levels (INFO, WARN, ERROR, DEBUG) with filtering. Regex search. 60fps at 10,000+ lines. Color-coded by project.

**Resource Monitoring** — Per-process CPU and memory tracking with sparkline charts. Aggregate totals in an always-visible stats bar.

**Stack Orchestration** — Group related services into named stacks. Launch your entire dev environment in dependency order with one click.

**Command Palette** — `Cmd+K` / `Ctrl+K` for fuzzy search across all actions. Every feature is keyboard-accessible.

**Theming** — Ships with Tokyo Night, Tokyo Night Storm, Catppuccin Mocha, and GitHub Dark. Create custom themes via JSON in `~/.devdock/themes/`. Hot-reload, no restart needed.

**MCP Server** — Built-in Model Context Protocol server with 8 tools for AI assistants (Claude Code, Cursor, Windsurf). Control your dev environment with natural language.

## Quick Start

```bash
git clone https://github.com/devdock-app/devdock.git
cd devdock
npm install
npm run dev
```

> **Apple Silicon note:** If your Node.js runs under Rosetta, run `npm run rebuild:electron` before `npm run dev`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode with HMR |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run all tests |
| `npm run lint` | ESLint check |
| `npm run build:mac` | Package for macOS (.dmg) |
| `npm run build:win` | Package for Windows (.exe) |
| `npm run build:linux` | Package for Linux (.AppImage, .deb) |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl K` | Command Palette |
| `Cmd/Ctrl 1-4` | Switch view |
| `Cmd/Ctrl ,` | Settings |
| `Cmd/Ctrl \` | Toggle sidebar |
| `J / K` | Navigate lists |
| `Space` | Start/Stop project |
| `O` | Open in browser |
| `E` | Open in editor |
| `T` | Open terminal |
| `R` | Restart |

## Architecture

```
src/
├── main/                          # Electron main process
│   ├── services/                  # ProcessManager, PortScanner, ProjectDiscovery,
│   │                              # GitService, LogAggregator, ResourceMonitor
│   ├── ipc/handlers.ts            # 31 typed IPC channels
│   ├── db/                        # SQLite (schema, migrations, queries)
│   ├── mcp/                       # MCP server (8 tools, JSON-RPC stdio)
│   └── tray.ts                    # System tray
├── preload/                       # contextBridge (35 API methods)
├── renderer/
│   ├── components/                # UI primitives, layout shell, feature components
│   ├── views/                     # Projects, Ports, Logs, Stacks, Settings
│   ├── stores/                    # 5 Zustand stores
│   ├── themes/                    # Theme engine + 4 built-in themes
│   └── hooks/                     # useKeyboard, useIPC, useTheme
└── shared/                        # Types, constants, IPC channel definitions
```

## Tech Stack

| | |
|-|-|
| **Shell** | Electron 33 |
| **UI** | React 19, TypeScript 5.7 |
| **Build** | Vite 6, electron-vite 5 |
| **State** | Zustand 5 |
| **Styling** | Tailwind CSS 4 + CSS custom properties |
| **Database** | SQLite (better-sqlite3) |
| **Git** | simple-git |
| **Process** | child_process + tree-kill |
| **Virtualization** | @tanstack/react-virtual |

## Custom Themes

Create `~/.devdock/themes/my-theme.json`:

```json
{
  "name": "My Theme",
  "parent": "tokyo-night",
  "colors": {
    "bg": "#1a1a2e",
    "accent": "#e94560",
    "status-running": "#0f3460",
    "text-primary": "#eaeaea"
  }
}
```

Only override what you want — everything else inherits from the parent.

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_projects` | All projects with status, port, git info |
| `start_project` | Start a project by name |
| `stop_project` | Stop a project by name |
| `get_port_map` | All TCP port bindings |
| `kill_port` | Kill process on a given port |
| `get_logs` | Recent logs, filterable by project/level |
| `launch_stack` | Launch a named stack |
| `get_resource_usage` | CPU/memory for all services |

## Security

- `contextIsolation: true`, `nodeIntegration: false`
- MCP server binds to `127.0.0.1` only
- Strict CSP in production
- Never writes to project directories
- Processes run with user's own permissions

## License

MIT

---

<p align="center">
  <img src="resources/icon-64.png" alt="DevDock" width="20" />
</p>
