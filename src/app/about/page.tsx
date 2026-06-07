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
            안녕하세요, 5년차 프론트엔드 개발자 조민지입니다.
          </p>
          <p>
            최근 3년간 농기계 자율주행 플랫폼에서 MQTT/WebSocket/AWS IoT Core
            기반 실시간 데이터를 다루며, 하드웨어 단말기의 데이터가 사용자
            화면까지 안정적으로 전달·표현되는 구조를 만들어왔습니다. Next.js
            웹 서비스와 React Native 앱을 함께 다루고, MapLibre 기반 위치 데이터
            시각화와 다국어(i18n) 운영형 서비스도 구축했습니다.
          </p>
          <p>
            복잡한 데이터 흐름을 신뢰할 수 있는 화면 경험으로 연결하는 일에
            관심이 많고, 통신 지연이나 상태 불일치처럼 운영 환경에서 발생하는
            문제를 차분히 들여다보는 과정을 좋아합니다.
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
