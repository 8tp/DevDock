import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Kbd } from '../ui'

interface Action {
  id: string
  name: string
  category: 'Projects' | 'Ports' | 'Navigation' | 'Stacks' | 'Settings' | 'System'
  shortcut?: string
  icon?: React.ReactNode
  execute: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  actions: Action[]
}

interface ScoredAction extends Action {
  score: number
}

const CATEGORY_ORDER: Action['category'][] = [
  'Navigation',
  'Projects',
  'Ports',
  'Stacks',
  'Settings',
  'System'
]

function scoreMatch(name: string, query: string): number {
  const lower = name.toLowerCase()
  const q = query.toLowerCase()

  if (lower === q) return 100

  // Exact start match: highest
  if (lower.startsWith(q)) return 90

  // Word boundary match: high
  const words = lower.split(/[\s\-_]+/)
  for (const word of words) {
    if (word.startsWith(q)) return 75
  }

  // Initials match (e.g. "ps" matches "Port Scanner")
  const initials = words.map((w) => w[0]).join('')
  if (initials.startsWith(q)) return 65

  // Contains match: lower
  if (lower.includes(q)) return 50

  return 0
}

function groupByCategory(actions: ScoredAction[]): Map<Action['category'], ScoredAction[]> {
  const groups = new Map<Action['category'], ScoredAction[]>()
  for (const cat of CATEGORY_ORDER) {
    const items = actions.filter((a) => a.category === cat)
    if (items.length > 0) {
      groups.set(cat, items)
    }
  }
  return groups
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, actions }) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Filter and score actions
  const filteredActions = useMemo((): ScoredAction[] => {
    if (!query.trim()) {
      // When empty, show all actions grouped by category with default ordering
      return actions.map((a) => ({ ...a, score: 0 }))
    }

    const scored: ScoredAction[] = []
    for (const action of actions) {
      const score = scoreMatch(action.name, query.trim())
      if (score > 0) {
        scored.push({ ...action, score })
      }
    }

    // Sort by score descending, then alphabetically
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.name.localeCompare(b.name)
    })

    return scored
  }, [actions, query])

  // Build a flat list of visible items (including category headers as separators)
  const grouped = useMemo(() => groupByCategory(filteredActions), [filteredActions])

  const flatItems = useMemo((): ScoredAction[] => {
    const items: ScoredAction[] = []
    for (const [, categoryActions] of grouped) {
      items.push(...categoryActions)
    }
    return items
  }, [grouped])

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus input after mount animation
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [open])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current.get(activeIndex)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const executeAction = useCallback(
    (action: ScoredAction) => {
      onClose()
      // Execute after close animation starts
      requestAnimationFrame(() => {
        action.execute()
      })
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
          break
        }
        case 'Enter': {
          e.preventDefault()
          const action = flatItems[activeIndex]
          if (action) {
            executeAction(action)
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          onClose()
          break
        }
        case 'Home': {
          e.preventDefault()
          setActiveIndex(0)
          break
        }
        case 'End': {
          e.preventDefault()
          setActiveIndex(Math.max(flatItems.length - 1, 0))
          break
        }
      }
    },
    [flatItems, activeIndex, executeAction, onClose]
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  if (!open) return null

  // Build the rendered list with category headers
  let globalIndex = 0
  const renderedSections: React.ReactNode[] = []

  for (const [category, categoryActions] of grouped) {
    // Category header
    renderedSections.push(
      <div
        key={`header-${category}`}
        className="sticky top-0 px-4 py-1.5 uppercase dd-no-select"
        style={{
          color: 'var(--dd-text-muted)',
          backgroundColor: 'var(--dd-surface-1)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em'
        }}
      >
        {category}
      </div>
    )

    // Action items
    for (const action of categoryActions) {
      const idx = globalIndex
      const isActive = idx === activeIndex

      renderedSections.push(
        <div
          key={action.id}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(idx, el)
            } else {
              itemRefs.current.delete(idx)
            }
          }}
          className="flex items-center justify-between px-4 py-2 cursor-pointer transition-colors"
          style={{
            backgroundColor: isActive ? 'var(--dd-surface-2)' : 'transparent',
            transitionDuration: 'var(--dd-duration-fast)'
          }}
          onClick={() => executeAction(action)}
          onMouseEnter={() => setActiveIndex(idx)}
          role="option"
          aria-selected={isActive}
        >
          <div className="flex items-center gap-3 min-w-0">
            {action.icon && (
              <span
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                style={{ color: 'var(--dd-text-secondary)' }}
              >
                {action.icon}
              </span>
            )}
            <span
              className="truncate text-sm"
              style={{ color: isActive ? 'var(--dd-text-primary)' : 'var(--dd-text-secondary)' }}
            >
              {action.name}
            </span>
          </div>
          {action.shortcut && (
            <div className="flex-shrink-0 ml-4">
              <Kbd>{action.shortcut}</Kbd>
            </div>
          )}
        </div>
      )
      globalIndex++
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] dd-animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-xl overflow-hidden dd-animate-scale-in"
        style={{
          backgroundColor: 'var(--dd-surface-1)',
          borderColor: 'var(--dd-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: 'var(--dd-radius-xl)',
          boxShadow: 'var(--dd-shadow-lg)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center px-4" style={{ borderBottom: '1px solid var(--dd-border)' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mr-3"
            style={{ color: 'var(--dd-text-muted)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="w-full py-4 bg-transparent border-none outline-none"
            style={{
              color: 'var(--dd-text-primary)',
              caretColor: 'var(--dd-accent)',
              fontSize: 15
            }}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-auto py-2"
          role="listbox"
          aria-label="Command results"
        >
          {flatItems.length > 0 ? (
            renderedSections
          ) : (
            <div
              className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--dd-text-muted)' }}
            >
              No commands found
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 text-xs"
          style={{
            borderTop: '1px solid var(--dd-border)',
            color: 'var(--dd-text-muted)'
          }}
        >
          <span className="flex items-center gap-1.5">
            <Kbd>&uarr;&darr;</Kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>&crarr;</Kbd>
            <span>Execute</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export { CommandPalette, type Action, type CommandPaletteProps }
export default CommandPalette
