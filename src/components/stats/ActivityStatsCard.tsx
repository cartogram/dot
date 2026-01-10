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
  CardDescription,
} from '@/components/shared/Card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ActivityStatsCardProps {
  type: string
  totals: ActivityTotals
  progress?: {
    distance?: ProgressMetric
    count?: ProgressMetric
    elevation?: ProgressMetric
    time?: ProgressMetric
  }
  goalButton?: React.ReactNode
}

export function ActivityStatsCard({ type, totals, progress, goalButton }: ActivityStatsCardProps) {
  const hasProgress = progress && Object.keys(progress).length > 0
  const primaryProgress = progress?.distance || progress?.count

  return (
    <Card>
      <CardHeader>
      <CardTitle>{type}</CardTitle>
        
      </CardHeader>
      <CardContent >
      <CardDescription>Year to date</CardDescription>
      <div className="flex items-start justify-between">
          <div className="flex-1">
            
          </div>
          {goalButton && <div className="ml-2">{goalButton}</div>}
        </div>
        {primaryProgress && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {primaryProgress.unit === 'km'
                  ? `${formatDistance(primaryProgress.current)} / ${formatDistance(primaryProgress.goal)} km`
                  : `${primaryProgress.current.toFixed(0)} / ${primaryProgress.goal.toFixed(0)} ${primaryProgress.unit}`}
              </span>
              <span className="font-medium">{primaryProgress.percentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(primaryProgress.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Distance" value={formatDistance(totals.distance)} unit="km" />
          <StatItem label="Activities" value={totals.count.toString()} />
          <StatItem label="Elevation" value={formatElevation(totals.elevation_gain)} unit="m" />
          <StatItem label="Time" value={formatTime(totals.moving_time)} />
        </div>

        {/* Goal Progress */}
        {hasProgress && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm font-medium">Goal Progress</div>
              {progress.distance && <ProgressBadge progress={progress.distance} />}
              {progress.count && <ProgressBadge progress={progress.count} />}
              {progress.elevation && <ProgressBadge progress={progress.elevation} />}
              {progress.time && <ProgressBadge progress={progress.time} />}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatItem({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
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
      <Badge variant={progress.isAhead ? 'default' : 'secondary'}>
        {badgeText}
      </Badge>
    </div>
  )
}
