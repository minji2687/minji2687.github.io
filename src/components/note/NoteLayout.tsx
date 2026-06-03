import Link from 'next/link'
import { Prose } from '@/components/article/Prose'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatDate'
import type { Note } from '@/types/note'

type NoteLayoutProps = {
  note: Note
  children: React.ReactNode
}

export function NoteLayout({ note, children }: NoteLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/notes" className="hover:text-[var(--accent)]">
          Notes
        </Link>
      </nav>

      <article>
        <header className="mb-8 border-b border-[var(--border-color)] pb-8">
          <time
            dateTime={note.date}
            className="text-sm text-[var(--muted-light)]"
          >
            {formatDate(note.date)}
          </time>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {note.title}
          </h1>
          {note.description ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {note.description}
            </p>
          ) : null}
          {note.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          ) : null}
        </header>

        <Prose>{children}</Prose>

        <div className="mt-12 border-t border-[var(--border-color)] pt-8">
          <Link
            href="/notes"
            className="text-base text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            ← Notes 목록으로
          </Link>
        </div>
      </article>
    </div>
  )
}
