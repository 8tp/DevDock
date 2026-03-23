// ─── SQLite Schema & Database Manager ───────────────────────────────────────
// Manages the better-sqlite3 connection, directory creation, and table setup.

import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import { runMigrations } from './migrations'

/** Default database file location */
const DEFAULT_DB_PATH = join(homedir(), '.devdock', 'devdock.db')

/**
 * DevDock database wrapper around better-sqlite3.
 * Creates the storage directory and all tables on initialization.
 */
export class DevDockDatabase {
  private db: Database.Database

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    // Ensure the parent directory exists
    mkdirSync(dirname(dbPath), { recursive: true })

    this.db = new Database(dbPath)

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL')
    // Enable foreign key enforcement
    this.db.pragma('foreign_keys = ON')

    // Run migrations to create/update tables
    runMigrations(this.db)
  }

  /** Returns the raw better-sqlite3 Database instance */
  getDb(): Database.Database {
    return this.db
  }

  /** Generate a new UUID (v4) for use as a primary key */
  static generateId(): string {
    return randomUUID()
  }

  /** Close the database connection */
  close(): void {
    this.db.close()
  }
}
