export type NoteFrontmatter = {
  title: string
  date: string
  tags: string[]
  description?: string
  draft?: boolean
}

export type Note = NoteFrontmatter & {
  slug: string
  categorySlug: string
  href: string
  content: string
}

export type NoteMeta = Omit<Note, 'content'>
