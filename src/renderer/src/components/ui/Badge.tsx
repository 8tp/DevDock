import React from 'react'

interface BadgeProps {
  variant?: 'framework' | 'status' | 'count'
  color?: string // CSS variable or raw color for status variant
  children: React.ReactNode
  className?: string
}

const Badge: React.FC<BadgeProps> = React.memo(
  ({ variant = 'framework', color, children, className = '' }) => {
    const baseClasses =
      'inline-flex items-center rounded-[var(--dd-radius-full)] text-xs px-2 py-0.5'

    let variantClasses = ''
    let style: React.CSSProperties = {}

    switch (variant) {
      case 'framework':
        variantClasses = 'font-medium'
        style = {
          backgroundColor: 'color-mix(in srgb, var(--dd-accent) 15%, transparent)',
          color: 'var(--dd-accent)'
        }
        break
      case 'status':
        variantClasses = 'font-mono font-medium'
        style = {
          backgroundColor: color
            ? `color-mix(in srgb, ${color} 15%, transparent)`
            : 'color-mix(in srgb, var(--dd-text-muted) 15%, transparent)',
          color: color || 'var(--dd-text-muted)'
        }
        break
      case 'count':
        variantClasses = 'font-mono'
        style = {
          backgroundColor: 'var(--dd-surface-3)',
          color: 'var(--dd-text-muted)'
        }
        break
    }

    return (
      <span
        className={[baseClasses, variantClasses, className].filter(Boolean).join(' ')}
        style={style}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge
