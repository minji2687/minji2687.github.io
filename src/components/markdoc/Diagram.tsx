import clsx from 'clsx'
import React from 'react'

type Tone = 'default' | 'blue' | 'green' | 'amber' | 'muted'

const toneStyles: Record<Tone, string> = {
  default: 'border-[var(--border-color)] bg-[var(--card-bg)]',
  blue: 'border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40',
  green: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
  amber: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
  muted: 'border-dashed border-[var(--border-color)] bg-transparent',
}

type BoxProps = {
  title: string
  desc?: string
  label?: string
  badge?: string
  tone?: Tone
  /** 이 박스로 들어오는 화살표에 붙일 설명 (flow 안에서만 사용) */
  arrow?: string
  /** 들어오는 화살표를 양방향으로 표시 */
  both?: boolean
}

export function Box({ title, desc, label, badge, tone = 'default' }: BoxProps) {
  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center rounded-xl border px-4 py-3 text-center',
        toneStyles[tone],
      )}
    >
      {label && <p className="mb-0.5 text-xs text-[var(--muted-light)]">{label}</p>}
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      {badge && (
        <span className="mt-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {badge}
        </span>
      )}
      {desc && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{desc}</p>}
    </div>
  )
}

function Arrow({ label, both, row }: { label?: string; both?: boolean; row: boolean }) {
  const down = both ? '⇅' : '↓'
  const right = both ? '⇄' : '→'
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center gap-1.5 text-[var(--muted-light)]',
        row ? 'py-1 md:flex-col md:px-1 md:py-0' : 'py-1',
      )}
      aria-hidden={!label}
    >
      <span className={clsx('text-base leading-none', row && 'md:hidden')}>{down}</span>
      {row && <span className="hidden text-base leading-none md:inline">{right}</span>}
      {label && <span className="text-xs text-[var(--muted)]">{label}</span>}
    </div>
  )
}

function boxChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<BoxProps>[]
}

type FlowProps = {
  children: React.ReactNode
  title?: string
  caption?: string
  direction?: 'col' | 'row'
}

/** 박스 사이에 화살표를 자동으로 넣어주는 흐름도 */
export function Flow({ children, title, caption, direction = 'col' }: FlowProps) {
  const row = direction === 'row'
  const items = boxChildren(children)
  return (
    <figure className="not-prose my-6 rounded-2xl border border-[var(--border-color)] p-4 sm:p-5">
      {title && (
        <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--accent)]">{title}</p>
      )}
      <div
        className={clsx(
          'mx-auto flex flex-col items-stretch',
          row ? 'md:flex-row md:items-center' : 'max-w-md',
        )}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Arrow label={item.props.arrow} both={item.props.both} row={row} />}
            <div className={clsx(row && 'md:flex-1')}>{item}</div>
          </React.Fragment>
        ))}
      </div>
      {caption && (
        <figcaption className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

type GridProps = {
  children: React.ReactNode
  title?: string
  desc?: string
  caption?: string
  cols?: number
}

/** 한 덩어리(서버 한 대 등) 안에 여러 요소를 나란히 놓는 그림 */
export function Grid({ children, title, desc, caption, cols = 2 }: GridProps) {
  return (
    <figure className="not-prose my-6 rounded-2xl border border-[var(--border-color)] p-4 sm:p-5">
      {(title || desc) && (
        <div className="mb-4 text-center">
          {title && (
            <p className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </p>
          )}
          {desc && <p className="mt-0.5 text-xs text-[var(--muted)]">{desc}</p>}
        </div>
      )}
      <div
        className={clsx(
          'grid grid-cols-1 gap-3',
          cols === 2 && 'sm:grid-cols-2',
          cols === 3 && 'sm:grid-cols-3',
          cols >= 4 && 'sm:grid-cols-2 md:grid-cols-4',
        )}
      >
        {boxChildren(children)}
      </div>
      {caption && (
        <figcaption className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
