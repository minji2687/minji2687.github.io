import { Container } from '@/components/layout/Container'
import { Hero } from '@/components/home/Hero'
import { FeaturedArticles } from '@/components/home/FeaturedArticles'
import { SelectedProjects } from '@/components/home/SelectedProjects'
import { getFeaturedArticles } from '@/lib/articles'
import { getFeaturedProjects } from '@/lib/projects'

export default async function HomePage() {
  const featuredArticles = await getFeaturedArticles()
  const featuredProjects = await getFeaturedProjects()

  return (
    <Container>
      <Hero />

      <div className="divide-y divide-[var(--border-color)]">
        <FeaturedArticles articles={featuredArticles} />
        <SelectedProjects projects={featuredProjects} />
      </div>
    </Container>
  )
}
