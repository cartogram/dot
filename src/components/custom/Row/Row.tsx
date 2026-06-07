import * as React from 'react'
import {  cva } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';
import { cn, styled } from '@/lib/utils'

import './row.css'

const COMPONENT_NAME = 'Row'
const { variantClassNames, variantClassName } = styled(COMPONENT_NAME)

const gapValues = ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge'] as const
const alignValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const justifyValues = ['start', 'center', 'end', 'between', 'around'] as const

const rowVariants = cva(COMPONENT_NAME, {
  variants: {
    gap: variantClassNames(gapValues, 'gap'),
    align: variantClassNames(alignValues, 'align'),
    justify: variantClassNames(justifyValues, 'justify'),
    wrap: { true: variantClassName('wrap') },
  },
  defaultVariants: {
    gap: 'medium',
    align: 'center',
  },
})

export interface RowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof rowVariants> {
  as?: React.ElementType
}

export const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ as: Comp = 'div', className, gap, align, justify, wrap, ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(rowVariants({ gap, align, justify, wrap }), className)}
      {...props}
    />
  ),
)
Row.displayName = COMPONENT_NAME
