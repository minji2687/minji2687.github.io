import Link from 'next/link'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { ProjectMeta } from '@/types/project'

type SelectedProjectsProps = {
  projects: ProjectMeta[]
}

const statusLabel: Record<string, string> = {
  active: '활성',
  archived: '아카이브',
  wip: '진행중',
}

export function SelectedProjects({ projects }: SelectedProjectsProps) {
  if (projects.length === 0) return null

  return (
    <section className="py-12">
      <SectionTitle
        title="Selected Projects"
        action={
          <Button href="/projects" variant="ghost" size="sm">
            전체 보기 →
          </Button>
        }
      />

      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {projects.map((project) => (
          <li key={project.slug}>
            <div className="group flex h-full flex-col rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {project.title}
                </h3>
                <span className="shrink-0 rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  {statusLabel[project.status] ?? project.status}
                </span>
              </div>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
                {project.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag}>
                    {tag}
                  </Badge>
                ))}
              </div>

              {project.links && project.links.length > 0 && (
                <div className="mt-4 flex gap-3">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--accent-sub)] transition-colors hover:text-[var(--accent)]"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
