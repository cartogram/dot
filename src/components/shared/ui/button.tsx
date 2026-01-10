import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import './button.css'

const buttonVariants = cva('Button', {
  variants: {
    variant: {
      default: '',
      primary: 'Button--primary',
      link: 'Button--link'
    },
    size: {
      default: 'px-4 py-2'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}


function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

Button.displayName = 'Button'

export { Button, buttonVariants }

