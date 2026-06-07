import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

import './checkbox.css'

export interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  label?: string
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="Checkbox">
        <CheckboxPrimitive.Root
          ref={ref}
          id={id}
          className={cn('Checkbox__Input', className)}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="Checkbox__Indicator">
            <IconCheck className="Checkbox__Icon" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label && (
          <label htmlFor={id} className="Checkbox__Label">
            {label}
          </label>
        )}
      </div>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
