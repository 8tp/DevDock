import React from 'react'

/**
 * TitleBar - Frameless window title bar (44px height).
 *
 * The entire bar is a drag region so users can move the window.
 * macOS traffic-light buttons sit in the first 80px, so we add
 * left padding to avoid overlapping them.
 */
const TitleBar: React.FC = React.memo(() => {
  return (
    <div
      className="dd-drag-region dd-no-select flex items-center justify-center shrink-0"
      style={{
        height: 44,
        backgroundColor: 'var(--dd-surface-0)',
        borderBottom: '1px solid var(--dd-border)',
        paddingLeft: 80, // space for macOS traffic-light controls
        paddingRight: 16
      }}
    >
      <span
        className="text-xs font-medium tracking-wide"
        style={{
          color: 'var(--dd-text-secondary)',
          fontFamily: 'var(--dd-font-sans)'
        }}
      >
        DevDock
      </span>
    </div>
  )
})

TitleBar.displayName = 'TitleBar'

export { TitleBar }
