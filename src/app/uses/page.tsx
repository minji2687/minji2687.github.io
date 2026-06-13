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
      { name: 'React', description: '' },
      { name: 'Next.js', description: '' },
      { name: 'TypeScript', description: '' },
      { name: 'React Native', description: '' },
      { name: 'Tailwind CSS', description: '' },
    ],
  },
  {
    category: 'Realtime',
    items: [
      { name: 'MQTT', description: '' },
      { name: 'WebSocket', description: '' },
      { name: 'AWS IoT Core', description: '' },
      { name: 'AppSync', description: '' },
    ],
  },
  {
    category: 'State / Data',
    items: [
      { name: 'Zustand', description: '' },
      { name: 'Redux Toolkit', description: '' },
      { name: 'React Query', description: '' },
    ],
  },
  {
    category: 'Infra / Delivery',
    items: [
      { name: 'AWS Amplify', description: '' },
      { name: 'S3', description: '' },
      { name: 'Cognito', description: '' },
    ],
  },
  {
    category: 'Global UX',
    items: [
      { name: 'next-intl', description: '' },
      { name: 'react-i18next', description: '' },
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
