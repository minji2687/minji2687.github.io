import { SectionTitle } from '@/components/ui/SectionTitle'

type WorkItem = {
  company: string
  role: string
  period: string
  description: string
  tags: string[]
}

const workHistory: WorkItem[] = [
  {
    company: 'GINT',
    role: 'Frontend Developer',
    period: '2022 — 현재',
    description:
      'Next.js 기반 사용자 매뉴얼 시스템 구축, React Native 앱 개발, AWS 인프라 연동, GeoServer 기반 지도 서비스 개발에 참여했습니다.',
    tags: ['Next.js', 'React Native', 'AWS', 'GeoServer', 'TypeScript'],
  },
]

export function WorkExperience() {
  return (
    <section className="py-12">
      <SectionTitle title="Work Experience" />

      <ul className="mt-6 space-y-6">
        {workHistory.map((item) => (
          <li
            key={item.company}
            className="flex flex-col gap-1 sm:flex-row sm:gap-8"
          >
            <div className="shrink-0 sm:w-36">
              <p className="text-sm tabular-nums text-[var(--muted)]">
                {item.period}
              </p>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {item.company}
                </h3>
                <span className="text-sm text-[var(--accent)]">{item.role}</span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {item.description}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-[var(--muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
