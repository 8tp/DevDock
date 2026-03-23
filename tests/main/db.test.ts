import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DevDockDatabase } from '@main/db/schema'
import {
  listProjects,
  getProject,
  upsertProject,
  updateProject,
  deleteProject,
  toggleFavorite,
  listStacks,
  createStack,
  deleteStack,
  listScanDirectories,
  addScanDirectory,
  removeScanDirectory,
  getSetting,
  setSetting
} from '@main/db/queries'
import { join } from 'path'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'

let database: DevDockDatabase
let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devdock-test-'))
  database = new DevDockDatabase(join(tmpDir, 'test.db'))
})

afterEach(() => {
  database.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('Database Queries', () => {
  describe('Projects', () => {
    it('should list projects (initially empty)', () => {
      const projects = listProjects(database.getDb())
      expect(projects).toEqual([])
    })

    it('should upsert and get a project', () => {
      const project = upsertProject(database.getDb(), {
        id: 'test-1',
        name: 'Test Project',
        path: '/home/user/projects/test',
        framework: 'next.js',
        lang: 'typescript',
        port: 3000,
        startCmd: 'npm run dev',
        envFile: null,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })

      expect(project.id).toBe('test-1')
      expect(project.name).toBe('Test Project')
      expect(project.framework).toBe('next.js')
      expect(project.status).toBe('stopped')
      expect(project.pid).toBeNull()

      const fetched = getProject(database.getDb(), 'test-1')
      expect(fetched).not.toBeNull()
      expect(fetched!.name).toBe('Test Project')
    })

    it('should list projects after insert', () => {
      upsertProject(database.getDb(), {
        id: 'test-1',
        name: 'Project A',
        path: '/a',
        framework: 'vite',
        lang: 'typescript',
        port: 5173,
        startCmd: 'npm run dev',
        envFile: null,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })
      upsertProject(database.getDb(), {
        id: 'test-2',
        name: 'Project B',
        path: '/b',
        framework: 'go',
        lang: 'go',
        port: 8080,
        startCmd: 'go run .',
        envFile: null,
        color: '#9ECE6A',
        isFavorite: true,
        scanDirId: ''
      })

      const projects = listProjects(database.getDb())
      expect(projects).toHaveLength(2)
    })

    it('should update a project', () => {
      upsertProject(database.getDb(), {
        id: 'test-1',
        name: 'Old Name',
        path: '/test',
        framework: 'node.js',
        lang: 'javascript',
        port: 3000,
        startCmd: 'node index.js',
        envFile: null,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })

      const updated = updateProject(database.getDb(), 'test-1', { name: 'New Name', port: 4000 })
      expect(updated.name).toBe('New Name')
      expect(updated.port).toBe(4000)
    })

    it('should delete a project', () => {
      upsertProject(database.getDb(), {
        id: 'test-1',
        name: 'To Delete',
        path: '/del',
        framework: 'node.js',
        lang: 'javascript',
        port: 3000,
        startCmd: 'npm start',
        envFile: null,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })

      deleteProject(database.getDb(), 'test-1')
      expect(getProject(database.getDb(), 'test-1')).toBeNull()
    })

    it('should toggle favorite', () => {
      upsertProject(database.getDb(), {
        id: 'test-1',
        name: 'Fav Test',
        path: '/fav',
        framework: 'vite',
        lang: 'typescript',
        port: 5173,
        startCmd: 'npm run dev',
        envFile: null,
        color: '#7AA2F7',
        isFavorite: false,
        scanDirId: ''
      })

      const toggled = toggleFavorite(database.getDb(), 'test-1')
      expect(toggled.isFavorite).toBe(true)

      const toggled2 = toggleFavorite(database.getDb(), 'test-1')
      expect(toggled2.isFavorite).toBe(false)
    })
  })

  describe('Stacks', () => {
    it('should create and list stacks', () => {
      const stack = createStack(database.getDb(), {
        name: 'E-Commerce',
        description: 'Full e-commerce stack',
        projectIds: ['p1', 'p2', 'p3'],
        autoStart: false
      })

      expect(stack.name).toBe('E-Commerce')
      expect(stack.projectIds).toEqual(['p1', 'p2', 'p3'])

      const stacks = listStacks(database.getDb())
      expect(stacks).toHaveLength(1)
    })

    it('should delete a stack', () => {
      const stack = createStack(database.getDb(), {
        name: 'To Delete',
        description: '',
        projectIds: [],
        autoStart: false
      })

      deleteStack(database.getDb(), stack.id)
      expect(listStacks(database.getDb())).toHaveLength(0)
    })
  })

  describe('Scan Directories', () => {
    it('should add and list scan directories', () => {
      const dir = addScanDirectory(database.getDb(), '/home/user/dev', 3)
      expect(dir.path).toBe('/home/user/dev')
      expect(dir.maxDepth).toBe(3)

      const dirs = listScanDirectories(database.getDb())
      expect(dirs).toHaveLength(1)
    })

    it('should remove a scan directory', () => {
      const dir = addScanDirectory(database.getDb(), '/tmp/test')
      removeScanDirectory(database.getDb(), dir.id)
      expect(listScanDirectories(database.getDb())).toHaveLength(0)
    })
  })

  describe('Settings', () => {
    it('should set and get settings', () => {
      setSetting(database.getDb(), 'theme', 'tokyo-night')
      expect(getSetting(database.getDb(), 'theme')).toBe('tokyo-night')
    })

    it('should return null for missing settings', () => {
      expect(getSetting(database.getDb(), 'nonexistent')).toBeNull()
    })

    it('should overwrite existing settings', () => {
      setSetting(database.getDb(), 'theme', 'tokyo-night')
      setSetting(database.getDb(), 'theme', 'catppuccin-mocha')
      expect(getSetting(database.getDb(), 'theme')).toBe('catppuccin-mocha')
    })
  })
})
