import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ContributionPoint } from '@/lib/dashboard/chartData'
import type { Metric } from '@/types/dashboard'
import { METRIC_UNITS } from '@/types/dashboard'
import './charts.css'

interface ActivityContributionChartProps {
  data: Array<ContributionPoint>
  metric: Metric
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function getActivityColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function ActivityContributionChart({ data, metric }: ActivityContributionChartProps) {
  const unit = METRIC_UNITS[metric]

  // Custom tooltip renderer using CSS classes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      const pct = payload[0].payload.percentage
      const name = payload[0].name

      return (
        <div className="Chart__Tooltip">
          <div className="Chart__TooltipTitle">{name}</div>
          <div className="Chart__TooltipRow">
            <span style={{ color: 'var(--muted-foreground)' }}>Total:</span>
            <span style={{ fontWeight: 600 }}>
              {val} {unit}
            </span>
          </div>
          <div className="Chart__TooltipRow">
            <span style={{ color: 'var(--muted-foreground)' }}>Share:</span>
            <span style={{ fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="Chart__ContributionLayout">
      {/* Donut Chart */}
      <div className="Chart__ContributionPie">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getActivityColor(index)}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - custom list utilizing external stylesheet */}
      <div className="Chart__Legend">
        {data.map((item, index) => {
          const color = getActivityColor(index)
          return (
            <div key={item.name} className="Chart__LegendItem">
              <div className="Chart__LegendLabel">
                <span className="Chart__LegendDot" style={{ backgroundColor: color }} />
                <span className="Chart__LegendText">{item.name}</span>
              </div>
              <div className="Chart__LegendValue">
                <span className="Chart__LegendNumber">{item.value}</span>({item.percentage}%)
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
