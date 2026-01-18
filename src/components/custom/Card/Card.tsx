import * as React from 'react'

import { cn } from '@/lib/utils'
import { CardProvider, CardContextValue } from './Context'

import './card.css'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardContextValue & { full?: boolean }
>(({ className, full, state = 'idle', ...props }, ref) => (
  <CardProvider state={state}>
    <div
      className={cn(Card.displayName, `Card--${state}`, full && 'Card--full')}
      ref={ref}
      {...props}
    />
  </CardProvider>
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="Card__Header" {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className="Card__Title heading--4" {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className="Card__Description heading--3" {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="Card__Content" {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className="Card__Footer" {...props} />
))
CardFooter.displayName = 'CardFooter'

const CardSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardContextValue & { full?: boolean }
>(({ className, ...props }, ref) => (
  <Card {...props}>
    <div ref={ref} className="Card__CardSkeleton">
      <CardHeader>
        <CardTitle>Loading</CardTitle>
      </CardHeader>
    </div>
  </Card>
))
CardSkeleton.displayName = 'CardSkeleton'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardSkeleton,
}
