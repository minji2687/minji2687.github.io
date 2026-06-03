import fs from 'fs'
import path from 'path'
import glob from 'fast-glob'
import yaml from 'js-yaml'
import type { Note, NoteFrontmatter, NoteMeta } from '@/types/note'

const NOTES_DIR = path.join(process.cwd(), 'src/content/notes')

function parseFrontmatter(source: string): {
  frontmatter: NoteFrontmatter
  content: string
} {
  const match = source.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('frontmatter를 파싱할 수 없습니다.')
  }
  const frontmatter = yaml.load(match[1]) as NoteFrontmatter
  const content = match[2].trim()
  return { frontmatter, content }
}

export async function getAllNotes(): Promise<Note[]> {
  const files = await glob('*.md', {
    cwd: NOTES_DIR,
    absolute: false,
  })

  const notes = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const source = fs.readFileSync(path.join(NOTES_DIR, file), 'utf-8')
    const { frontmatter, content } = parseFrontmatter(source)

    return {
      ...frontmatter,
      slug,
      href: `/notes/${slug}`,
      content,
    } satisfies Note
  })

  return notes
    .filter((n) => !n.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getNote(slug: string): Promise<Note | null> {
  const filePath = path.join(NOTES_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const source = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, content } = parseFrontmatter(source)

  return {
    ...frontmatter,
    slug,
    href: `/notes/${slug}`,
    content,
  }
}

export async function getAllNoteParams() {
  const notes = await getAllNotes()
  return notes.map((n) => ({ slug: n.slug }))
}

export async function getAllNoteMeta(): Promise<NoteMeta[]> {
  const notes = await getAllNotes()
  return notes.map(({ content: _content, ...meta }) => meta)
}
