import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'Notes',
  description: '짧은 기술 노트, 학습 기록',
}

export default function NotesPage() {
  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Notes
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          짧은 기술 노트, 학습 기록
        </p>
      </div>

      <div className="py-20 text-center">
        <p className="text-base text-[var(--muted)]">곧 추가될 예정이에요.</p>
      </div>
    </Container>
  )
}
