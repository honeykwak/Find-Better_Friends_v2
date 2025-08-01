'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Range, getTrackBackground } from 'react-range'
import useResizeObserver from '@/hooks/useResizeObserver'

interface DistributionSliderProps {
  min: number
  max: number
  values: [number, number]
  onValuesChange?: (values: [number, number]) => void
  onChange: (values: [number, number]) => void
  formatValue?: (value: number) => string
  step: number
  distributionData?: number[]
}

const DistributionSlider: React.FC<DistributionSliderProps> = ({
  min,
  max,
  values: propValues,
  onValuesChange,
  onChange,
  formatValue = (v) => v.toString(),
  step,
  distributionData,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: containerWidth } = useResizeObserver(containerRef)
  const [localValues, setLocalValues] = useState(propValues)

  useEffect(() => {
    setLocalValues(propValues)
  }, [propValues])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (!svgRef.current || !distributionData || distributionData.length === 0 || containerWidth === 0) {
      svg.attr('viewBox', null).style('height', '0px')
      return
    }

    const height = 24
    const width = containerWidth
    const margin = { top: 5, right: 0, bottom: 4, left: 0 }

    const x = d3.scaleLinear().domain([min, max]).range([margin.left, width - margin.right])
    
    const histogram = d3.bin().domain(x.domain() as [number, number]).thresholds(x.ticks(40))
    const bins = histogram(distributionData)

    const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length) as number]).range([height - margin.bottom, margin.top])

    svg.attr('viewBox', `0 0 ${width} ${height}`).style('width', '100%').style('height', `${height}px`)

    svg.append('g')
      .selectAll('rect')
      .data(bins)
      .join('rect')
        .attr('x', d => x(d.x0!))
        .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
        .attr('y', d => y(d.length))
        .attr('height', d => y(0) - y(d.length))
        .style('fill', d => {
          const binCenter = (d.x0! + d.x1!) / 2
          return binCenter >= localValues[0] && binCenter <= localValues[1] ? '#9CA3AF' : '#E5E7EB'
        })

    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', height - margin.bottom)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', 1)

  }, [distributionData, min, max, containerWidth, localValues])

  const handleValuesChange = (newValues: number[]) => {
    const typedValues = newValues as [number, number]
    setLocalValues(typedValues)
    if (onValuesChange) {
      onValuesChange(typedValues)
    }
  }

  const getThumbValuePosition = (index: number) => {
    const range = max - min
    if (range === 0) return 'translate(-50%, 8px)'

    const percent = ((localValues[index] - min) / range) * 100
    const distance = Math.abs(localValues[0] - localValues[1]) / range * 100

    // Priority 1: Handle edges to prevent labels from going off-screen.
    if (percent < 5) return 'translate(0, 8px)'
    if (percent > 95) return 'translate(-100%, 8px)'

    // Priority 2: Handle overlap for non-edge cases.
    if (distance < 15) {
      return index === 0 
        ? 'translate(-100%, 8px)' // Push left thumb's label left
        : 'translate(0%, 8px)'   // Push right thumb's label right
    }
    
    // Default: Center the label.
    return 'translate(-50%, 8px)'
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef}></svg>
      <div className="h-4 flex justify-center items-center relative">
        <Range
          step={step}
          min={min}
          max={max}
          values={localValues}
          onChange={handleValuesChange}
          onFinalChange={(vals) => onChange(vals as [number, number])}
          renderTrack={({ props, children }) => (
            <div
              {...props}
              className="h-1 w-full rounded-full"
              style={{
                background: getTrackBackground({
                  values: localValues,
                  colors: ['#E5E7EB', '#6B7280', '#E5E7EB'],
                  min: min,
                  max: max,
                }),
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props: { key, ...restProps }, isDragged }) => (
            <div
              key={key}
              {...restProps}
              className="h-4 w-4 bg-white rounded-full shadow border-2 border-gray-400 focus:outline-none"
            >
              <div
                className={`h-full w-full rounded-full transition-colors ${isDragged ? 'bg-primary-accent' : 'bg-white'}`}
              />
            </div>
          )}
        />
      </div>
      <div className="relative h-4">
        {localValues.map((value, index) => {
          const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
          const label = formatValue(value);
          const labelWidth = label.length * 6; // Approximate width

          let leftPosition = `calc(${percent}% - ${labelWidth/2}px)`;
          if (percent < 5) leftPosition = `${percent}%`;
          if (percent > 95) leftPosition = `calc(${percent}% - ${labelWidth}px)`;
          
          // Overlap handling
          if (localValues.length === 2) {
            const distance = Math.abs(localValues[0] - localValues[1]) / (max - min) * 100;
            if (distance < 10) {
              if (index === 0) {
                leftPosition = `calc(${percent}% - ${labelWidth}px - 5px)`;
              } else {
                leftPosition = `calc(${percent}% + 5px)`;
              }
            }
          }

          return (
            <div
              key={index}
              className="absolute content-text text-gray-600 whitespace-nowrap"
              style={{
                left: leftPosition,
                top: 0,
              }}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DistributionSlider
