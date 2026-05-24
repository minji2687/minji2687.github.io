import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { ArticlesList } from '@/components/article/ArticlesList'
import { getAllArticleMeta } from '@/lib/articles'

export const metadata: Metadata = {
  title: 'Articles',
  description: '프론트엔드, Next.js, React Native, AWS, 지도 서비스, AI 관련 기술 아카이브',
}

export default async function ArticlesPage() {
  const allArticles = await getAllArticleMeta()

  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Articles
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          기술 아카이브 — {allArticles.length}개의 글
        </p>
      </div>

      <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--muted)]">로딩 중...</div>}>
        <ArticlesList articles={allArticles} />
      </Suspense>
    </Container>
  )
}
