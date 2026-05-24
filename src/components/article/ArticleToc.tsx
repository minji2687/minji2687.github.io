'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

type TocItem = {
  id: string
  text: string
  level: number
}

type ArticleTocProps = {
  content: string
}

function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const items: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, '-')
    items.push({ id, text, level })
  }

  return items
}

export function ArticleToc({ content }: ArticleTocProps) {
  const headings = extractHeadings(content)
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0% -70% 0%' },
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav className="sticky top-20">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        목차
      </p>
      <ul className="space-y-1">
        {headings.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(
                'block rounded py-1 text-sm leading-relaxed transition-colors',
                item.level === 3 && 'ml-3',
                activeId === item.id
                  ? 'font-medium text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
