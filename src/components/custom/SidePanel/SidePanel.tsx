import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  side?: 'left' | 'right'
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  footer,
  className,
}: SidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={className}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {children}
        </div>

        {footer && (
          <SheetFooter>
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
