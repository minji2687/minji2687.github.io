'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { NoteCard } from '@/components/note/NoteCard'
import { noteCategories } from '@/lib/site'
import type { NoteMeta } from '@/types/note'

type NotesListProps = {
  notes: NoteMeta[]
}

export function NotesList({ notes }: NotesListProps) {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? 'all'

  const filtered =
    category !== 'all'
      ? notes.filter((n) => n.categorySlug === category)
      : notes

  const allCategories = [{ slug: 'all', name: '전체' }, ...noteCategories]

  return (
    <>
      <nav className="mb-8 flex flex-wrap gap-2">
        {allCategories.map((cat) => {
          const isActive = category === cat.slug
          const href = cat.slug === 'all' ? '/notes' : `/notes?category=${cat.slug}`
          return (
            <Link
              key={cat.slug}
              href={href}
              className={clsx(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border-color)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
              )}
            >
              {cat.name}
            </Link>
          )
        })}
      </nav>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--muted)]">해당 카테고리에 아직 노트가 없습니다.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((note) => (
            <li key={note.href}>
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
