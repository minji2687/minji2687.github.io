import Link from 'next/link'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/formatDate'
import type { ArticleMeta } from '@/types/article'

type FeaturedArticlesProps = {
  articles: ArticleMeta[]
}

export function FeaturedArticles({ articles }: FeaturedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <section className="py-12">
      <SectionTitle
        title="Featured Articles"
        action={
          <Button href="/articles" variant="ghost" size="sm">
            전체 보기 →
          </Button>
        }
      />

      <ul className="mt-4 divide-y divide-[var(--border-color)]">
        {articles.map((article) => (
          <li key={article.href}>
            <Link
              href={article.href}
              className="group flex flex-col gap-1.5 py-4 transition-colors sm:flex-row sm:items-start sm:gap-8"
            >
              <time
                dateTime={article.date}
                className="shrink-0 text-sm tabular-nums text-[var(--muted-light)] sm:w-32 sm:pt-0.5"
              >
                {formatDate(article.date)}
              </time>

              <div className="flex-1">
                <h3 className="text-base font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                  {article.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                  {article.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {article.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>
                      {tag}
                    </Badge>
                  ))}
                </div>
                <span className="mt-2 inline-flex items-center text-sm font-medium text-[var(--accent)]">
                  Read article →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
