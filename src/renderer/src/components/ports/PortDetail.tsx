import React, { useState } from 'react'
import type { PortBinding } from '@shared/types'
import Button from '../ui/Button'

interface PortDetailProps {
  binding: PortBinding
  onKill: () => void
  onClose: () => void
}

/**
 * PortDetail — Detailed panel for a selected port binding.
 *
 * Shows port number, process name, PID, full command line (expandable),
 * a danger "Kill" button with confirmation, and a close button.
 */
const PortDetail: React.FC<PortDetailProps> = ({ binding, onKill, onClose }) => {
  const [confirmKill, setConfirmKill] = useState(false)
  const [commandExpanded, setCommandExpanded] = useState(false)

  const handleKill = (): void => {
    if (confirmKill) {
      onKill()
      setConfirmKill(false)
    } else {
      setConfirmKill(true)
    }
  }

  const handleCancelKill = (): void => {
    setConfirmKill(false)
  }

  // Truncate command to a reasonable length when collapsed
  const maxCommandLength = 80
  const isCommandLong = binding.command.length > maxCommandLength
  const displayCommand =
    commandExpanded || !isCommandLong
      ? binding.command
      : `${binding.command.slice(0, maxCommandLength)}...`

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        backgroundColor: 'var(--dd-surface-1)',
        border: '1px solid var(--dd-border)',
        borderRadius: 'var(--dd-radius-lg)',
        padding: 'var(--dd-space-4)'
      }}
    >
      {/* Header: port number + close */}
      <div className="flex items-center justify-between">
        <span
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--dd-font-mono)',
            color: 'var(--dd-text-primary)'
          }}
        >
          :{binding.port}
        </span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-2">
        <InfoRow label="Process" value={binding.processName || 'unknown'} />
        <InfoRow label="PID" value={String(binding.pid)} mono />
        <InfoRow label="Protocol" value={binding.protocol.toUpperCase()} />
        {binding.projectId && <InfoRow label="Project" value={binding.projectId} mono />}
      </div>

      {/* Command line */}
      <div className="flex flex-col gap-1">
        <span
          className="text-xs"
          style={{ color: 'var(--dd-text-muted)', fontFamily: 'var(--dd-font-sans)' }}
        >
          Command
        </span>
        <div
          className="text-xs break-all"
          style={{
            fontFamily: 'var(--dd-font-mono)',
            color: 'var(--dd-text-secondary)',
            backgroundColor: 'var(--dd-surface-2)',
            borderRadius: 'var(--dd-radius-sm)',
            padding: 'var(--dd-space-2)'
          }}
        >
          {displayCommand}
          {isCommandLong && (
            <button
              type="button"
              onClick={() => setCommandExpanded((prev) => !prev)}
              className="ml-1 cursor-pointer"
              style={{
                color: 'var(--dd-accent)',
                fontFamily: 'var(--dd-font-mono)',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 'inherit'
              }}
            >
              {commandExpanded ? 'show less' : 'show more'}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        <Button variant="danger" size="sm" onClick={handleKill}>
          {confirmKill ? 'Confirm Kill' : 'Kill Process'}
        </Button>
        {confirmKill && (
          <Button variant="ghost" size="sm" onClick={handleCancelKill}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── InfoRow (internal helper) ──────────────────────────────────────────────

interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, mono = false }) => (
  <div className="flex items-center gap-3">
    <span
      className="text-xs shrink-0"
      style={{
        color: 'var(--dd-text-muted)',
        fontFamily: 'var(--dd-font-sans)',
        minWidth: 60
      }}
    >
      {label}
    </span>
    <span
      className="text-sm truncate"
      style={{
        color: 'var(--dd-text-primary)',
        fontFamily: mono ? 'var(--dd-font-mono)' : 'var(--dd-font-sans)'
      }}
    >
      {value}
    </span>
  </div>
)

PortDetail.displayName = 'PortDetail'

export { PortDetail }
export type { PortDetailProps }
