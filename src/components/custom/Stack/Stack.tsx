import * as React from 'react'
import {  cva } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';
import { cn, styled } from '@/lib/utils'

import './stack.css'

const COMPONENT_NAME = 'Stack'
const { variantClassNames } = styled(COMPONENT_NAME)

const gapValues = ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge'] as const
const alignValues = ['start', 'center', 'end', 'stretch'] as const
const justifyValues = ['start', 'center', 'end', 'between', 'around'] as const

const stackVariants = cva(COMPONENT_NAME, {
  variants: {
    gap: variantClassNames(gapValues, 'gap'),
    align: variantClassNames(alignValues, 'align'),
    justify: variantClassNames(justifyValues, 'justify'),
  },
  defaultVariants: {
    gap: 'medium',
  },
})

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  as?: React.ElementType
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ as: Comp = 'div', className, gap, align, justify, ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(stackVariants({ gap, align, justify }), className)}
      {...props}
    />
  ),
)
Stack.displayName = COMPONENT_NAME
