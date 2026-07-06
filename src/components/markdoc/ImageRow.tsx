type ImageRowProps = {
  children: React.ReactNode
}

// Wraps a few `narrow`-titled images so they sit side by side instead of stacking.
export function ImageRow({ children }: ImageRowProps) {
  return (
    <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
    </div>
  )
}
