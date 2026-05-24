import { clsx } from 'clsx'

type SectionTitleProps = {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionTitle({
  title,
  description,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={clsx(
        'flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-4',
        className,
      )}
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-light)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
