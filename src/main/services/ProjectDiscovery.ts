// ─── Project Discovery Service ──────────────────────────────────────────────
// Scans configured directories for development projects, detecting framework,
// language, start commands, ports, and environment files.

import { EventEmitter } from 'events'
import { readdir, readFile, stat, access } from 'fs/promises'
import { join, basename } from 'path'
import type { Framework, Language, ScanDirectory } from '@shared/types'
import { DEFAULT_PORTS, FRAMEWORK_MARKERS } from '@shared/constants'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveredProject {
  name: string
  path: string
  framework: Framework
  lang: Language
  port: number
  startCmd: string
  envFile: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Directories that should always be skipped during scanning */
const ALWAYS_SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  'vendor'
])

/** Map from framework to its primary language */
const FRAMEWORK_LANGUAGE_MAP: Record<Framework, Language> = {
  'next.js': 'typescript',
  vite: 'typescript',
  angular: 'typescript',
  sveltekit: 'typescript',
  'node.js': 'javascript',
  django: 'python',
  fastapi: 'python',
  rails: 'ruby',
  go: 'go',
  rust: 'rust',
  '.net': 'csharp',
  laravel: 'php',
  'docker-compose': 'unknown',
  docker: 'unknown',
  unknown: 'unknown'
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ProjectDiscovery extends EventEmitter {
  /**
   * Discover projects across all configured scan directories.
   * Emits 'project' for each discovered project and 'error' on failures.
   */
  async discover(scanDirs: ScanDirectory[]): Promise<DiscoveredProject[]> {
    const projects: DiscoveredProject[] = []

    for (const scanDir of scanDirs) {
      try {
        const dirExists = await this.pathExists(scanDir.path)
        if (!dirExists) {
          this.emit('error', {
            path: scanDir.path,
            message: `Scan directory does not exist: ${scanDir.path}`
          })
          continue
        }

        const discovered = await this.scanDirectory(
          scanDir.path,
          scanDir.maxDepth ?? 3,
          new Set(scanDir.excludePatterns ?? []),
          0
        )
        projects.push(...discovered)
      } catch (err) {
        this.emit('error', {
          path: scanDir.path,
          message: `Failed to scan directory: ${(err as Error).message}`
        })
      }
    }

    return projects
  }

  // ─── Private: Directory Scanning ────────────────────────────────────────

  /**
   * Recursively scan a directory up to the given depth.
   * Returns projects found at this level and below.
   */
  private async scanDirectory(
    dirPath: string,
    maxDepth: number,
    excludePatterns: Set<string>,
    currentDepth: number
  ): Promise<DiscoveredProject[]> {
    if (currentDepth > maxDepth) {
      return []
    }

    const projects: DiscoveredProject[] = []

    // Attempt to detect a project at the current directory
    const detected = await this.detectProject(dirPath)
    if (detected !== null) {
      this.emit('project', detected)
      projects.push(detected)
      // Once a project is found, don't recurse deeper into it
      return projects
    }

    // Not a project root — recurse into subdirectories
    let entries: string[]
    try {
      entries = await readdir(dirPath)
    } catch {
      return projects
    }

    const subdirPromises: Promise<DiscoveredProject[]>[] = []

    for (const entry of entries) {
      if (this.shouldSkip(entry, excludePatterns)) {
        continue
      }

      const fullPath = join(dirPath, entry)

      try {
        const entryStat = await stat(fullPath)
        if (entryStat.isDirectory()) {
          subdirPromises.push(
            this.scanDirectory(fullPath, maxDepth, excludePatterns, currentDepth + 1)
          )
        }
      } catch {
        // Permission denied or broken symlink — skip silently
      }
    }

    const results = await Promise.all(subdirPromises)
    for (const result of results) {
      projects.push(...result)
    }

    return projects
  }

  /**
   * Determine whether a directory entry should be skipped.
   */
  private shouldSkip(name: string, excludePatterns: Set<string>): boolean {
    if (ALWAYS_SKIP.has(name)) {
      return true
    }
    if (name.startsWith('.')) {
      return true
    }
    if (excludePatterns.has(name)) {
      return true
    }
    return false
  }

  // ─── Private: Framework Detection ───────────────────────────────────────

  /**
   * Detect whether the given directory is a project root.
   * Returns a DiscoveredProject if detected, null otherwise.
   */
  private async detectProject(dirPath: string): Promise<DiscoveredProject | null> {
    const files = await this.listFiles(dirPath)
    const fileSet = new Set(files)

    const framework = await this.detectFramework(dirPath, fileSet)
    if (framework === null) {
      return null
    }

    const name = await this.detectName(dirPath, framework, fileSet)
    const lang = this.detectLanguage(framework, dirPath, fileSet)
    const startCmd = await this.detectStartCommand(dirPath, framework, fileSet)
    const port = DEFAULT_PORTS[framework] ?? 0
    const envFile = await this.detectEnvFile(dirPath, fileSet)

    return {
      name,
      path: dirPath,
      framework,
      lang,
      port,
      startCmd,
      envFile
    }
  }

  /**
   * Detect the framework for a project directory.
   * Returns the most specific framework match, or null if no project detected.
   *
   * Detection order matters: more specific frameworks are checked first,
   * then generic fallbacks (node.js, docker) are checked last.
   */
  private async detectFramework(
    dirPath: string,
    fileSet: Set<string>
  ): Promise<Framework | null> {
    const hasPackageJson = fileSet.has('package.json')
    const hasPythonManifest =
      fileSet.has('requirements.txt') || fileSet.has('pyproject.toml')

    // ── Specific Node.js frameworks (require package.json) ──
    if (hasPackageJson) {
      // Next.js: package.json + next.config.*
      if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['next.js'])) {
        return 'next.js'
      }
      // Vite: package.json + vite.config.*
      if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['vite'])) {
        return 'vite'
      }
      // Angular: package.json + angular.json
      if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['angular'])) {
        return 'angular'
      }
      // SvelteKit: package.json + svelte.config.*
      if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['sveltekit'])) {
        return 'sveltekit'
      }
    }

    // ── Python frameworks (require Python manifest) ──
    if (hasPythonManifest) {
      // Django: manage.py
      if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['django'])) {
        return 'django'
      }
      // FastAPI: main.py containing uvicorn reference
      if (fileSet.has('main.py')) {
        const isUvicorn = await this.fileContains(join(dirPath, 'main.py'), 'uvicorn')
        if (isUvicorn) {
          return 'fastapi'
        }
      }
    }

    // ── Ruby on Rails: Gemfile + config/routes.rb ──
    if (fileSet.has('Gemfile')) {
      const routesExist = await this.pathExists(join(dirPath, 'config', 'routes.rb'))
      if (routesExist) {
        return 'rails'
      }
    }

    // ── Go ──
    if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['go'])) {
      return 'go'
    }

    // ── Rust ──
    if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['rust'])) {
      return 'rust'
    }

    // ── .NET: *.csproj or *.sln ──
    if (this.hasGlobMatch(fileSet, ['.csproj', '.sln'])) {
      return '.net'
    }

    // ── Laravel: composer.json + artisan ──
    if (fileSet.has('composer.json') && this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['laravel'])) {
      return 'laravel'
    }

    // ── Docker Compose (before generic docker) ──
    if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['docker-compose'])) {
      return 'docker-compose'
    }

    // ── Generic Node.js (package.json with no specific framework) ──
    if (hasPackageJson) {
      return 'node.js'
    }

    // ── Standalone Dockerfile (lowest priority) ──
    if (this.hasAnyMarker(fileSet, FRAMEWORK_MARKERS['docker'])) {
      return 'docker'
    }

    return null
  }

  // ─── Private: Name Detection ────────────────────────────────────────────

  /**
   * Detect the project name from manifest files or fall back to directory name.
   */
  private async detectName(
    dirPath: string,
    framework: Framework,
    fileSet: Set<string>
  ): Promise<string> {
    // Node.js-based projects: read package.json name
    if (fileSet.has('package.json')) {
      const name = await this.readJsonField<string>(join(dirPath, 'package.json'), 'name')
      if (name) {
        return name
      }
    }

    // Go: parse module name from go.mod
    if (framework === 'go' && fileSet.has('go.mod')) {
      const moduleName = await this.parseGoModuleName(join(dirPath, 'go.mod'))
      if (moduleName) {
        return moduleName
      }
    }

    // Rust: parse [package] name from Cargo.toml
    if (framework === 'rust' && fileSet.has('Cargo.toml')) {
      const crateName = await this.parseCargoName(join(dirPath, 'Cargo.toml'))
      if (crateName) {
        return crateName
      }
    }

    // Fallback: directory name
    return basename(dirPath)
  }

  // ─── Private: Language Detection ────────────────────────────────────────

  /**
   * Determine the primary language from the framework.
   * For generic Node.js, refine by checking for tsconfig.json.
   */
  private detectLanguage(
    framework: Framework,
    _dirPath: string,
    fileSet: Set<string>
  ): Language {
    // For generic Node.js, check if it's TypeScript
    if (framework === 'node.js' && fileSet.has('tsconfig.json')) {
      return 'typescript'
    }

    return FRAMEWORK_LANGUAGE_MAP[framework]
  }

  // ─── Private: Start Command Detection ───────────────────────────────────

  /**
   * Detect the appropriate start command for a project.
   */
  private async detectStartCommand(
    dirPath: string,
    framework: Framework,
    fileSet: Set<string>
  ): Promise<string> {
    // Node.js-family: check package.json scripts.dev
    if (fileSet.has('package.json')) {
      const scripts = await this.readJsonField<Record<string, string>>(
        join(dirPath, 'package.json'),
        'scripts'
      )
      if (scripts) {
        if (scripts['dev']) {
          return 'npm run dev'
        }
        if (scripts['start']) {
          return 'npm start'
        }
      }
    }

    // Framework-specific conventions
    switch (framework) {
      case 'django':
        return 'python manage.py runserver'
      case 'fastapi':
        return 'uvicorn main:app --reload'
      case 'rails':
        return 'rails server'
      case 'go':
        return 'go run .'
      case 'rust':
        return 'cargo run'
      case '.net':
        return 'dotnet run'
      case 'laravel':
        return 'php artisan serve'
      case 'docker-compose':
        return 'docker compose up'
      case 'docker':
        return 'docker build -t . && docker run'
    }

    // Check for Makefile with a dev target
    if (fileSet.has('Makefile')) {
      const hasDev = await this.makefileHasTarget(join(dirPath, 'Makefile'), 'dev')
      if (hasDev) {
        return 'make dev'
      }
    }

    // Check for Procfile
    if (fileSet.has('Procfile')) {
      const cmd = await this.parseProcfile(join(dirPath, 'Procfile'))
      if (cmd) {
        return cmd
      }
    }

    return ''
  }

  // ─── Private: Env File Detection ────────────────────────────────────────

  /**
   * Check for the existence of a .env file and return its path, or null.
   */
  private async detectEnvFile(
    dirPath: string,
    fileSet: Set<string>
  ): Promise<string | null> {
    // .env may not show up in readdir since it's a dotfile. Check explicitly.
    const envPath = join(dirPath, '.env')
    if (fileSet.has('.env') || (await this.pathExists(envPath))) {
      return envPath
    }
    return null
  }

  // ─── Private: File Helpers ──────────────────────────────────────────────

  /**
   * List all immediate file/directory names in a directory.
   */
  private async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath)
    } catch {
      return []
    }
  }

  /**
   * Check if a path exists on the filesystem.
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if any of the given marker filenames exist in the file set.
   * Handles exact matches only (glob patterns like *.csproj are handled separately).
   */
  private hasAnyMarker(fileSet: Set<string>, markers: string[]): boolean {
    return markers.some((marker) => fileSet.has(marker))
  }

  /**
   * Check if any file in the set ends with one of the given extensions.
   * Used for glob-style markers like *.csproj or *.sln.
   */
  private hasGlobMatch(fileSet: Set<string>, extensions: string[]): boolean {
    for (const file of fileSet) {
      for (const ext of extensions) {
        if (file.endsWith(ext)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Check whether a file contains a given substring.
   */
  private async fileContains(filePath: string, substring: string): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8')
      return content.includes(substring)
    } catch {
      return false
    }
  }

  /**
   * Read a top-level JSON field from a file.
   */
  private async readJsonField<T>(filePath: string, field: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const json = JSON.parse(content) as Record<string, unknown>
      const value = json[field]
      if (value === undefined || value === null) {
        return null
      }
      return value as T
    } catch {
      return null
    }
  }

  /**
   * Parse the module name from a go.mod file.
   * The first line is typically: module github.com/user/repo
   */
  private async parseGoModuleName(filePath: string): Promise<string | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const match = content.match(/^module\s+(.+)$/m)
      if (match) {
        const modulePath = match[1].trim()
        // Return the last segment of the module path
        const parts = modulePath.split('/')
        return parts[parts.length - 1]
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Parse the package name from a Cargo.toml file.
   * Looks for: name = "crate-name" under [package].
   */
  private async parseCargoName(filePath: string): Promise<string | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      // Simple regex to find name in [package] section
      const match = content.match(/\[package\][\s\S]*?name\s*=\s*"([^"]+)"/)
      if (match) {
        return match[1]
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Check if a Makefile contains a specific target.
   */
  private async makefileHasTarget(filePath: string, target: string): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8')
      // Makefile targets are lines starting with "target:" (no leading whitespace)
      const pattern = new RegExp(`^${target}\\s*:`, 'm')
      return pattern.test(content)
    } catch {
      return false
    }
  }

  /**
   * Parse the first "web" or default process command from a Procfile.
   * Procfile format: process_type: command
   */
  private async parseProcfile(filePath: string): Promise<string | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))

      // Prefer "web" process type
      for (const line of lines) {
        const match = line.match(/^web\s*:\s*(.+)$/)
        if (match) {
          return match[1].trim()
        }
      }

      // Fall back to first process type
      if (lines.length > 0) {
        const match = lines[0].match(/^\w+\s*:\s*(.+)$/)
        if (match) {
          return match[1].trim()
        }
      }

      return null
    } catch {
      return null
    }
  }
}
