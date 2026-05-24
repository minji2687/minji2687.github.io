import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { Badge } from '@/components/ui/Badge'
import { getAllProjects } from '@/lib/projects'

export const metadata: Metadata = {
  title: 'Projects',
  description: '개발한 프로젝트 아카이브',
}

const statusLabel: Record<string, string> = {
  active: '활성',
  archived: '아카이브',
  wip: '진행중',
}

export default async function ProjectsPage() {
  const projects = await getAllProjects()

  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Projects
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          개발한 프로젝트 아카이브
        </p>
      </div>

      <ul className="space-y-5">
        {projects.map((project) => (
          <li
            key={project.slug}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    {project.title}
                  </h2>
                  <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {statusLabel[project.status] ?? project.status}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <Badge key={tag}>
                      {tag}
                    </Badge>
                  ))}
                </div>
                {project.links && project.links.length > 0 && (
                  <div className="mt-3 flex gap-3">
                    {project.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--accent-sub)] hover:text-[var(--accent)]"
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <time className="shrink-0 text-xs text-[var(--muted)]">
                {project.date}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  )
}
