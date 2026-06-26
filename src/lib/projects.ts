import fs from 'fs'
import path from 'path'
import glob from 'fast-glob'
import yaml from 'js-yaml'
import type { Project, ProjectFrontmatter, ProjectMeta } from '@/types/project'

const PROJECTS_DIR = path.join(process.cwd(), 'src/content/projects')

function parseFrontmatter(source: string): {
  frontmatter: ProjectFrontmatter
  content: string
} {
  const match = source.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/)
  if (!match) {
    throw new Error('frontmatter를 파싱할 수 없습니다.')
  }
  const frontmatter = yaml.load(match[1]) as ProjectFrontmatter
  const content = match[2].trim()
  return { frontmatter, content }
}

export async function getAllProjects(): Promise<Project[]> {
  const files = await glob('*.md', {
    cwd: PROJECTS_DIR,
    absolute: false,
  })

  const projects = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const source = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8')
    const { frontmatter, content } = parseFrontmatter(source)

    return {
      ...frontmatter,
      slug,
      href: `/projects/${slug}`,
      content,
    } satisfies Project
  })

  return projects
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getFeaturedProjects(): Promise<ProjectMeta[]> {
  const all = await getAllProjects()
  return all
    .filter((p) => p.featured)
    .slice(0, 4)
    .map(({ content: _content, ...meta }) => meta)
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const filePath = path.join(PROJECTS_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const source = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, content } = parseFrontmatter(source)

  return {
    ...frontmatter,
    slug,
    href: `/projects/${slug}`,
    content,
  }
}

export async function getAllProjectParams() {
  const projects = await getAllProjects()
  return projects.map((p) => ({ slug: p.slug }))
}
