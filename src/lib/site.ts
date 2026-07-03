export const siteConfig = {
  name: 'Minji Jo',
  title: 'Minji Jo — Frontend Developer',
  description:

  'Frontend developer focused on real-time data systems, IoT-driven interfaces, and map-based visualization.',
  url: 'https://minji-dev-blog.vercel.app',
  author: {
    name: 'Minji Jo',
    github: 'https://github.com/minji2687',
    email: '',
  },
  nav: [
    { name: 'About', href: '/about' },
    { name: 'Articles', href: '/articles' },
    { name: 'Projects', href: '/projects' },
    { name: 'Notes', href: '/notes' },
    { name: 'Uses', href: '/uses' },
  ],
  categories: [
    { slug: 'frontend', name: 'Frontend' },
    { slug: 'nextjs', name: 'Next.js' },
    { slug: 'react-native', name: 'React Native' },
    { slug: 'aws-infra', name: 'AWS / Infra' },
    { slug: 'map-geoserver', name: 'Map / GeoServer' },
    { slug: 'ai-study', name: 'AI Study' },
    { slug: 'backend', name: 'Backend' },
  ],
}

export const noteCategories = [
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'ai', name: 'AI' },
  { slug: 'tips', name: 'Tips' },
  { slug: 'math', name: 'Math', localOnly: true },
]

export type NavItem = (typeof siteConfig.nav)[number]
export type Category = (typeof siteConfig.categories)[number]
export type NoteCategory = (typeof noteCategories)[number]
