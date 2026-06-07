import { Button } from '@base-ui/react/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card/Card'

export function NotFound({ children }: { children?: any }) {
  return (
    <Card state="error">
      <CardHeader>
        <CardTitle>Page Not Found</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>The page you are looking for does not exist.</CardDescription>
        <Button to="/" variant="primary" className="u-w-full">
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  )
}
