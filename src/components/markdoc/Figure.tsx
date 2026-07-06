type FigureProps = {
  caption?: string
  children: React.ReactNode
}

// Wraps a single image with a small muted caption below it.
export function Figure({ caption, children }: FigureProps) {
  return (
    <figure className="not-prose flex flex-col items-center gap-1.5">
      {children}
      {caption && (
        <figcaption className="text-center text-xs leading-snug text-[var(--muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
