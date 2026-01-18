'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import './progress.css'

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    label: string
  }
>(({ className, value, label, ...props }, ref) => (
  <div className="Progress">
    {label && <span className="Progress__Label heading--4">{label}</span>}
    <ProgressPrimitive.Root ref={ref} className="Progress__Bar" {...props}>
      <ProgressPrimitive.Indicator
        className="Progress__Indicator"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
