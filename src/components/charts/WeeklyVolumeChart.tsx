import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeeklyVolumePoint } from '@/lib/dashboard/chartData'
import type { Metric } from '@/types/dashboard'
import { METRIC_UNITS } from '@/types/dashboard'
import './charts.css'

interface WeeklyVolumeChartProps {
  data: Array<WeeklyVolumePoint>
  metric: Metric
}

export function WeeklyVolumeChart({ data, metric }: WeeklyVolumeChartProps) {
  const unit = METRIC_UNITS[metric]

  // Custom tooltip renderer using CSS classes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      const label = payload[0].payload.label

      return (
        <div className="Chart__Tooltip">
          <div className="Chart__TooltipTitle">Week of {label}</div>
          <div className="Chart__TooltipRow">
            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Volume:</span>
            <span style={{ fontWeight: 600 }}>
              {val} {unit}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="Chart__Wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.3}
            horizontal
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.15 }} />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
