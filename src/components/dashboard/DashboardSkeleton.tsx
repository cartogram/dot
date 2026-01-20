import { Card, CardHeader, CardTitle, CardContent } from '@/components/custom/Card'
import { Spinner } from '@/components/ui/spinner'
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Dashboard Toolbar Skeleton */}


      {/* Dashboard Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} state="loading" className="animate-pulse">
            <CardHeader>
              <CardTitle>Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <Spinner className="size-4 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-24 bg-muted rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-16 bg-muted rounded" />
        <div className="h-2 bg-muted rounded w-full" />
        <div className="flex gap-4">
          <div className="h-10 bg-muted rounded flex-1" />
          <div className="h-10 bg-muted rounded flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}
