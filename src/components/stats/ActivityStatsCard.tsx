import * as React from 'react'
import type { ActivityTotals, StravaActivity } from '@/types/strava'
import type { Metric, TimeFrame } from '@/types/dashboard'
import type { ProgressMetric } from '@/lib/goals/calculations'
import {
  formatBehindPlan,
  formatCurrent,
  formatDailyPace,
  formatGoal,
  formatProgressSummary,
  formatRemainder,
} from '@/lib/goals/calculations'
import { getTimeFrameDescription } from '@/lib/dashboard/timeframes'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/custom/Card'
import { Badge } from '@/components/custom/Badge/Badge'
import { Progress } from '@/components/custom/Progress/Progress'

// Import data processing utilities
import {
  getActivityContribution,
  getBurnUpData,
  getHeatmapData,
  getWeeklyVolumeData,
} from '@/lib/dashboard/chartData'

// Import charts and charts styles
import { BurnUpChart } from '@/components/charts/BurnUpChart'
import { WeeklyVolumeChart } from '@/components/charts/WeeklyVolumeChart'
import { ActivityContributionChart } from '@/components/charts/ActivityContributionChart'
import { ConsistencyHeatmap } from '@/components/charts/ConsistencyHeatmap'
import '@/components/charts/charts.css'

interface ActivityStatsCardProps {
  types: Array<string>
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
  // Data props for charts
  cardActivities?: Array<StravaActivity>
  filteredActivities?: Array<StravaActivity>
  metric?: Metric
  goal?: number | null
}

export function ActivityStatsCard({
  types,
  title,
  actions,
  totals,
  timeFrame,
  customDateRange,
  progress,
  cardActivities = [],
  filteredActivities = [],
  metric,
  goal,
}: ActivityStatsCardProps) {
  const [activeTab, setActiveTab] = React.useState<
    'summary' | 'trend' | 'weekly' | 'heatmap' | 'breakdown'
  >('summary')

  // Determine primary progress metric (prefer distance > time > count)
  const primaryProgress =
    progress?.distance || progress?.time || progress?.count || progress?.elevation

  const timeFrameDescription = getTimeFrameDescription(timeFrame, customDateRange)

  // Compute visualization datasets
  const burnUpData = React.useMemo(() => {
    if (cardActivities.length === 0 || !metric) return []
    return getBurnUpData(cardActivities, timeFrame, goal, metric)
  }, [cardActivities, timeFrame, goal, metric])

  const weeklyData = React.useMemo(() => {
    if (cardActivities.length === 0 || !metric) return []
    return getWeeklyVolumeData(cardActivities, metric)
  }, [cardActivities, metric])

  const contributionData = React.useMemo(() => {
    if (filteredActivities.length === 0 || !metric) return []
    return getActivityContribution(filteredActivities, metric)
  }, [filteredActivities, metric])

  const heatmapData = React.useMemo(() => {
    if (cardActivities.length === 0) return []
    return getHeatmapData(cardActivities, 'count')
  }, [cardActivities])

  return (
    <Card state="active">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {types.map((type) => (
              <Badge key={type} variant="secondary">
                {type}
              </Badge>
            ))}
          </div>
          <Badge>{totals.count} Activities</Badge>
        </div>

        {/* Tab Switcher - styled using native variables and CSS, no Tailwind */}
        {cardActivities.length > 0 && (
          <div className="Chart__Tabs">
            <button
              onClick={() => setActiveTab('summary')}
              className={`Chart__Tab ${activeTab === 'summary' ? 'Chart__Tab--active' : ''}`}
            >
              Summary
            </button>

            {goal && (
              <button
                onClick={() => setActiveTab('trend')}
                className={`Chart__Tab ${activeTab === 'trend' ? 'Chart__Tab--active' : ''}`}
              >
                Trend
              </button>
            )}

            <button
              onClick={() => setActiveTab('weekly')}
              className={`Chart__Tab ${activeTab === 'weekly' ? 'Chart__Tab--active' : ''}`}
            >
              Weekly
            </button>

            <button
              onClick={() => setActiveTab('heatmap')}
              className={`Chart__Tab ${activeTab === 'heatmap' ? 'Chart__Tab--active' : ''}`}
            >
              Heatmap
            </button>

            {types.length > 1 && (
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`Chart__Tab ${activeTab === 'breakdown' ? 'Chart__Tab--active' : ''}`}
              >
                Breakdown
              </button>
            )}
          </div>
        )}

        {/* Dynamic Rendering of Tab Content */}
        {activeTab === 'summary' && primaryProgress && (
          <div className="space-y-8">
            {/* Progress Bar */}
            <Progress
              value={primaryProgress.percentage}
              label={formatProgressSummary(primaryProgress)}
            />

            {/* Goal Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Time Frame</div>
                <div className="font-medium">{timeFrameDescription}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Remainder</div>
                <div className="heading--4">
                  {formatRemainder(primaryProgress)}{' '}
                  {primaryProgress.unit !== 'hours' && primaryProgress.unit}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Under/Over</div>
                <div className="heading--4">{formatBehindPlan(primaryProgress)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Daily Pace</div>
                <div className="heading--4">{formatDailyPace(primaryProgress)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trend' && metric && (
          <BurnUpChart data={burnUpData} metric={metric} goal={goal} />
        )}

        {activeTab === 'weekly' && metric && (
          <WeeklyVolumeChart data={weeklyData} metric={metric} />
        )}

        {activeTab === 'heatmap' && <ConsistencyHeatmap data={heatmapData} metric="count" />}

        {activeTab === 'breakdown' && metric && (
          <ActivityContributionChart data={contributionData} metric={metric} />
        )}
      </CardContent>

      {actions && <CardFooter>{actions}</CardFooter>}
    </Card>
  )
}
