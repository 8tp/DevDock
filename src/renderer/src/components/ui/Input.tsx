import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode // optional icon on the left
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className = '', style, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center w-full">
        {icon && (
          <span
            className="absolute left-2.5 flex items-center pointer-events-none"
            style={{ color: 'var(--dd-text-muted)' }}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={[
            'w-full text-sm rounded-[var(--dd-radius-md)]',
            'border outline-none',
            'transition-colors duration-[var(--dd-duration-fast)]',
            'placeholder:text-[var(--dd-text-muted)]',
            'dd-focus-ring',
            icon ? 'pl-8 pr-3 py-1.5' : 'px-3 py-1.5',
            className
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            backgroundColor: 'var(--dd-surface-2)',
            borderColor: 'var(--dd-border)',
            color: 'var(--dd-text-primary)',
            ...style
          }}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
