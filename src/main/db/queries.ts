// ─── Typed CRUD Query Functions ─────────────────────────────────────────────
// Every function accepts a better-sqlite3 Database instance and returns
// properly-typed data using the shared interfaces from @shared/types.

import type BetterSqlite3 from 'better-sqlite3'
import type {
  Project,
  Stack,
  ScanDirectory,
  Theme,
  Framework,
  Language,
  ProjectStatus
} from '@shared/types'
import { DevDockDatabase } from './schema'

// ─── Internal Row Types (snake_case, matching DB columns) ───────────────────

interface ProjectRow {
  id: string
  name: string
  path: string
  framework: string
  lang: string
  port: number
  start_cmd: string
  env_file: string | null
  color: string
  is_favorite: number
  scan_dir_id: string | null
  created_at: number
  updated_at: number
}

interface StackRow {
  id: string
  name: string
  description: string
  project_ids: string
  auto_start: number
  created_at: number
  updated_at: number
}

interface ScanDirectoryRow {
  id: string
  path: string
  max_depth: number
  exclude_patterns: string
  created_at: number
}

interface ThemeRow {
  id: string
  name: string
  type: 'builtin' | 'user'
  file_path: string | null
  parent_theme_id: string | null
  created_at: number
}

interface SettingRow {
  key: string
  value: string
  type: string
}

// ─── Row-to-Entity Mappers ──────────────────────────────────────────────────

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    framework: row.framework as Framework,
    lang: row.lang as Language,
    port: row.port,
    startCmd: row.start_cmd,
    envFile: row.env_file,
    color: row.color,
    isFavorite: row.is_favorite === 1,
    scanDirId: row.scan_dir_id ?? '',
    // Runtime fields — not persisted, returned with defaults
    status: 'stopped' as ProjectStatus,
    pid: null,
    uptime: 0,
    cpu: 0,
    mem: 0,
    git: null
  }
}

function mapStackRow(row: StackRow): Stack {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    projectIds: JSON.parse(row.project_ids) as string[],
    autoStart: row.auto_start === 1
  }
}

function mapScanDirectoryRow(row: ScanDirectoryRow): ScanDirectory {
  return {
    id: row.id,
    path: row.path,
    maxDepth: row.max_depth,
    excludePatterns: JSON.parse(row.exclude_patterns) as string[]
  }
}

function mapThemeRow(row: ThemeRow): Theme {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    filePath: row.file_path,
    parentThemeId: row.parent_theme_id,
    // Colors are loaded from the theme file at runtime, not stored in DB
    colors: {}
  }
}

// ─── Projects ───────────────────────────────────────────────────────────────

/** List all projects, ordered by favorites first then by name */
export function listProjects(db: BetterSqlite3.Database): Project[] {
  const rows = db
    .prepare('SELECT * FROM projects ORDER BY is_favorite DESC, name ASC')
    .all() as ProjectRow[]
  return rows.map(mapProjectRow)
}

/** Get a single project by ID, or null if not found */
export function getProject(db: BetterSqlite3.Database, id: string): Project | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined
  return row ? mapProjectRow(row) : null
}

/** Insert or update a project (upsert on unique path). Returns the saved project. */
export function upsertProject(
  db: BetterSqlite3.Database,
  project: Omit<Project, 'status' | 'pid' | 'uptime' | 'cpu' | 'mem' | 'git'>
): Project {
  const id = project.id || DevDockDatabase.generateId()
  const now = Math.floor(Date.now() / 1000)

  db.prepare(
    `INSERT INTO projects (id, name, path, framework, lang, port, start_cmd, env_file, color, is_favorite, scan_dir_id, created_at, updated_at)
     VALUES (@id, @name, @path, @framework, @lang, @port, @startCmd, @envFile, @color, @isFavorite, @scanDirId, @createdAt, @updatedAt)
     ON CONFLICT(path) DO UPDATE SET
       name = @name,
       framework = @framework,
       lang = @lang,
       port = @port,
       start_cmd = @startCmd,
       env_file = @envFile,
       color = @color,
       is_favorite = @isFavorite,
       scan_dir_id = @scanDirId,
       updated_at = @updatedAt`
  ).run({
    id,
    name: project.name,
    path: project.path,
    framework: project.framework,
    lang: project.lang,
    port: project.port,
    startCmd: project.startCmd,
    envFile: project.envFile,
    color: project.color,
    isFavorite: project.isFavorite ? 1 : 0,
    scanDirId: project.scanDirId || null,
    createdAt: now,
    updatedAt: now
  })

  // Return the persisted row (may differ on conflict)
  const saved = db.prepare('SELECT * FROM projects WHERE path = ?').get(project.path) as ProjectRow
  return mapProjectRow(saved)
}

