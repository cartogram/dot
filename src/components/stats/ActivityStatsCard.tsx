import type { ActivityTotals } from '@/types/strava'
import type { ProgressMetric } from '@/lib/goals/calculations'
import {
  formatDistance,
  formatElevation,
  formatTime,
  formatProgressDifference,
} from '@/lib/goals/calculations'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/custom/Card'
import { Badge } from '@/components/custom/Badge/Badge'
import { Separator } from '@/components/custom/Separator/Separator'


interface ActivityStatsCardProps {
  types: string[]
  totals: ActivityTotals
  title: string
  actions?: React.ReactNode
  progress?: {
    distance?: ProgressMetric
    count?: ProgressMetric
    elevation?: ProgressMetric
    time?: ProgressMetric
  }
}

export function ActivityStatsCard({
  types,
  title,
  actions,
  totals,
  progress,
}: ActivityStatsCardProps) {
  const hasProgress = progress && Object.keys(progress).length > 0
  const primaryProgress = progress?.distance || progress?.count || progress?.time

  return (
    <Card state="active">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              {types.map((type) => <Badge variant="secondary">{type}</Badge>)}
            </div>
            
            <Badge>{totals.count.toString()} Activities</Badge>
          </div>
        </CardDescription>

        {primaryProgress && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {primaryProgress.unit === 'km'
                  ? `${formatDistance(primaryProgress.current)} / ${formatDistance(primaryProgress.goal)} km`
                  : primaryProgress.unit === 'hours'
                    ? `${formatTime(primaryProgress.current)} / ${formatTime(primaryProgress.goal)}`
                    : `${primaryProgress.current.toFixed(0)} / ${primaryProgress.goal.toFixed(0)} ${primaryProgress.unit}`}
              </span>
              <span className="font-medium">
                {primaryProgress.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(primaryProgress.percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        
      </CardContent>

      <CardFooter>{actions && actions}</CardFooter>
    </Card>
  )
}

function StatItem({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div>
      <div className="text-2xl font-bold">
        {value}
        {unit && (
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {unit}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function ProgressBadge({ progress }: { progress: ProgressMetric }) {
  const badgeText = progress.isAhead
    ? formatProgressDifference(progress)
    : formatProgressDifference(progress)

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">
        <span className="font-medium">{progress.percentage.toFixed(0)}%</span>
      </div>
      <Badge variant={progress.isAhead ? 'primary' : 'secondary'}>
        {badgeText}
      </Badge>
    </div>
  )
}
