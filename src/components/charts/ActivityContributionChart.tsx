import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import type { ContributionPoint } from '@/lib/dashboard/chartData'
import type { Metric } from '@/types/dashboard'
import { METRIC_UNITS } from '@/types/dashboard'
import './charts.css'

interface ActivityContributionChartProps {
  data: ContributionPoint[]
  metric: Metric
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function ActivityContributionChart({
  data,
  metric,
}: ActivityContributionChartProps) {
  const unit = METRIC_UNITS[metric]

  // Custom tooltip renderer using CSS classes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      const pct = payload[0].payload.percentage
      const name = payload[0].name

      return (
        <div className="Chart-tooltip">
          <div className="Chart-tooltip-title">{name}</div>
          <div className="Chart-tooltip-row">
            <span style={{ color: 'var(--muted-foreground)' }}>Total:</span>
            <span style={{ fontWeight: 600 }}>{val} {unit}</span>
          </div>
          <div className="Chart-tooltip-row">
            <span style={{ color: 'var(--muted-foreground)' }}>Share:</span>
            <span style={{ fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="Chart-contribution-layout">
      {/* Donut Chart */}
      <div className="Chart-contribution-pie">
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
                  fill={COLORS[index % COLORS.length]} 
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - custom list utilizing external stylesheet */}
      <div className="Chart-legend">
        {data.map((item, index) => {
          const color = COLORS[index % COLORS.length]
          return (
            <div key={item.name} className="Chart-legend-item">
              <div className="Chart-legend-label">
                <span 
                  className="Chart-legend-dot"
                  style={{ backgroundColor: color }} 
                />
                <span className="Chart-legend-text">
                  {item.name}
                </span>
              </div>
              <div className="Chart-legend-value">
                <span className="Chart-legend-number">
                  {item.value}
                </span>
                ({item.percentage}%)
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
