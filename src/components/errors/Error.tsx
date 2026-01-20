
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/custom/Card/Card'
import { Button } from '@/components/custom/Button/Button'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {


  console.error(error)

  return (
      <Card state="error">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>{error.message}</CardDescription>
          <Button to="/" variant="primary" className="w-full">Go to Dashboard</Button>
        </CardContent>
      </Card>
      
  )
}
