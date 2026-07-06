const basePath = process.env.GITHUB_PAGES === 'true' ? '/minji-dev-blog' : ''

type MarkdocImageProps = {
  src: string
  alt?: string
  title?: string
}

// title: "narrow" — for portrait screenshots (e.g. phone app screens) that
// shouldn't stretch to the full prose width. Usage: ![alt](src "narrow")
export function MarkdocImage({ src, alt, title }: MarkdocImageProps) {
  const fullSrc = src.startsWith('/') ? `${basePath}${src}` : src
  const isNarrow = title === 'narrow'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fullSrc}
      alt={alt ?? ''}
      className={
        isNarrow
          ? 'rounded-xl border border-[var(--border-color)] my-4 max-w-xs mx-auto'
          : 'rounded-xl border border-[var(--border-color)] my-4 w-full'
      }
    />
  )
}
