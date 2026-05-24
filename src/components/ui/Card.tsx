import { clsx } from 'clsx'

type CardProps = {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5',
        hover &&
          'transition-all hover:border-[var(--accent)]/40 hover:shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('mb-3', className)}>{children}</div>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={clsx('', className)}>{children}</div>
}
