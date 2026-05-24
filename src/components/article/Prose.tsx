import { clsx } from 'clsx'

type ProseProps = {
  children: React.ReactNode
  className?: string
}

export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={clsx(
        'prose prose-slate max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline',
        'prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-code:text-slate-800',
        'prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700 prose-pre:bg-slate-900',
        'prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-[var(--muted)]',
        'prose-img:rounded-xl prose-img:border prose-img:border-[var(--border-color)]',
        'prose-table:text-sm',
        'dark:prose-invert',
        'dark:prose-code:bg-slate-800 dark:prose-code:text-slate-200',
        className,
      )}
    >
      {children}
    </div>
  )
}
