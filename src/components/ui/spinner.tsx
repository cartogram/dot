import { IconLoader } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<typeof IconLoader>) {
  return (
    <IconLoader
      role="status"
      aria-label="Loading"
      className={cn('size-5 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
