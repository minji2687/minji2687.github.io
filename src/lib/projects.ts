import type { Project, ProjectMeta } from '@/types/project'

const projects: Project[] = [
  {
    title: '사용자 매뉴얼 시스템',
    description:
      'Next.js + Markdoc 기반의 기술 문서 시스템. 사내 서비스 사용자 매뉴얼을 마크다운으로 작성하고 빌드 시 정적 사이트로 배포하는 구조.',
    date: '2024-01',
    tags: ['Next.js', 'Markdoc', 'TypeScript', 'Tailwind CSS'],
    status: 'active',
    featured: true,
    slug: 'user-manual-system',
    content: '',
    links: [],
  },
  {
    title: '지도 기반 현장 관리 앱',
    description:
      'GeoServer WMS/WFS 연동 지도 위에 현장 위치, 작업 이력을 관리하는 React Native 앱. 오프라인 지원 및 실시간 위치 추적 기능 포함.',
    date: '2023-06',
    tags: ['React Native', 'GeoServer', 'WMS', 'WFS', 'AWS'],
    status: 'active',
    featured: true,
    slug: 'field-management-app',
    content: '',
    links: [],
  },
  {
    title: 'minji-dev-blog',
    description:
      'Next.js, Markdoc, Tailwind CSS v4 기반의 개인 기술 블로그. 포트폴리오 + 기술 아카이브 성격의 사이트.',
    date: '2026-05',
    tags: ['Next.js', 'Markdoc', 'Tailwind CSS', 'TypeScript'],
    status: 'wip',
    featured: true,
    slug: 'minji-dev-blog',
    content: '',
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/minji2687/minji-dev-blog',
      },
    ],
  },
]

export async function getAllProjects(): Promise<Project[]> {
  return projects.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export async function getFeaturedProjects(): Promise<ProjectMeta[]> {
  const all = await getAllProjects()
  return all
    .filter((p) => p.featured)
    .slice(0, 4)
    .map(({ content: _content, ...meta }) => meta)
}

export async function getProjectBySlug(
  slug: string,
): Promise<Project | null> {
  return projects.find((p) => p.slug === slug) ?? null
}
