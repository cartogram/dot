import { Card, CardHeader, CardContent } from '@/components/custom/Card'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Dashboard Toolbar Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded-4xl animate-pulse" />
      </div>

      {/* Dashboard Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
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
