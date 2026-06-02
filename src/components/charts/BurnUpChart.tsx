import * as React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { BurnUpPoint } from '@/lib/dashboard/chartData'
import type { Metric } from '@/types/dashboard'
import { METRIC_UNITS } from '@/types/dashboard'
import './charts.css'

interface BurnUpChartProps {
  data: BurnUpPoint[]
  metric: Metric
  goal: number | null | undefined
}

export function BurnUpChart({ data, metric, goal }: BurnUpChartProps) {
  const unit = METRIC_UNITS[metric]

  // Custom tooltip renderer using standardized CSS classes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const actualVal = payload.find((p: any) => p.dataKey === 'actual')?.value
      const targetVal = payload.find((p: any) => p.dataKey === 'target')?.value
      const label = payload[0]?.payload?.date

      return (
        <div className="Chart__Tooltip">
          <div className="Chart__TooltipTitle">{label}</div>
          {actualVal !== undefined && (
            <div className="Chart__TooltipRow">
              <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Actual:</span>
              <span style={{ fontWeight: 600 }}>{actualVal} {unit}</span>
            </div>
          )}
          {targetVal !== undefined && goal && (
            <div className="Chart__TooltipRow">
              <span style={{ color: 'var(--muted-foreground)' }}>Target Pace:</span>
              <span style={{ fontWeight: 600 }}>{targetVal} {unit}</span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  // Calculate ticks for XAxis to prevent overcrowding (especially for year/ytd view)
  const interval = React.useMemo(() => {
    if (data.length > 100) return 30 // Month ticks for year
    if (data.length > 30) return 7 // Weekly ticks for month
    return 0 // All ticks for week
  }, [data.length])

  return (
    <div className="Chart__Wrapper">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.3}
            horizontal
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            interval={interval}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Cumulative Actual Progress Area */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#colorActual)"
            activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--color-primary)' }}
            connectNulls={false}
          />
          
          {/* Target Pace Line */}
          {goal && (
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
