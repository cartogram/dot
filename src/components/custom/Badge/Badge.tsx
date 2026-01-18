import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import './badge.css'  

const badgeVariants = cva(
  'Badge',
  {
    variants: {
      variant: {
        primary:
          'Badge--primary',
        secondary:
          'Badge--secondary',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }))} {...props} />
  )
}

export { Badge, badgeVariants }
