import { clsx } from 'clsx'

type BadgeProps = {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'blue' | 'violet'
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
        /* 라이트: 슬레이트 중립 칩 — 배경 확실히 구분, 텍스트 진하게 */
        'bg-slate-100 text-slate-700 border border-slate-200',
        /* 다크: 하늘색 아웃라인 — 배경 없이 테두리+텍스트로 */
        'dark:bg-transparent dark:border dark:border-indigo-500/60 dark:text-indigo-300',
        className,
      )}
    >
      {children}
    </span>
  )
}
