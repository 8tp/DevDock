import React from 'react'
import type { PortBinding } from '@shared/types'

interface PortTileProps {
  binding: PortBinding
  isConflict?: boolean
  isManaged?: boolean
  onClick: () => void
  selected?: boolean
}

/**
 * PortTile — A color-coded tile representing a single port binding.
 *
 * Color coding:
 *   Green  — managed DevDock project port (running)
 *   Blue   — known external process
 *   Red    — conflict detected
 *   Gray   — stopped project port
 */
const PortTile: React.FC<PortTileProps> = React.memo(
  ({ binding, isConflict = false, isManaged = false, onClick, selected = false }) => {
    // Determine background tint based on state priority: conflict > managed > external
    const tintColor = isConflict
      ? 'var(--dd-status-error)'
      : isManaged
        ? 'var(--dd-status-running)'
        : binding.pid > 0
          ? 'var(--dd-accent)'
          : 'var(--dd-text-muted)'

    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center justify-center cursor-pointer shrink-0"
        style={{
          width: 80,
          height: 60,
          borderRadius: 'var(--dd-radius-md)',
          border: selected
            ? '1.5px solid var(--dd-border-focus)'
            : '1px solid var(--dd-border)',
          backgroundColor: `color-mix(in srgb, ${tintColor} 10%, transparent)`,
          transition: `all var(--dd-duration-fast) var(--dd-ease-out)`,
          outline: 'none'
        }}
      >
        {/* Port number */}
        <span
          className="text-base font-semibold leading-tight"
          style={{
            fontFamily: 'var(--dd-font-mono)',
            color: 'var(--dd-text-primary)'
          }}
        >
          {binding.port}
        </span>

        {/* Process name */}
        <span
          className="text-xs truncate max-w-[70px] mt-0.5"
          style={{
            color: 'var(--dd-text-muted)',
            fontFamily: 'var(--dd-font-sans)'
          }}
        >
          {binding.processName || 'unknown'}
        </span>
      </button>
    )
  }
)

PortTile.displayName = 'PortTile'

export { PortTile }
export type { PortTileProps }
