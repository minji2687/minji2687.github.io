export type ArticleFrontmatter = {
  title: string
  description: string
  date: string
  category: string
  tags: string[]
  featured?: boolean
  draft?: boolean
  coverImage?: string
}

export type Article = ArticleFrontmatter & {
  slug: string
  categorySlug: string
  href: string
  content: string
}

export type ArticleMeta = Omit<Article, 'content'>
