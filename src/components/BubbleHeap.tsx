'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { calculateSimilarity } from '@/lib/similarity'

type SimulationNode = d3.SimulationNodeDatum & {
  id: string
  moniker: string
  similarity: number
  avgPower: number
  x?: number
  y?: number
}

export default function BubbleHeap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined>>()

  const margin = useMemo(() => ({ top: 20, right: 20, bottom: 20, left: 50 }), [])
  const simSize = useMemo(() => ({ width: 800, height: 1600 }), []) // Adjusted height to 2x
  const boundedWidth = useMemo(() => simSize.width - margin.left - margin.right, [simSize, margin])
  const boundedHeight = useMemo(() => simSize.height - margin.top - margin.bottom, [simSize, margin])

  const {
    searchTerm,
    setSearchTerm,
    setHighlightedValidator,
    highlightedValidator,
  } = useGlobalStore()

  const filteredValidators = useGlobalStore(state => state.filteredValidators);

  const simulationData = useMemo((): SimulationNode[] => {
    if (!searchTerm || filteredValidators.length === 0) return []

    const baseValidator = filteredValidators.find(v => v.moniker === searchTerm)
    
    const nodes = filteredValidators
      .filter(v => typeof v.similarity === 'number')
      .map((validator) => ({
        id: validator.moniker,
        moniker: validator.moniker,
        similarity: validator.similarity!,
        avgPower: validator.avgPower || 0,
      }))

    if (baseValidator && !nodes.find(n => n.id === baseValidator.moniker)) {
      nodes.push({
        id: baseValidator.moniker,
        moniker: baseValidator.moniker,
        similarity: 1,
        avgPower: baseValidator.avgPower || 0,
      })
    }
    
    return nodes
  }, [searchTerm, filteredValidators])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${simSize.width} ${simSize.height}`)
      .style('width', '100%')
      .style('height', '100%');

    svg.selectAll('g').remove() // Clear previous elements

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
    
    const zoomG = g.append('g').attr('class', 'zoom-group')
    
    // The axis is now INSIDE the zoom group
    const axisG = zoomG.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${boundedWidth / 2}, 0)`) // Center the axis

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => zoomG.attr('transform', event.transform))
    
    svg.call(zoom as any)

    d3.select('body').selectAll('.d3-tooltip').remove()
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute').style('z-index', '10').style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.7)').style('color', '#fff')
      .style('padding', '8px').style('border-radius', '4px').style('font-size', '12px')

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(simulationData, (d) => d.avgPower) || 0])
      .range([4, 40]) // Reduced max radius from 60 to 40 for better balance

    const yScale = d3.scaleLinear().domain([0, 1]).range([boundedHeight, 0])
    
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%'))
    axisG.call(yAxis)
      .selectAll('text')
      .style('font-size', '12px')
    axisG.select('.domain').attr('stroke-width', 1.5)


    const circles = zoomG.selectAll<SVGCircleElement, SimulationNode>('circle')
      .data(simulationData, (d) => d.id)

    circles.exit().transition().duration(300).attr('r', 0).remove()

    const enterCircles = circles.enter().append('circle')
      .attr('r', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.similarity < 1) setSearchTerm(d.moniker)
      })
      .on('mouseover', (event, d) => {
        setHighlightedValidator(d.moniker)
        tooltip.html(`<strong>${d.moniker}</strong><br/>Similarity: ${d.similarity.toFixed(3)}<br/>Avg. Power: ${d.avgPower.toFixed(2)}`)
          .style('visibility', 'visible')
      })
      .on('mousemove', (event) => tooltip.style('top', `${event.pageY - 10}px`).style('left', `${event.pageX + 10}px`))
      .on('mouseout', () => {
        setHighlightedValidator(null)
        tooltip.style('visibility', 'hidden')
      })

    const allCircles = enterCircles.merge(circles)
    
    allCircles.transition().duration(500).attr('r', (d) => radiusScale(d.avgPower))

    if (simulationRef.current) {
      simulationRef.current.stop()
    }
    
    simulationRef.current = d3.forceSimulation(simulationData as SimulationNode[])
      .force('y', d3.forceY((d: any) => yScale(d.similarity)).strength(1))
      .force('x', d3.forceX(boundedWidth / 2).strength(0.05))
      .force('collide', d3.forceCollide((d: any) => radiusScale(d.avgPower)))
      .on('tick', () => {
        allCircles
          .attr('cx', (d) => d.x!)
          .attr('cy', (d) => d.y!)
      })

  }, [simulationData, simSize, margin, boundedWidth, boundedHeight, setSearchTerm, setHighlightedValidator])

  useEffect(() => {
    if (!svgRef.current) return
    d3.select(svgRef.current).selectAll('circle')
      .transition().duration(200)
      .attr('fill', (d: any) => {
        if (d.similarity === 1) return 'rgba(234, 179, 8, 0.8)' // Base validator color
        return highlightedValidator === d.moniker 
          ? 'rgba(234, 179, 8, 0.8)' // Highlight color
          : 'rgba(29, 78, 216, 0.6)' // Default color
      })
      .attr('stroke', (d: any) => {
        if (d.similarity === 1) return 'rgba(202, 138, 4, 1)'
        return highlightedValidator === d.moniker
          ? 'rgba(202, 138, 4, 1)'
          : 'rgba(29, 78, 216, 1)'
      })
  }, [highlightedValidator])

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">
          Similarity with: <span className="text-blue-600">{searchTerm}</span>
        </h3>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg ref={svgRef}></svg>
        {simulationData.length <= 1 && searchTerm && (
           <div className="absolute inset-0 flex items-center justify-center">
             <p className="text-gray-500">No other validators to compare.</p>
           </div>
        )}
      </div>
    </div>
  )
}

