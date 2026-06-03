import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NoteLayout } from '@/components/note/NoteLayout'
import { getNote, getAllNoteParams } from '@/lib/notes'
import { parseMarkdoc, renderMarkdoc } from '@/lib/markdoc'
import { siteConfig } from '@/lib/site'

type NotePageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllNoteParams()
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = await getNote(slug)
  if (!note) return {}

  return {
    title: note.title,
    description: note.description ?? note.title,
    keywords: note.tags,
    alternates: {
      canonical: `${siteConfig.url}${note.href}`,
    },
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = await getNote(slug)

  if (!note) {
    notFound()
  }

  const tree = parseMarkdoc(note.content)
  const content = renderMarkdoc(tree)

  return <NoteLayout note={note}>{content}</NoteLayout>
}
