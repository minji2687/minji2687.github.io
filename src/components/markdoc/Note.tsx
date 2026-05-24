type NoteProps = {
  title?: string
  children: React.ReactNode
}

export function Note({ title, children }: NoteProps) {
  return (
    <div className="not-prose my-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {title && (
        <p className="mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
      )}
      <div className="text-sm leading-7 text-slate-600 dark:text-slate-400">
        {children}
      </div>
    </div>
  )
}
