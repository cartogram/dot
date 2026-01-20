import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/custom/Card/Card'
import { Button } from '@base-ui/react/button'

export function NotFound({ children }: { children?: any }) {
  return (
    <Card state="error">
      <CardHeader>
        <CardTitle>Page Not Found</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>The page you are looking for does not exist.</CardDescription>
        <Button to="/" variant="primary" className="w-full">Go to Dashboard</Button>
      </CardContent>
    </Card>
  )
}
