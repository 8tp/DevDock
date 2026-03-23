import { useState, useEffect, useMemo, useCallback } from 'react'
import { Shell } from './components/layout'
import ProjectsView from './views/ProjectsView'
import { PortsView } from './views/PortsView'
import { LogsView } from './views/LogsView'
import { StacksView } from './views/StacksView'
import { SettingsView } from './views/SettingsView'
import { CommandPalette } from './components/command-palette'
import type { Action } from './components/command-palette'
import { useKeyboard, getModKey } from './hooks'
import { useThemeStore } from './stores/themeStore'
import { useProjectStore } from './stores/projectStore'
import './styles/global.css'

type View = 'projects' | 'ports' | 'logs' | 'stacks' | 'settings'

function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<View>('projects')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const initTheme = useThemeStore((s) => s.initialize)
  const projects = useProjectStore((s) => s.projects)
  const startProject = useProjectStore((s) => s.startProject)
  const stopProject = useProjectStore((s) => s.stopProject)
  const switchTheme = useThemeStore((s) => s.switchTheme)
  const availableThemes = useThemeStore((s) => s.availableThemes)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  const mod = getModKey()

  // Build command palette actions
  const actions: Action[] = useMemo(() => {
    const acts: Action[] = [
      // Navigation
      { id: 'nav-projects', name: 'Go to Projects', category: 'Navigation', shortcut: `${mod} 1`, execute: () => setCurrentView('projects') },
      { id: 'nav-ports', name: 'Go to Ports', category: 'Navigation', shortcut: `${mod} 2`, execute: () => setCurrentView('ports') },
      { id: 'nav-logs', name: 'Go to Logs', category: 'Navigation', shortcut: `${mod} 3`, execute: () => setCurrentView('logs') },
      { id: 'nav-stacks', name: 'Go to Stacks', category: 'Navigation', shortcut: `${mod} 4`, execute: () => setCurrentView('stacks') },
      { id: 'nav-settings', name: 'Go to Settings', category: 'Navigation', shortcut: `${mod} ,`, execute: () => setCurrentView('settings') },
    ]

    // Project actions
    for (const project of projects) {
      acts.push({
        id: `start-${project.id}`,
        name: `Start ${project.name}`,
        category: 'Projects',
        execute: () => startProject(project.id)
      })
      acts.push({
        id: `stop-${project.id}`,
        name: `Stop ${project.name}`,
        category: 'Projects',
        execute: () => stopProject(project.id)
      })
    }

    // Theme actions
    for (const theme of availableThemes) {
      acts.push({
        id: `theme-${theme.id}`,
        name: `Switch to ${theme.name}`,
        category: 'Settings',
        execute: () => switchTheme(theme.id)
      })
    }

    return acts
  }, [projects, availableThemes, startProject, stopProject, switchTheme, mod])

  const closePalette = useCallback(() => setPaletteOpen(false), [])
  const openPalette = useCallback(() => setPaletteOpen(true), [])

  // Register keyboard shortcuts
  useKeyboard([
    { key: 'k', meta: true, handler: openPalette },
    { key: '1', meta: true, handler: () => setCurrentView('projects') },
    { key: '2', meta: true, handler: () => setCurrentView('ports') },
    { key: '3', meta: true, handler: () => setCurrentView('logs') },
    { key: '4', meta: true, handler: () => setCurrentView('stacks') },
    { key: ',', meta: true, handler: () => setCurrentView('settings') },
    { key: '\\', meta: true, handler: () => { /* sidebar toggle handled in Shell */ } },
  ])

  const renderView = (): React.JSX.Element => {
    switch (currentView) {
      case 'projects':
        return <ProjectsView />
      case 'ports':
        return <PortsView />
      case 'logs':
        return <LogsView />
      case 'stacks':
        return <StacksView />
      case 'settings':
        return <SettingsView />
    }
  }

  return (
    <>
      <Shell currentView={currentView} onViewChange={(v) => setCurrentView(v as View)}>
        {renderView()}
      </Shell>
      <CommandPalette open={paletteOpen} onClose={closePalette} actions={actions} />
    </>
  )
}

export default App
