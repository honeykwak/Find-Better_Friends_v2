'use client'

import { useRef, useMemo } from 'react'
import * as d3 from 'd3'
import useResizeObserver from '@/hooks/useResizeObserver'

interface HistogramProps {
  distributionData?: number[]
  min: number
  max: number
  values: [number, number]
  color?: string
  height?: number
  barCount?: number
}

export default function Histogram({
  distributionData,
  min,
  max,
  values,
  color = '#3b82f6',
  height = 40,
  barCount = 50,
}: HistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { width } = useResizeObserver(containerRef)

  const bins = useMemo(() => {
    if (!distributionData || distributionData.length === 0 || min >= max) {
      return []
    }

    const xScale = d3.scaleLinear().domain([min, max]).range([0, barCount])
    const bins = new Array(barCount).fill(0)

    for (const d of distributionData) {
      const binIndex = Math.floor(xScale(d))
      if (binIndex >= 0 && binIndex < barCount) {
        bins[binIndex]++
      }
    }
    return bins
  }, [distributionData, min, max, barCount])

  const maxBinValue = useMemo(() => Math.max(...bins, 1), [bins])
  const barWidth = width > 0 ? width / bins.length : 0

  return (
    <div ref={containerRef} style={{ width: '100%', height: `${height}px` }}>
      <svg width={width} height={height}>
        <g>
          {bins.map((d, i) => {
            const barHeight = (d / maxBinValue) * height
            const x = i * barWidth
            const binStartValue = min + (i / barCount) * (max - min)
            const binEndValue = min + ((i + 1) / barCount) * (max - min)
            
            const isInRange = binEndValue >= values[0] && binStartValue <= values[1]
            
            return (
              <rect
                key={i}
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                fill={isInRange ? color : '#e5e7eb'} // blue-500 or gray-200
                style={{ transition: 'fill 150ms ease-in-out' }}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
