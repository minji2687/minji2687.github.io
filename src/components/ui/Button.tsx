import Link from 'next/link'
import { clsx } from 'clsx'

type ButtonProps = {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  external?: boolean
}

const variantClasses = {
  primary:
    'bg-[var(--accent)] text-white hover:opacity-90',
  secondary:
    'border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
  ghost:
    'text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  external,
}: ButtonProps) {
  const classes = clsx(
    'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  )
}
