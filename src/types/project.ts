export type ProjectStatus = 'active' | 'archived' | 'wip'

export type ProjectLink = {
  label: string
  href: string
}

export type Project = {
  title: string
  description: string
  date: string
  tags: string[]
  status: ProjectStatus
  links?: ProjectLink[]
  featured?: boolean
  coverImage?: string
  slug: string
  content: string
}

export type ProjectMeta = Omit<Project, 'content'>
