// ─── Git Service ─────────────────────────────────────────────────────────────
// Reads git status information (branch, ahead/behind, dirty count) for projects.
// Results are cached with a configurable TTL to avoid excessive git operations.

import simpleGit from 'simple-git'
import type { GitStatus } from '../../shared/types'
import { GIT_CACHE_TTL } from '../../shared/constants'

interface CachedStatus {
  status: GitStatus
  timestamp: number
}

const DEFAULT_STATUS: GitStatus = {
  branch: '',
  ahead: 0,
  behind: 0,
  dirty: 0,
  isRepo: false
}

export class GitService {
  private cache: Map<string, CachedStatus> = new Map()
  private cacheTTL: number

  constructor(cacheTTL: number = GIT_CACHE_TTL) {
    this.cacheTTL = cacheTTL
  }

  /**
   * Get git status for a project directory.
   * Returns cached results when available and not expired.
   * On any error, returns a default non-repo status rather than throwing.
   */
  async getStatus(projectPath: string): Promise<GitStatus> {
    // Check cache first
    const cached = this.cache.get(projectPath)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.status
    }

    try {
      const git = simpleGit(projectPath)

      // Verify this is actually a git repository
      const isRepo = await git.checkIsRepo()
      if (!isRepo) {
        const status: GitStatus = { ...DEFAULT_STATUS }
        this.cache.set(projectPath, { status, timestamp: Date.now() })
        return status
      }

      // Gather branch and status information in parallel
      const [branchResult, statusResult] = await Promise.all([
        git.branch(),
        git.status()
      ])

      const dirty =
        statusResult.modified.length +
        statusResult.not_added.length +
        statusResult.created.length +
        statusResult.deleted.length +
        statusResult.conflicted.length

      const status: GitStatus = {
        branch: branchResult.current,
        ahead: statusResult.ahead,
        behind: statusResult.behind,
        dirty,
        isRepo: true
      }

      this.cache.set(projectPath, { status, timestamp: Date.now() })
      return status
    } catch {
      // Git operations can fail for many reasons (corrupted repo, missing git binary, etc.)
      // Return a safe default rather than propagating the error.
      return { ...DEFAULT_STATUS }
    }
  }

  /** Clear all cached git status entries. */
  clearCache(): void {
    this.cache.clear()
  }
}