/** Partially update a project by ID. Returns the updated project. */
export function updateProject(
  db: BetterSqlite3.Database,
  id: string,
  updates: Partial<Omit<Project, 'id' | 'status' | 'pid' | 'uptime' | 'cpu' | 'mem' | 'git'>>
): Project {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | ProjectRow
    | undefined
  if (!existing) {
    throw new Error(`Project not found: ${id}`)
  }

  const now = Math.floor(Date.now() / 1000)

  // Build SET clause dynamically from provided fields
  const fieldMap: Record<string, unknown> = {}
  if (updates.name !== undefined) fieldMap['name'] = updates.name
  if (updates.path !== undefined) fieldMap['path'] = updates.path
  if (updates.framework !== undefined) fieldMap['framework'] = updates.framework
  if (updates.lang !== undefined) fieldMap['lang'] = updates.lang
  if (updates.port !== undefined) fieldMap['port'] = updates.port
  if (updates.startCmd !== undefined) fieldMap['start_cmd'] = updates.startCmd
  if (updates.envFile !== undefined) fieldMap['env_file'] = updates.envFile
  if (updates.color !== undefined) fieldMap['color'] = updates.color
  if (updates.isFavorite !== undefined) fieldMap['is_favorite'] = updates.isFavorite ? 1 : 0
  if (updates.scanDirId !== undefined) fieldMap['scan_dir_id'] = updates.scanDirId || null

  // Always bump updated_at
  fieldMap['updated_at'] = now

  const setClauses = Object.keys(fieldMap)
    .map((col) => `${col} = @${col}`)
    .join(', ')

  db.prepare(`UPDATE projects SET ${setClauses} WHERE id = @id`).run({
    ...fieldMap,
    id
  })

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
  return mapProjectRow(updated)
}

