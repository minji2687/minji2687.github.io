import { clsx } from 'clsx'

type CalloutType = 'info' | 'warning' | 'success' | 'error'

type CalloutProps = {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}

const typeStyles: Record<
  CalloutType,
  { container: string; icon: string; iconPath: string }
> = {
  info: {
    container:
      'border-sky-200 bg-sky-50/60 dark:border-sky-800/50 dark:bg-sky-950/30',
    icon: 'text-sky-500',
    iconPath:
      'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-950/30',
    icon: 'text-amber-500',
    iconPath:
      'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  success: {
    container:
      'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/30',
    icon: 'text-emerald-500',
    iconPath:
      'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  error: {
    container:
      'border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/30',
    icon: 'text-red-500',
    iconPath:
      'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
  },
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = typeStyles[type]

  return (
    <div
      className={clsx(
        'not-prose my-6 flex gap-3 rounded-xl border p-4',
        styles.container,
      )}
    >
      <div className="shrink-0 pt-0.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx('h-5 w-5', styles.icon)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={styles.iconPath}
          />
        </svg>
      </div>

      <div className="flex-1 text-sm leading-7">
        {title && (
          <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </p>
        )}
        <div className="text-slate-600 dark:text-slate-400">{children}</div>
      </div>
    </div>
  )
}
