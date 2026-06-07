import { IconLoader } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

import './spinner.css'

function Spinner({ className, ...props }: React.ComponentProps<typeof IconLoader>) {
  return (
    <IconLoader
      role="status"
      aria-label="Loading"
      className={cn('Spinner', className)}
      {...props}
    />
  )
}

export { Spinner }
