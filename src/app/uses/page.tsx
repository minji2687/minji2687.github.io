import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'Uses',
  description: '개발 환경, 사용하는 도구들',
}

const usesData = [
  {
    category: 'Frontend',
    items: [
      {
        name: 'React',
        description:
          '실시간 관제 웹, 원격 제어 RN 앱, 현장 설치 앱, 문서 사이트까지 — 긴트에서 단독 개발한 프로덕션 프로젝트 4건에서 기본 UI/상태 로직으로 사용.',
      },
      {
        name: 'Next.js',
        description:
          'CRA + React Router로 시작해 App Router로 전환. 미들웨어 하나에서 next-intl 로케일 처리와 NextAuth 세션 인증을 함께 수행하고, 서버 컴포넌트에서 로케일별 메시지를 바로 렌더링하는 다국어 구조, Markdoc 통합까지 구현.',
      },
      {
        name: 'TypeScript',
        description:
          '전 프로젝트 공통 기본 언어. Generics·Utility Types(Partial/Pick/Omit/Record)는 편하게 쓰고, Conditional/Mapped Types는 필요할 때 가끔 사용.',
      },
      {
        name: 'React Native',
        description:
          '농기계 원격 제어 앱에서 CAN 바이너리 데이터 파싱, MQTT+WebSocket 이중 통신까지 구현.',
      },
      { name: 'Tailwind CSS', description: 'v4까지 포함해 여러 프로젝트에서 기본 스타일링으로 사용.' },
    ],
  },
  {
    category: 'Realtime',
    items: [
      {
        name: 'MQTT',
        description:
          '브라우저(aws-crt)와 React Native(react-native-paho-mqtt) 양쪽에서 AWS IoT Core 연결 구현.',
      },
      {
        name: 'WebSocket',
        description: 'AWS API Gateway 기반으로 제어 명령 송신·실시간 데이터 수신 구조를 직접 설계.',
      },
      {
        name: 'AWS IoT Core',
        description: 'MQTT 브로커로 사용, Custom Authorizer 인증과 동적 토픽 구독까지 다뤄봄.',
      },
      {
        name: 'AWS API Gateway',
        description: 'WebSocket API로 양방향 실시간 통신 구현.',
      },
    ],
  },
  {
    category: 'State / Data',
    items: [
      {
        name: 'Zustand',
        description: '도메인별 스토어 분리, 서버 상태와의 부분 동기화까지 다뤄봄.',
      },
    ],
  },
  {
    category: 'Infra / Delivery',
    items: [
      {
        name: 'AWS Amplify',
        description: '브랜치별(dev/prod) CI/CD 파이프라인을 콘솔에서 직접 구성.',
      },
      {
        name: 'Cognito',
        description: 'NextAuth와 연동해 임시 자격증명 발급, 쿠키 크기 초과 버그를 IAM Role 전환으로 해결한 경험.',
      },
      {
        name: 'NextAuth',
        description: 'JWT 세션에 자격증명을 직접 담다가 쿠키 크기 초과 버그를 겪고 구조를 개선.',
      },
      {
        name: 'Bitbucket Pipelines',
        description: 'GitBook 문서 변경을 감지해 자동 동기화·커밋하는 파이프라인 구성.',
      },
    ],
  },
  {
    category: 'Global UX',
    items: [
      {
        name: 'next-intl',
        description: 'App Router 미들웨어 기반 로케일 라우팅, 서버 컴포넌트 번역까지 구현.',
      },
    ],
  },
  {
    category: 'Editor',
    items: [
      { name: 'Cursor', description: 'AI 기능 덕분에 생산성이 크게 올랐다.' },
      { name: 'VS Code', description: '기존 메인 에디터. 여전히 함께 사용.' },
    ],
  },
  {
    category: 'Terminal',
    items: [
      { name: 'iTerm2 + zsh', description: 'Oh My Zsh + Starship 조합.' },
    ],
  },
]

export default function UsesPage() {
  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Uses
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          개발 환경과 자주 사용하는 도구들
        </p>
      </div>

      <div className="max-w-2xl space-y-10">
        {usesData.map((section) => (
          <section key={section.category}>
            <h2 className="mb-4 border-b border-[var(--border-color)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              {section.category}
            </h2>
            <ul className="space-y-5">
              {section.items.map((item) => (
                <li key={item.name}>
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted)]">
                      {item.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  )
}
