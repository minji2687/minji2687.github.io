import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatDate'
import type { ArticleMeta } from '@/types/article'
import { clsx } from 'clsx'

type ArticleCardProps = {
  article: ArticleMeta
  featured?: boolean
}

export function ArticleCard({ article, featured }: ArticleCardProps) {
  return (
    <Link
      href={article.href}
      className={clsx(
        'group flex h-full flex-col gap-2.5 rounded-xl border p-4 shadow-sm transition-all',
        featured
          ? 'border-[var(--accent)]/30 bg-[var(--card-bg)] hover:border-[var(--accent)]/60 hover:shadow-md'
          : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--accent)]/40 hover:shadow-md',
      )}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {featured && (
                <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                  Featured
                </span>
              )}
              <span className="truncate text-xs text-[var(--muted-light)]">
                {article.category}
              </span>
            </div>
            <h2 className="mt-1 text-base font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
              {article.title}
            </h2>
          </div>
          <time
            dateTime={article.date}
            className="shrink-0 text-xs tabular-nums text-[var(--muted-light)]"
          >
            {formatDate(article.date)}
          </time>
        </div>

        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
          {article.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {article.tags.slice(0, 4).map((tag) => (
          <Badge key={tag}>
            {tag}
          </Badge>
        ))}
      </div>
    </Link>
  )
}
