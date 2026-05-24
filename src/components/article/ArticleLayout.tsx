import { Suspense } from 'react'
import Link from 'next/link'
import { Prose } from './Prose'
import { ArticleToc } from './ArticleToc'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatDate'
import { siteConfig } from '@/lib/site'
import type { Article } from '@/types/article'

type ArticleLayoutProps = {
  article: Article
  children: React.ReactNode
}

export function ArticleLayout({ article, children }: ArticleLayoutProps) {
  const categoryName =
    siteConfig.categories.find((c) => c.slug === article.categorySlug)?.name ??
    article.category

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/articles" className="hover:text-[var(--accent)]">
          Articles
        </Link>
        <span>/</span>
        <Link
          href={`/articles?category=${article.categorySlug}`}
          className="hover:text-[var(--accent)]"
        >
          {categoryName}
        </Link>
      </nav>

      <div className="lg:grid lg:grid-cols-[200px_1fr_200px] lg:gap-10">
        {/* 왼쪽: 카테고리 nav (데스크탑만) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Categories
            </p>
            <ul className="space-y-1">
              {siteConfig.categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/articles?category=${cat.slug}`}
                    className={
                      cat.slug === article.categorySlug
                        ? 'block rounded-md px-2 py-1.5 text-sm font-semibold text-[var(--accent)] bg-[var(--accent)]/8'
                        : 'block rounded-md px-2 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]'
                    }
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 중앙: 본문 */}
        <article className="min-w-0">
          <header className="mb-8 pb-8 border-b border-[var(--border-color)]">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-[var(--accent)] font-medium">
                {categoryName}
              </span>
              <span className="text-[var(--border-color)]">·</span>
              <time
                dateTime={article.date}
                className="text-sm text-[var(--muted)]"
              >
                {formatDate(article.date)}
              </time>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {article.title}
            </h1>

            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {article.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Badge key={tag}>
                  {tag}
                </Badge>
              ))}
            </div>
          </header>

          <Prose>{children}</Prose>

          {/* 하단 네비게이션 */}
          <div className="mt-12 pt-8 border-t border-[var(--border-color)]">
            <Link
              href="/articles"
              className="text-base text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              ← 전체 글 목록으로
            </Link>
          </div>
        </article>

        {/* 오른쪽: TOC (데스크탑만) */}
        <aside className="hidden lg:block">
          <ArticleToc content={article.content} />
        </aside>
      </div>
    </div>
  )
}
