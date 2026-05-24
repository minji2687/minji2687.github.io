import { clsx } from 'clsx'

type ContainerProps = {
  className?: string
  children: React.ReactNode
}

export function Container({ className, children }: ContainerProps) {
  return (
    <div className={clsx('mx-auto max-w-5xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

export function NarrowContainer({ className, children }: ContainerProps) {
  return (
    <div className={clsx('mx-auto max-w-2xl px-4 sm:px-6', className)}>
      {children}
    </div>
  )
}
