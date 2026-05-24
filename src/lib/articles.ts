import fs from 'fs'
import path from 'path'
import glob from 'fast-glob'
import yaml from 'js-yaml'
import type { Article, ArticleFrontmatter, ArticleMeta } from '@/types/article'

const ARTICLES_DIR = path.join(process.cwd(), 'src/content/articles')

function parseFrontmatter(source: string): {
  frontmatter: ArticleFrontmatter
  content: string
} {
  const match = source.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('frontmatter를 파싱할 수 없습니다.')
  }
  const frontmatter = yaml.load(match[1]) as ArticleFrontmatter
  const content = match[2].trim()
  return { frontmatter, content }
}

export async function getAllArticles(): Promise<Article[]> {
  const files = await glob('**/*.md', {
    cwd: ARTICLES_DIR,
    absolute: false,
  })

  const articles = files.map((file) => {
    const parts = file.split('/')
    const categorySlug = parts[0]
    const filename = parts[parts.length - 1]
    const slug = filename.replace(/\.md$/, '')

    const source = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8')
    const { frontmatter, content } = parseFrontmatter(source)

    return {
      ...frontmatter,
      slug,
      categorySlug,
      href: `/articles/${categorySlug}/${slug}`,
      content,
    } satisfies Article
  })

  return articles
    .filter((a) => !a.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getFeaturedArticles(): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  return articles
    .filter((a) => a.featured)
    .slice(0, 5)
    .map(({ content: _content, ...meta }) => meta)
}

export async function getArticlesByCategory(
  categorySlug: string,
): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  return articles
    .filter((a) => a.categorySlug === categorySlug)
    .map(({ content: _content, ...meta }) => meta)
}

export async function getArticle(
  categorySlug: string,
  slug: string,
): Promise<Article | null> {
  const filePath = path.join(ARTICLES_DIR, categorySlug, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const source = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, content } = parseFrontmatter(source)

  return {
    ...frontmatter,
    slug,
    categorySlug,
    href: `/articles/${categorySlug}/${slug}`,
    content,
  }
}

export async function getAllArticleParams() {
  const articles = await getAllArticles()
  return articles.map((a) => ({
    category: a.categorySlug,
    slug: a.slug,
  }))
}

export async function getAllArticleMeta(): Promise<ArticleMeta[]> {
  const articles = await getAllArticles()
  return articles.map(({ content: _content, ...meta }) => meta)
}
