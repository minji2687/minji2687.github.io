import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProjectLayout } from '@/components/project/ProjectLayout'
import { getProjectBySlug, getAllProjectParams } from '@/lib/projects'
import { parseMarkdoc, renderMarkdoc } from '@/lib/markdoc'
import { siteConfig } from '@/lib/site'

type ProjectPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllProjectParams()
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return {}

  return {
    title: project.title,
    description: project.description,
    keywords: project.tags,
    alternates: {
      canonical: `${siteConfig.url}${project.href}`,
    },
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const tree = parseMarkdoc(project.content)
  const content = renderMarkdoc(tree)

  return <ProjectLayout project={project}>{content}</ProjectLayout>
}
