'use client'

import { useSearchParams } from 'next/navigation'
import { ArticleCard } from '@/components/article/ArticleCard'
import { CategoryNav } from '@/components/article/CategoryNav'
import type { ArticleMeta } from '@/types/article'

type ArticlesListProps = {
  articles: ArticleMeta[]
}

export function ArticlesList({ articles }: ArticlesListProps) {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? 'all'

  const filtered =
    category && category !== 'all'
      ? articles.filter((a) => a.categorySlug === category)
      : articles

  return (
    <>
      <div className="mb-8">
        <CategoryNav />
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--muted)]">
            해당 카테고리에 아직 글이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((article) => (
            <ArticleCard
              key={article.href}
              article={article}
              featured={article.featured}
            />
          ))}
        </div>
      )}
    </>
  )
}
