
import * as React from 'react'

import './grid.css'

const Grid = React.forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="Grid" {...props} />
))
Grid.displayName = 'Grid'


export { Grid }
