import { redirect } from 'next/navigation'
import { getAllArticleParams } from '@/lib/articles'
import { getAllNoteParams } from '@/lib/notes'
import { getAllProjectParams } from '@/lib/projects'

// 레포 이름이 minji-dev-blog일 때 GitHub Pages가 /minji-dev-blog/를
// basePath로 붙였던 시절의 URL이 이력서 등으로 이미 나가 있어서,
// 그 시절 경로를 전부 새 root 경로로 리다이렉트해준다.
export async function generateStaticParams() {
  const [articleParams, noteParams, projectParams] = await Promise.all([
    getAllArticleParams(),
    getAllNoteParams(),
    getAllProjectParams(),
  ])

  const staticPaths: string[][] = [
    [],
    ['about'],
    ['articles'],
    ['notes'],
    ['projects'],
    ['resume'],
    ['uses'],
  ]

  const dynamicPaths: string[][] = [
    ...articleParams.map((p) => ['articles', p.category, p.slug]),
    ...noteParams.map((p) => ['notes', p.category, p.slug]),
    ...projectParams.map((p) => ['projects', p.slug]),
  ]

  return [...staticPaths, ...dynamicPaths].map((slug) => ({ slug }))
}

type Props = {
  params: Promise<{ slug?: string[] }>
}

export default async function LegacyBasePathRedirect({ params }: Props) {
  const { slug } = await params
  redirect(slug && slug.length > 0 ? `/${slug.join('/')}` : '/')
}
