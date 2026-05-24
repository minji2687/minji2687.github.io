import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'Uses',
  description: '개발 환경, 사용하는 도구들',
}

const usesData = [
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
  {
    category: 'Frontend',
    items: [
      { name: 'Next.js', description: 'React 프레임워크 기본 선택.' },
      { name: 'Tailwind CSS', description: 'v4부터 CSS 변수 기반으로 더 유연해졌다.' },
      { name: 'TypeScript', description: '모든 프로젝트에 사용.' },
    ],
  },
  {
    category: 'Mobile',
    items: [
      { name: 'React Native', description: 'iOS/Android 동시 개발.' },
      { name: 'Xcode / Android Studio', description: '시뮬레이터 및 빌드.' },
    ],
  },
  {
    category: 'Deployment',
    items: [
      { name: 'Vercel', description: '프론트엔드 기본 배포 플랫폼.' },
      { name: 'AWS', description: 'S3, CloudFront, Cognito 등 활용.' },
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
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted)]">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  )
}
