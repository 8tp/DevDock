// ─── Database Migrations ────────────────────────────────────────────────────
// Sequential, versioned schema changes applied in a transaction.

import type BetterSqlite3 from 'better-sqlite3'

interface Migration {
  version: number
  name: string
  up: (db: BetterSqlite3.Database) => void
}

// ─── Migration Definitions ──────────────────────────────────────────────────

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scan_directories (
          id TEXT PRIMARY KEY,
          path TEXT NOT NULL UNIQUE,
          max_depth INTEGER NOT NULL DEFAULT 3,
          exclude_patterns TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          framework TEXT NOT NULL DEFAULT 'unknown',
          lang TEXT NOT NULL DEFAULT 'unknown',
          port INTEGER NOT NULL DEFAULT 0,
          start_cmd TEXT NOT NULL DEFAULT '',
          env_file TEXT,
          color TEXT NOT NULL DEFAULT '#7AA2F7',
          is_favorite INTEGER NOT NULL DEFAULT 0,
          scan_dir_id TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
          FOREIGN KEY (scan_dir_id) REFERENCES scan_directories(id)
        );

        CREATE TABLE IF NOT EXISTS stacks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          project_ids TEXT NOT NULL DEFAULT '[]',
          auto_start INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS stack_dependencies (
          id TEXT PRIMARY KEY,
          stack_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          depends_on_project_id TEXT NOT NULL,
          health_check TEXT NOT NULL DEFAULT '{"type":"none"}',
          FOREIGN KEY (stack_id) REFERENCES stacks(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (depends_on_project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'string'
        );

        CREATE TABLE IF NOT EXISTS themes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('builtin', 'user')),
          file_path TEXT,
          parent_theme_id TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
      `)
    }
  }
]

// ─── Migration Runner ───────────────────────────────────────────────────────

/**
 * Applies all pending migrations in order inside a transaction.
 * Tracks applied versions in a `_migrations` meta-table.
 */
export function runMigrations(db: BetterSqlite3.Database): void {
  // Create the migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)

  // Determine which migrations have already been applied
  const applied = new Set(
    (db.prepare('SELECT version FROM _migrations').all() as Array<{ version: number }>).map(
      (row) => row.version
    )
  )

  // Apply pending migrations in a single transaction
  const pending = migrations.filter((m) => !applied.has(m.version))

  if (pending.length === 0) {
    return
  }

  const applyAll = db.transaction(() => {
    const insertMigration = db.prepare(
      'INSERT INTO _migrations (version, name) VALUES (?, ?)'
    )

    for (const migration of pending) {
      migration.up(db)
      insertMigration.run(migration.version, migration.name)
    }
  })

  applyAll()
}
