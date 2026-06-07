import * as React from 'react'
import {  cva } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';
import { cn, styled } from '@/lib/utils'

import './grid.css'

const COMPONENT_NAME = 'Grid'
const { variantClassNames } = styled(COMPONENT_NAME)

const columnsValues = ['auto', '1', '2', '3', '4'] as const
const gapValues = ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge'] as const

const gridVariants = cva(COMPONENT_NAME, {
  variants: {
    columns: variantClassNames(columnsValues, 'columns'),
    gap: variantClassNames(gapValues, 'gap'),
  },
  defaultVariants: {
    columns: 'auto',
  },
})

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, columns, gap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(gridVariants({ columns, gap }), className)}
      {...props}
    />
  ),
)
Grid.displayName = COMPONENT_NAME

export { Grid }
