import Link from 'next/link'
import { Container } from './Container'
import { siteConfig } from '@/lib/site'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--border-color)]">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {siteConfig.name}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {siteConfig.description}
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 sm:justify-end">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-[var(--border-color)] py-6 text-center">
          <p className="text-sm text-[var(--muted)]">
            © {year} {siteConfig.name}. Built with Next.js &amp; Markdoc.
          </p>
        </div>
      </Container>
    </footer>
  )
}