/** Delete a project by ID */
export function deleteProject(db: BetterSqlite3.Database, id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

/** Toggle the is_favorite flag on a project. Returns the updated project. */
export function toggleFavorite(db: BetterSqlite3.Database, id: string): Project {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | ProjectRow
    | undefined
  if (!existing) {
    throw new Error(`Project not found: ${id}`)
  }

  const now = Math.floor(Date.now() / 1000)
  const newFavorite = existing.is_favorite === 1 ? 0 : 1

  db.prepare('UPDATE projects SET is_favorite = ?, updated_at = ? WHERE id = ?').run(
    newFavorite,
    now,
    id
  )

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
  return mapProjectRow(updated)
}

// ─── Stacks ─────────────────────────────────────────────────────────────────

/** List all stacks, ordered by name */
export function listStacks(db: BetterSqlite3.Database): Stack[] {
  const rows = db.prepare('SELECT * FROM stacks ORDER BY name ASC').all() as StackRow[]
  return rows.map(mapStackRow)
}

/** Create a new stack. Returns the created stack. */
export function createStack(
  db: BetterSqlite3.Database,
  stack: Omit<Stack, 'id'> & { id?: string }
): Stack {
  const id = stack.id || DevDockDatabase.generateId()
  const now = Math.floor(Date.now() / 1000)

  db.prepare(
    `INSERT INTO stacks (id, name, description, project_ids, auto_start, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    stack.name,
    stack.description,
    JSON.stringify(stack.projectIds),
    stack.autoStart ? 1 : 0,
    now,
    now
  )

  const row = db.prepare('SELECT * FROM stacks WHERE id = ?').get(id) as StackRow
  return mapStackRow(row)
}

/** Partially update a stack by ID. Returns the updated stack. */
export function updateStack(
  db: BetterSqlite3.Database,
  id: string,
  updates: Partial<Omit<Stack, 'id'>>
): Stack {
  const existing = db.prepare('SELECT * FROM stacks WHERE id = ?').get(id) as
    | StackRow
    | undefined
  if (!existing) {
    throw new Error(`Stack not found: ${id}`)
  }

  const now = Math.floor(Date.now() / 1000)

  const fieldMap: Record<string, unknown> = {}
  if (updates.name !== undefined) fieldMap['name'] = updates.name
  if (updates.description !== undefined) fieldMap['description'] = updates.description
  if (updates.projectIds !== undefined) fieldMap['project_ids'] = JSON.stringify(updates.projectIds)
  if (updates.autoStart !== undefined) fieldMap['auto_start'] = updates.autoStart ? 1 : 0

  fieldMap['updated_at'] = now

  const setClauses = Object.keys(fieldMap)
    .map((col) => `${col} = @${col}`)
    .join(', ')

  db.prepare(`UPDATE stacks SET ${setClauses} WHERE id = @id`).run({
    ...fieldMap,
    id
  })

  const row = db.prepare('SELECT * FROM stacks WHERE id = ?').get(id) as StackRow
  return mapStackRow(row)
}

/** Delete a stack by ID (cascade deletes stack_dependencies) */
export function deleteStack(db: BetterSqlite3.Database, id: string): void {
  db.prepare('DELETE FROM stacks WHERE id = ?').run(id)
}

// ─── Scan Directories ───────────────────────────────────────────────────────

/** List all scan directories */
export function listScanDirectories(db: BetterSqlite3.Database): ScanDirectory[] {
  const rows = db
    .prepare('SELECT * FROM scan_directories ORDER BY path ASC')
    .all() as ScanDirectoryRow[]
  return rows.map(mapScanDirectoryRow)
}

/** Add a new scan directory. Returns the created record. */
export function addScanDirectory(
  db: BetterSqlite3.Database,
  path: string,
  maxDepth: number = 3,
  excludePatterns: string[] = []
): ScanDirectory {
  const id = DevDockDatabase.generateId()

  db.prepare(
    `INSERT INTO scan_directories (id, path, max_depth, exclude_patterns)
     VALUES (?, ?, ?, ?)`
  ).run(id, path, maxDepth, JSON.stringify(excludePatterns))

  const row = db.prepare('SELECT * FROM scan_directories WHERE id = ?').get(id) as ScanDirectoryRow
  return mapScanDirectoryRow(row)
}

/** Remove a scan directory by ID */
export function removeScanDirectory(db: BetterSqlite3.Database, id: string): void {
  db.prepare('DELETE FROM scan_directories WHERE id = ?').run(id)
}

// ─── Settings ───────────────────────────────────────────────────────────────

/** Get a setting value by key, or null if not set */
export function getSetting(db: BetterSqlite3.Database, key: string): string | null {
  const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as
    | SettingRow
    | undefined
  return row ? row.value : null
}

/** Set a setting value (insert or replace) */
export function setSetting(db: BetterSqlite3.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, type) VALUES (?, ?, 'string')
     ON CONFLICT(key) DO UPDATE SET value = ?`
  ).run(key, value, value)
}

// ─── Themes ─────────────────────────────────────────────────────────────────

/** List all theme records from the database (colors are loaded at runtime from files) */
export function listThemes(db: BetterSqlite3.Database): Theme[] {
  const rows = db.prepare('SELECT * FROM themes ORDER BY name ASC').all() as ThemeRow[]
  return rows.map(mapThemeRow)
}
