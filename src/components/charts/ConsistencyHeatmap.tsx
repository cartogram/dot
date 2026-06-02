import * as React from 'react'
import type { HeatmapPoint } from '@/lib/dashboard/chartData'
import type { Metric } from '@/types/dashboard'
import { METRIC_UNITS } from '@/types/dashboard'
import { parseISO, format } from 'date-fns'
import './charts.css'

interface ConsistencyHeatmapProps {
  data: HeatmapPoint[]
  metric: Metric
}

export function ConsistencyHeatmap({ data, metric }: ConsistencyHeatmapProps) {
  const unit = METRIC_UNITS[metric]
  const [hoveredDay, setHoveredDay] = React.useState<HeatmapPoint | null>(null)
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Find max value for color scaling
  const maxValue = React.useMemo(() => {
    const vals = data.map((d) => d.value)
    return vals.length > 0 ? Math.max(...vals, 1) : 1
  }, [data])

  // Align days to start from Sunday of the first week of the year
  const alignedDays = React.useMemo(() => {
    if (data.length === 0) return []

    const firstDay = data[0]
    const firstDayOfWeek = firstDay.dayOfWeek // 0 = Sunday, 1 = Monday, etc.

    const result: Array<HeatmapPoint | null> = []

    // Add empty cells for days of the week before Jan 1
    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push(null)
    }

    // Add actual days
    data.forEach((day) => result.push(day))

    // Add trailing empty cells to complete the last week (column of 7 rows)
    const totalCells = result.length
    const remainder = totalCells % 7
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        result.push(null)
      }
    }

    return result
  }, [data])

  const handleMouseMove = (e: React.MouseEvent, day: HeatmapPoint) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    
    // Position tooltip above the cell
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 40,
    })
    setHoveredDay(day)
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
  }

  // Get color and opacity for a cell
  const getCellStyles = (day: HeatmapPoint) => {
    if (day.value === 0) {
      return {
        backgroundColor: 'var(--muted)',
        opacity: 0.35,
        cursor: 'default',
      }
    }

    // Scale opacity from 0.25 to 1.0 based on value relative to max
    const ratio = day.value / maxValue
    let opacity = 0.25
    if (ratio > 0.75) opacity = 1.0
    else if (ratio > 0.5) opacity = 0.75
    else if (ratio > 0.25) opacity = 0.5

    return {
      backgroundColor: 'var(--color-primary)',
      opacity: opacity,
      cursor: 'pointer',
    }
  }

  // Month labels layout helper (shows roughly where months start)
  const monthLabels = React.useMemo(() => {
    const labels: Array<{ text: string; colIndex: number }> = []
    let currentMonth = -1
    
    // Scan aligned days in column chunks of 7
    for (let i = 0; i < alignedDays.length; i += 7) {
      // Find first non-null day in this week column
      let firstDayInCol: HeatmapPoint | null = null
      for (let r = 0; r < 7; r++) {
        if (alignedDays[i + r]) {
          firstDayInCol = alignedDays[i + r]
          break
        }
      }

      if (firstDayInCol) {
        const date = parseISO(firstDayInCol.date)
        const month = date.getMonth()
        if (month !== currentMonth) {
          labels.push({
            text: format(date, 'MMM'),
            colIndex: i / 7,
          })
          currentMonth = month
        }
      }
    }
    return labels
  }, [alignedDays])

  return (
    <div ref={containerRef} className="Heatmap-container">
      {/* Month Labels row */}
      <div className="Heatmap-months">
        {monthLabels.map((lbl, idx) => (
          <span 
            key={`${lbl.text}-${idx}`}
            className="Heatmap-month"
            style={{ 
              left: `${lbl.colIndex * 11}px`, // 11px is the column width (9px cell + 2px gap)
            }}
          >
            {lbl.text}
          </span>
        ))}
      </div>

      {/* Grid container with days label on the left */}
      <div className="Heatmap-layout">
        {/* Left Day labels */}
        <div className="Heatmap-dayLabels">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        {/* Heatmap Grid */}
        <div className="Heatmap-grid">
          {alignedDays.map((day, idx) => {
            if (!day) {
              return (
                <div 
                  key={`empty-${idx}`} 
                  className="Heatmap-cell--empty"
                />
              )
            }

            return (
              <div
                key={day.date}
                onMouseMove={(e) => handleMouseMove(e, day)}
                onMouseLeave={handleMouseLeave}
                className="Heatmap-cell"
                style={{
                  transform: hoveredDay?.date === day.date ? 'scale(1.3)' : 'scale(1)',
                  zIndex: hoveredDay?.date === day.date ? 10 : 1,
                  ...getCellStyles(day),
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Premium custom tooltip popup */}
      {hoveredDay && (
        <div
          className="Heatmap-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <span className="Heatmap-tooltip-title">
            {hoveredDay.count} {hoveredDay.count === 1 ? 'activity' : 'activities'}
          </span>
          {hoveredDay.value > 0 && (
            <span>: {hoveredDay.value} {unit}</span>
          )}
          <div className="Heatmap-tooltip-date">
            {format(parseISO(hoveredDay.date), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      )}
    </div>
  )
}
