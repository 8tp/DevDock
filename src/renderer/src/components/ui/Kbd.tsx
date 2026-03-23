import React from 'react'

interface KbdProps {
  children: React.ReactNode
}

const Kbd: React.FC<KbdProps> = ({ children }) => {
  return (
    <kbd
      className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono rounded-[var(--dd-radius-sm)] border leading-none"
      style={{
        backgroundColor: 'var(--dd-surface-3)',
        borderColor: 'var(--dd-border)',
        color: 'var(--dd-text-secondary)'
      }}
    >
      {children}
    </kbd>
  )
}

export default Kbd
