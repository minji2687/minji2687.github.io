import Link from 'next/link'
import { clsx } from 'clsx'

type PaginationProps = {
  currentPage: number
  totalPages: number
  buildHref: (page: number) => string
}

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="페이지">
      <Link
        href={buildHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          currentPage === 1
            ? 'pointer-events-none text-[var(--muted-light)]'
            : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]',
        )}
      >
        이전
      </Link>

      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={clsx(
            'min-w-[2.25rem] rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-colors',
            page === currentPage
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]',
          )}
        >
          {page}
        </Link>
      ))}

      <Link
        href={buildHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          currentPage === totalPages
            ? 'pointer-events-none text-[var(--muted-light)]'
            : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]',
        )}
      >
        다음
      </Link>
    </nav>
  )
}
