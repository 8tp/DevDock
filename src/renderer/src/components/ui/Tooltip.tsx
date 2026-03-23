import React, { useCallback, useRef, useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const positionClasses: Record<NonNullable<TooltipProps['position']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, 300)
  }, [])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <span className="relative inline-flex" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      {children}
      {visible && (
        <span
          className={[
            'absolute z-50 whitespace-nowrap px-2 py-1 text-xs',
            'rounded-[var(--dd-radius-sm)] pointer-events-none dd-animate-fade-in',
            positionClasses[position]
          ].join(' ')}
          style={{
            backgroundColor: 'var(--dd-surface-3)',
            color: 'var(--dd-text-secondary)',
            boxShadow: 'var(--dd-shadow-md)'
          }}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  )
}

export default Tooltip
