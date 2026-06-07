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
import { cn } from '@/lib/utils'
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
import './activity-stats-card.css'

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
  const [activeTab, setActiveTab] = React.useState<'main' | 'breakdown'>('main')

  // Determine primary progress metric (prefer distance > time > count)
  const primaryProgress =
    progress?.distance || progress?.time || progress?.count || progress?.elevation

  const timeFrameDescription = getTimeFrameDescription(timeFrame, customDateRange)

  // Convert goal from database units to display units for chart rendering
  const displayGoal = React.useMemo(() => {
    if (goal === null || goal === undefined || !metric) return goal
    switch (metric) {
      case 'distance':
        return goal / 1000
      case 'time':
        return goal / 3600
      default:
        return goal
    }
  }, [goal, metric])

  // Compute visualization datasets
  const burnUpData = React.useMemo(() => {
    if (cardActivities.length === 0 || !metric) return []
    return getBurnUpData(cardActivities, timeFrame, displayGoal, metric)
  }, [cardActivities, timeFrame, displayGoal, metric])

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
        <div className="ActivityStatsCard__Toolbar">
          <div className="ActivityStatsCard__Types">
            {types.map((type) => (
              <Badge key={type} variant="secondary">
                {type}
              </Badge>
            ))}
          </div>
          <Badge>{totals.count} Activities</Badge>
        </div>

        {primaryProgress && (
          <div className="ActivityStatsCard__Summary">
            {/* Progress Bar */}
            <Progress
              value={primaryProgress.percentage}
              label={formatProgressSummary(primaryProgress)}
            />

            {/* Goal Details */}
            <div className="ActivityStatsCard__Stats">
              <div>
                <div className="ActivityStatsCard__StatLabel">Time Frame</div>
                <div className="ActivityStatsCard__StatValueMuted">{timeFrameDescription}</div>
              </div>
              <div>
                <div className="ActivityStatsCard__StatLabel">Remainder</div>
                <div className="heading--4">
                  {formatRemainder(primaryProgress)}{' '}
                  {primaryProgress.unit !== 'hours' && primaryProgress.unit}
                </div>
              </div>
              <div>
                <div className="ActivityStatsCard__StatLabel">Under/Over</div>
                <div className="heading--4">{formatBehindPlan(primaryProgress)}</div>
              </div>
              <div>
                <div className="ActivityStatsCard__StatLabel">Daily Pace</div>
                <div className="heading--4">{formatDailyPace(primaryProgress)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher for multi-activity cards */}
        {types.length > 1 && cardActivities.length > 0 && (
          <div className="Chart__Tabs" style={{ marginTop: '1.5rem' }}>
            <button
              className={cn('Chart__Tab', activeTab === 'main' && 'Chart__Tab--active')}
              onClick={() => setActiveTab('main')}
            >
              {timeFrame === 'week' ? 'Volume' : timeFrame === 'month' ? 'Consistency' : 'Trend'}
            </button>
            <button
              className={cn('Chart__Tab', activeTab === 'breakdown' && 'Chart__Tab--active')}
              onClick={() => setActiveTab('breakdown')}
            >
              Breakdown
            </button>
          </div>
        )}

        {/* Dynamic Rendering of Timeframe-specific Graph */}
        {cardActivities.length > 0 && (activeTab === 'main' || types.length <= 1) && (
          <div className="ActivityStatsCard__Chart" style={{ marginTop: '1.5rem' }}>
            {timeFrame === 'week' && metric && (
              <WeeklyVolumeChart data={weeklyData} metric={metric} />
            )}
            {timeFrame === 'month' && (
              <ConsistencyHeatmap data={heatmapData} metric="count" />
            )}
            {(timeFrame === 'year' || timeFrame === 'ytd') && metric && goal && (
              <BurnUpChart data={burnUpData} metric={metric} goal={displayGoal} />
            )}
          </div>
        )}

        {/* Render Breakdown Chart for Cards with Multiple Activity Types */}
        {types.length > 1 && filteredActivities.length > 0 && metric && activeTab === 'breakdown' && (
          <div className="ActivityStatsCard__Chart" style={{ marginTop: '1.5rem' }}>
            <ActivityContributionChart data={contributionData} metric={metric} />
          </div>
        )}
      </CardContent>

      {actions && <CardFooter>{actions}</CardFooter>}
    </Card>
  )
}
