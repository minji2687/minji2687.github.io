import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatDate'
import type { NoteMeta } from '@/types/note'

type NoteCardProps = {
  note: NoteMeta
}

export function NoteCard({ note }: NoteCardProps) {
  return (
    <Link
      href={note.href}
      className="group flex h-full flex-col gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
    >
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-card-title font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
            {note.title}
          </h2>
          <time
            dateTime={note.date}
            className="shrink-0 text-xs tabular-nums text-[var(--muted-light)]"
          >
            {formatDate(note.date)}
          </time>
        </div>

        {note.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
            {note.description}
          </p>
        ) : null}
      </div>

      {note.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.slice(0, 4).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}
    </Link>
  )
}
