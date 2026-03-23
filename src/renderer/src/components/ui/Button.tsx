import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantStyles: Record<
  NonNullable<ButtonProps['variant']>,
  { base: string; style: React.CSSProperties }
> = {
  primary: {
    base: 'text-[var(--dd-text-inverse)]',
    style: { backgroundColor: 'var(--dd-accent)' }
  },
  secondary: {
    base: 'text-[var(--dd-text-primary)]',
    style: { backgroundColor: 'var(--dd-surface-2)' }
  },
  ghost: {
    base: 'text-[var(--dd-text-secondary)] bg-transparent hover:bg-[var(--dd-surface-2)]',
    style: {}
  },
  danger: {
    base: 'text-[var(--dd-text-inverse)]',
    style: { backgroundColor: 'var(--dd-status-error)' }
  }
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const v = variantStyles[variant]
  const s = sizeStyles[size]

  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium',
        'rounded-[var(--dd-radius-md)]',
        'transition-all duration-[var(--dd-duration-fast)]',
        'dd-focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'cursor-pointer',
        v.base,
        s,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...v.style, ...style }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
