import type { ActivityTotals } from '@/types/strava'
import type { TimeFrame } from '@/types/dashboard'
import type { ProgressMetric } from '@/lib/goals/calculations'
import {
  formatDailyPace,
  formatRemainder,
  formatCurrent,
  formatGoal,
  formatProgressSummary,
  formatBehindPlan,
} from '@/lib/goals/calculations'
import {
  getTimeFrameDescription,
} from '@/lib/dashboard/timeframes'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '@/components/custom/Card'
import { Badge } from '@/components/custom/Badge/Badge'
import { Progress } from '@/components/custom/Progress/Progress'

interface ActivityStatsCardProps {
  types: string[]
  totals: ActivityTotals
  title: string
  timeFrame: TimeFrame
  customDateRange?: { start: string; end: string }
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
  timeFrame,
  customDateRange,
  progress,
}: ActivityStatsCardProps) {
  // Determine primary progress metric (prefer distance > time > count)
  const primaryProgress =
    progress?.distance || progress?.time || progress?.count || progress?.elevation

  const timeFrameDescription = getTimeFrameDescription(timeFrame, customDateRange)

  return (
    <Card state="active">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {types.map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
            <Badge>{totals.count} Activities</Badge>
          </div>
        </CardDescription>

        {primaryProgress && (
          <div className="space-y-8">
            {/* Progress Bar */}
            <Progress
              value={primaryProgress.percentage}
              label={formatProgressSummary(primaryProgress)}
            />

            {/* Goal Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* <div>
                <div className="text-muted-foreground text-xs mb-1">Goal Total</div>
                <div className="font-medium">{formatGoal(primaryProgress)} {primaryProgress.unit !== 'hours' && primaryProgress.unit}</div>
              </div> */}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Time Frame</div>
                <div className="font-medium">{timeFrameDescription}</div>
              </div>
              {/* <div>
                <div className="text-muted-foreground text-xs mb-1">Elapsed Progress</div>
                <div className="font-medium">{formatCurrent(primaryProgress)} {primaryProgress.unit !== 'hours' && primaryProgress.unit}</div>
              </div> */}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Remainder</div>
                <div className="font-medium">{formatRemainder(primaryProgress)} {primaryProgress.unit !== 'hours' && primaryProgress.unit}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Under/Over</div>
                <div className={`font-medium ${primaryProgress.behindPlan < 0 ? 'text-red-600' : primaryProgress.behindPlan > 0 ? 'text-green-600' : ''}`}>
                  {formatBehindPlan(primaryProgress)}
                </div>
              </div>
              <div >
                <div className="text-muted-foreground text-xs mb-1">Daily Pace</div>
                <div className="font-medium">{formatDailyPace(primaryProgress)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>{actions && actions}</CardFooter>
    </Card>
  )
}