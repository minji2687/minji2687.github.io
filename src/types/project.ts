export type ProjectStatus = 'active' | 'archived' | 'wip'

export type ProjectLink = {
  label: string
  href: string
}

export type ProjectFrontmatter = {
  title: string
  description: string
  date: string
  tags: string[]
  status: ProjectStatus
  org?: string
  links?: ProjectLink[]
  featured?: boolean
  coverImage?: string
  draft?: boolean
}

export type Project = ProjectFrontmatter & {
  slug: string
  href: string
  content: string
}

export type ProjectMeta = Omit<Project, 'content'>
