import Link from 'next/link'
import { Prose } from '@/components/article/Prose'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/formatDate'
import type { Project } from '@/types/project'

const statusLabel: Record<string, string> = {
  active: '활성',
  archived: '아카이브',
  wip: '진행중',
}

type ProjectLayoutProps = {
  project: Project
  children: React.ReactNode
}

export function ProjectLayout({ project, children }: ProjectLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-[var(--muted)]">
        <Link href="/projects" className="hover:text-[var(--accent)]">
          Projects
        </Link>
      </nav>

      <article>
        <header className="mb-8 border-b border-[var(--border-color)] pb-8">
          <div className="flex items-center gap-2">
            <time
              dateTime={project.date}
              className="text-sm text-[var(--muted-light)]"
            >
              {formatDate(project.date)}
            </time>
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-xs text-[var(--muted)]">
              {statusLabel[project.status] ?? project.status}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {project.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
            {project.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {project.links && project.links.length > 0 && (
            <div className="mt-4 flex gap-4">
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
        </header>

        {project.content ? (
          <Prose>{children}</Prose>
        ) : (
          <p className="text-sm text-[var(--muted)]">아직 작성된 내용이 없습니다.</p>
        )}

        <div className="mt-12 border-t border-[var(--border-color)] pt-8">
          <Link
            href="/projects"
            className="text-base text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
          >
            ← Projects 목록으로
          </Link>
        </div>
      </article>
    </div>
  )
}
