'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Container } from './Container'
import { ThemeToggle } from './ThemeToggle'
import { siteConfig } from '@/lib/site'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--background)]/95 backdrop-blur-sm">
      <Container>
        <div className="flex h-14 items-center justify-between">
          {/* 로고 */}
          <Link
            href="/"
            className="group flex items-center gap-1.5 font-semibold transition-colors"
          >
            <span className="text-base tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)]">
              Minji Jo
            </span>
            <span className="hidden text-sm text-[var(--muted-light)] transition-colors group-hover:text-[var(--accent)] sm:block">
              / dev
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {/* 데스크탑 nav */}
            <ul className="hidden items-center gap-0.5 sm:flex">
              {siteConfig.nav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="ml-1">
              <ThemeToggle />
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              className="rounded-md p-2 text-[var(--muted)] transition-colors hover:text-[var(--foreground)] sm:hidden"
              aria-label="메뉴 열기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </nav>
        </div>
      </Container>
    </header>
  )
}
