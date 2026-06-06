const basePath = process.env.GITHUB_PAGES === 'true' ? '/minji-dev-blog' : ''

type MarkdocImageProps = {
  src: string
  alt?: string
}

export function MarkdocImage({ src, alt }: MarkdocImageProps) {
  const fullSrc = src.startsWith('/') ? `${basePath}${src}` : src
  return (
    <img
      src={fullSrc}
      alt={alt ?? ''}
      className="rounded-xl border border-[var(--border-color)] my-4 w-full"
    />
  )
}
