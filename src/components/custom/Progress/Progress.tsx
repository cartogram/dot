'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import './progress.css'

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    label: string
  }
>(({ className, value, label, ...props }, ref) => (
  <ProgressPrimitive.Root className="Progress" value={value} ref={ref} {...props}>
    {label && <ProgressPrimitive.Label className="Progress__Label heading--4">{label}</ProgressPrimitive.Label>}
      <ProgressPrimitive.Value className="Progress__Value heading--4"/>
      <ProgressPrimitive.Track className="Progress__Track">
        <ProgressPrimitive.Indicator className="Progress__Indicator"/>
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
