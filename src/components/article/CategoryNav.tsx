'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { siteConfig } from '@/lib/site'

export function CategoryNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') ?? 'all'

  const allCategories = [
    { slug: 'all', name: '전체' },
    ...siteConfig.categories,
  ]

  return (
    <nav className="flex flex-wrap gap-2">
      {allCategories.map((cat) => {
        const isActive = currentCategory === cat.slug
        const href =
          cat.slug === 'all'
            ? '/articles'
            : `/articles?category=${cat.slug}`

        return (
          <Link
            key={cat.slug}
            href={href}
            className={clsx(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border-color)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
            )}
          >
            {cat.name}
          </Link>
        )
      })}
    </nav>
  )
}
