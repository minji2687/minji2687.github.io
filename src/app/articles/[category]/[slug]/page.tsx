import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleLayout } from '@/components/article/ArticleLayout'
import { getArticle, getAllArticleParams } from '@/lib/articles'
import { parseMarkdoc, renderMarkdoc } from '@/lib/markdoc'
import { siteConfig } from '@/lib/site'

type ArticlePageProps = {
  params: Promise<{ category: string; slug: string }>
}

export async function generateStaticParams() {
  const params = await getAllArticleParams()
  return params
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params
  const article = await getArticle(category, slug)
  if (!article) return {}

  const categoryName =
    siteConfig.categories.find((c) => c.slug === category)?.name ?? category

  return {
    title: article.title,
    description: article.description,
    keywords: article.tags,
    alternates: {
      canonical: `${siteConfig.url}${article.href}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      tags: article.tags,
      authors: [siteConfig.author.name],
      section: categoryName,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { category, slug } = await params
  const article = await getArticle(category, slug)

  if (!article) {
    notFound()
  }

  const tree = parseMarkdoc(article.content)
  const content = renderMarkdoc(tree)

  return (
    <ArticleLayout article={article}>
      {content}
    </ArticleLayout>
  )
}
