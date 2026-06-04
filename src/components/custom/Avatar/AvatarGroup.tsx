'use client'

import * as React from 'react'
import { cva } from 'class-variance-authority'
import { Avatar, AvatarFallback, AvatarImage } from './Avatar'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const avatarGroupVariants = cva('AvatarGroup', {
  variants: {
    size: {
      sm: 'AvatarGroup--sm',
      md: 'AvatarGroup--md',
      lg: 'AvatarGroup--lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface AvatarGroupItem {
  /** Unique key for React rendering. */
  id: string
  /** Image src; if absent the fallback is shown. */
  src?: string | null
  /** Initials or label rendered when no image is available. */
  fallback: string
  /** Optional alt text for the image. */
  alt?: string
}

export interface AvatarGroupProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarGroupVariants> {
  /** Items to render as avatars. */
  items: Array<AvatarGroupItem>
  /** Maximum number of avatars to show before collapsing into a "+N" bubble. Defaults to 4. */
  max?: number
}

export function AvatarGroup({ items, max = 4, size, className, ...props }: AvatarGroupProps) {
  const visible = items.slice(0, max)
  const overflow = items.length - visible.length

  return (
    <div className={cn(avatarGroupVariants({ size, className }))} {...props}>
      {visible.map((item) => (
        <Avatar key={item.id}>
          {item.src ? <AvatarImage src={item.src} alt={item.alt ?? item.fallback} /> : null}
          <AvatarFallback>{item.fallback}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className="AvatarGroup__More" aria-hidden>
          +{overflow}
        </div>
      )}
    </div>
  )
}
