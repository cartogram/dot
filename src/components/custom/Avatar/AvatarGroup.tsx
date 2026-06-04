'use client'

import { Avatar, AvatarFallback, AvatarImage } from './Avatar'

export type AvatarGroupSize = 'sm' | 'md' | 'lg'

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

export interface AvatarGroupProps {
  /** Items to render as avatars. */
  items: AvatarGroupItem[]
  /** Maximum number of avatars to show before collapsing into a "+N" bubble. Defaults to 4. */
  max?: number
  /** Visual size of each avatar. Defaults to "md". */
  size?: AvatarGroupSize
}

export function AvatarGroup({ items, max = 4, size = 'md' }: AvatarGroupProps) {
  const visible = items.slice(0, max)
  const overflow = items.length - visible.length

  return (
    <div className={'AvatarGroup AvatarGroup--' + size}>
      {visible.map((item) => (
        <Avatar key={item.id}>
          {item.src ? (
            <AvatarImage src={item.src} alt={item.alt ?? item.fallback} />
          ) : null}
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
