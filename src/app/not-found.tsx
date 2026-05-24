import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-[var(--accent)]">404</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-4 text-base text-[var(--muted)]">
        요청하신 페이지가 존재하지 않거나 이동됐을 수 있습니다.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </Container>
  )
}
