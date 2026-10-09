'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { clsx } from 'clsx'
import { isNavActive, siteConfig } from '@/lib/site'

type MobileNavProps = {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="relative z-[60] sm:hidden"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/20 transition-opacity duration-200 data-[closed]:opacity-0"
      />

      <DialogPanel
        id="mobile-nav"
        transition
        className="fixed inset-y-0 right-0 flex w-72 max-w-[80vw] flex-col border-l border-[var(--border-color)] bg-[var(--background)]/85 shadow-xl backdrop-blur-[2px] transition-transform duration-200 ease-out data-[closed]:translate-x-full"
      >
        <div className="flex h-14 items-center justify-end border-b border-[var(--border-color)] px-4">
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label="메뉴 닫기"
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="flex flex-col gap-1">
            {siteConfig.nav.map((item) => {
              const isActive = isNavActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'block rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-[var(--accent-sub)]/15',
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
        </nav>
      </DialogPanel>
    </Dialog>
  )
}
