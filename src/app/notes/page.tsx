import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { NoteCard } from '@/components/note/NoteCard'
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

      {notes.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-base text-[var(--muted)]">
            아직 노트가 없습니다.{' '}
            <code className="text-sm">src/content/notes/*.md</code>에 파일을
            추가하세요.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <li key={note.href}>
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
