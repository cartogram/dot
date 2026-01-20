import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import './button.css'
import { Link } from '@tanstack/react-router'

const buttonVariants = cva('Button', {
  variants: {
    variant: {
      default: '',
      primary: 'Button--primary',
      secondary: 'Button--secondary',
      link: 'Button--link',
    },
    size: {
      default: '',
      small: 'Button--small',
    },
    full: {
      true: 'Button--full',
      false: '',
    },
    destructive: {
      true: 'Button--destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  to?: string
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  to,
  full = false,
  destructive = false,
  ...props
}: ButtonProps) {
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          buttonVariants({ variant, size, className, full, destructive }),
        )}
      >
        {children}
      </Link>
    )
  }
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className, full, destructive }),
      )}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

Button.displayName = 'Button'

export { Button, buttonVariants }
