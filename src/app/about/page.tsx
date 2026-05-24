import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'About',
  description: 'Minji Jo — Frontend Developer 소개',
}

export default function AboutPage() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          About
        </h1>

        <div className="mt-8 space-y-6 text-base leading-8 text-[var(--muted)]">
          <p>
            안녕하세요, 조민지입니다. 프론트엔드 개발자로 일하고 있습니다.
          </p>
          <p>
            Next.js 기반 웹 서비스, React Native 모바일 앱, GeoServer 연동 지도
            서비스, AWS 인프라 등 다양한 영역에서 작업해왔습니다.
          </p>
          <p>
            인터페이스를 설계하고, 기술 문서를 구조화하고, 팀이 쉽게 사용할 수
            있는 시스템을 만드는 일에 관심이 많습니다.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[
            { label: 'Work', value: 'GINT' },
            { label: 'Role', value: 'Frontend Developer' },
            { label: 'Location', value: 'Seoul, Korea' },
            {
              label: 'GitHub',
              value: 'github.com/minji2687',
              href: 'https://github.com/minji2687',
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-base text-[var(--accent)] hover:underline"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-base text-[var(--foreground)]">
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}
