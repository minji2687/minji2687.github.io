import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { NotesList } from '@/components/note/NotesList'
import { getAllNoteMeta } from '@/lib/notes'

export const metadata: Metadata = {
  title: 'Notes',
  description: '짧은 기술 노트, 학습 기록',
}

export default async function NotesPage() {
  const notes = await getAllNoteMeta()

  return (
    <Container className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Notes
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          짧은 기술 노트, 학습 기록 — {notes.length}개
        </p>
      </div>

      <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--muted)]">로딩 중...</div>}>
        <NotesList notes={notes} isDev={process.env.NODE_ENV === 'development'} />
      </Suspense>
    </Container>
  )
}
