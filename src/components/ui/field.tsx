import { useMemo } from 'react'
import {  cva } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';

import { cn, styled } from '@/lib/utils'
import { Label } from '@/components/custom/Label/Label'
import { Separator } from '@/components/custom/Separator/Separator'

import './field.css'

const { variantClassNames } = styled('Field')

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn('FieldSet', className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn('FieldLegend', className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn('FieldGroup', className)}
      {...props}
    />
  )
}

const fieldVariants = cva('Field', {
  variants: {
    orientation: variantClassNames(
      ['vertical', 'horizontal', 'responsive'] as const,
      'orientation',
    ),
  },
  defaultVariants: {
    orientation: 'vertical',
  },
})

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-content" className={cn('FieldContent', className)} {...props} />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn('FieldLabel', className)} {...props} />
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-label" className={cn('FieldTitle', className)} {...props} />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="field-description" className={cn('FieldDescription', className)} {...props} />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn('FieldSeparator', className)}
      {...props}
    >
      <Separator className="FieldSeparator__Line" />
      {children && (
        <span className="FieldSeparator__Content" data-slot="field-separator-content">
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()]

    if (uniqueErrors.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="FieldError__List">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div role="alert" data-slot="field-error" className={cn('FieldError', className)} {...props}>
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
