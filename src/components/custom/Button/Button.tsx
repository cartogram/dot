import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

import './button.css'
import { Link } from "@tanstack/react-router"

const buttonVariants = cva('Button', {
  variants: {
    variant: {
      default: '',
      primary: 'Button--primary',
      secondary: 'Button--secondary',
      destructive: 'Button--destructive',
      link: 'Button--link'
    },
    size: {
      default: ''
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
  to?: string
}


function Button({
  className,
  variant = "default",
  size = "default",
  children,
  to,
  ...props
}: ButtonProps) {

  if (to) {
    return (
      <Link to={to} className={cn(buttonVariants({ variant, size, className }))}>
        {children}
      </Link>
    )
  }
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

Button.displayName = 'Button'

export { Button, buttonVariants }

