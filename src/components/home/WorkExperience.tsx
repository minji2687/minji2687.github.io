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
      '농기계 자율주행 플랫폼에서 MQTT/WebSocket/AWS IoT Core 기반 실시간 모니터링 웹과 React Native 원격 제어 앱을 개발하고, MapLibre 기반 위치 시각화와 다국어 운영형 서비스를 구축했습니다.',
    tags: ['Next.js', 'React Native', 'MQTT', 'AWS IoT Core', 'MapLibre'],
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
