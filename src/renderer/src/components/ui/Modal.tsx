import React, { useCallback, useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

const Modal: React.FC<ModalProps> = ({ open, onClose, children, title }) => {
  const backdropRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dd-animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg rounded-[var(--dd-radius-lg)] border dd-animate-scale-in"
        style={{
          backgroundColor: 'var(--dd-surface-1)',
          borderColor: 'var(--dd-border)',
          boxShadow: 'var(--dd-shadow-lg)'
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--dd-border)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--dd-text-primary)' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-[var(--dd-radius-sm)] transition-colors duration-[var(--dd-duration-fast)] hover:bg-[var(--dd-surface-2)] dd-focus-ring cursor-pointer"
              style={{ color: 'var(--dd-text-muted)' }}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
