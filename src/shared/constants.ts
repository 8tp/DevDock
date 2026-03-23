/** Common development port ranges */
export const PORT_RANGE_START = 1024
export const PORT_RANGE_END = 65535

/** Default ports by framework */
export const DEFAULT_PORTS: Record<string, number> = {
  'next.js': 3000,
  vite: 5173,
  angular: 4200,
  sveltekit: 5173,
  'node.js': 3000,
  django: 8000,
  fastapi: 8000,
  rails: 3000,
  go: 8080,
  rust: 8080,
  '.net': 5000,
  laravel: 8000,
  docker: 0,
  'docker-compose': 0
}

/** Framework detection markers */
export const FRAMEWORK_MARKERS: Record<string, string[]> = {
  'next.js': ['next.config.js', 'next.config.mjs', 'next.config.ts'],
  vite: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
  angular: ['angular.json'],
  sveltekit: ['svelte.config.js', 'svelte.config.ts'],
  django: ['manage.py'],
  fastapi: ['main.py'],
  rails: ['config/routes.rb'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
  '.net': ['*.csproj', '*.sln'],
  laravel: ['artisan'],
  'docker-compose': ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'],
  docker: ['Dockerfile']
}

/** Port scan interval in ms */
export const PORT_SCAN_INTERVAL = 2000

/** Resource monitor interval in ms */
export const RESOURCE_MONITOR_INTERVAL = 2000

/** Max log lines per project */
export const MAX_LOG_LINES = 10000

/** Resource history samples (2 min at 2s intervals) */
export const RESOURCE_HISTORY_LENGTH = 60

/** Default scan depth for project discovery */
export const DEFAULT_SCAN_DEPTH = 3

/** Sidebar dimensions */
export const SIDEBAR_WIDTH_EXPANDED = 220
export const SIDEBAR_WIDTH_COLLAPSED = 52

/** Title bar height */
export const TITLE_BAR_HEIGHT = 44

/** Stats bar height */
export const STATS_BAR_HEIGHT = 48

/** Git cache TTL in ms */
export const GIT_CACHE_TTL = 10000
