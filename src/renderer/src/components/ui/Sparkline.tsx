import React from 'react'

interface SparklineProps {
  data: number[]
  color?: string // defaults to var(--dd-accent)
  width?: number // defaults to 80
  height?: number // defaults to 24
}

const Sparkline: React.FC<SparklineProps> = React.memo(
  ({ data, color = 'var(--dd-accent)', width = 80, height = 24 }) => {
    if (data.length === 0) {
      return <svg width={width} height={height} />
    }

    const padding = 2
    const drawWidth = width - padding * 2
    const drawHeight = height - padding * 2

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * drawWidth
      const y = padding + drawHeight - ((value - min) / range) * drawHeight
      return `${x},${y}`
    })

    const polylinePoints = points.join(' ')

    // Build a closed path for the subtle fill area
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    const fillPath = `M${firstPoint} ${points.map((p) => `L${p}`).join(' ')} L${lastPoint?.split(',')[0]},${height - padding} L${firstPoint?.split(',')[0]},${height - padding} Z`

    return (
      <svg width={width} height={height} className="block" aria-hidden="true">
        <path d={fillPath} fill={color} opacity={0.1} />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
)

Sparkline.displayName = 'Sparkline'

export default Sparkline
