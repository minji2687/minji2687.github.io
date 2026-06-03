import type { MetadataRoute } from 'next'
import { getAllArticleMeta } from '@/lib/articles'
import { getAllNoteMeta } from '@/lib/notes'
import { siteConfig } from '@/lib/site'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, notes] = await Promise.all([
    getAllArticleMeta(),
    getAllNoteMeta(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/projects`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/notes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/uses`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/resume`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteConfig.url}${article.href}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly' as const,
    priority: article.featured ? 0.9 : 0.7,
  }))

  const noteRoutes: MetadataRoute.Sitemap = notes.map((note) => ({
    url: `${siteConfig.url}${note.href}`,
    lastModified: new Date(note.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...articleRoutes, ...noteRoutes]
}
