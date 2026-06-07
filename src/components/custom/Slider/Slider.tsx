'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

import './slider.css'

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn('Slider', className)} {...props}>
    <SliderPrimitive.Track className="Slider__Track">
      <SliderPrimitive.Range className="Slider__Range" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="Slider__Thumb" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
