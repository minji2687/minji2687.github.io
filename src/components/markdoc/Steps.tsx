type StepsProps = {
  children: React.ReactNode
}

type StepProps = {
  title?: string
  children: React.ReactNode
}

export function Steps({ children }: StepsProps) {
  return (
    <ol className="not-prose my-6 space-y-4">
      {children}
    </ol>
  )
}

export function Step({ title, children }: StepProps) {
  return (
    <li className="flex gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white" />
      <div className="flex-1">
        {title && (
          <p className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </p>
        )}
        <div className="text-sm leading-7 text-[var(--muted)]">{children}</div>
      </div>
    </li>
  )
}
