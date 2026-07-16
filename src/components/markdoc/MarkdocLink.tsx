import Link from 'next/link'

type MarkdocLinkProps = {
  href: string
  title?: string
  children?: React.ReactNode
}

export function MarkdocLink({ href, title, children }: MarkdocLinkProps) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} title={title}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
