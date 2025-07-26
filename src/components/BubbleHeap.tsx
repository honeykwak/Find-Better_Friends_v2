'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { motion, AnimatePresence } from 'framer-motion'

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
  const zoomGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>()
  const scalesRef = useRef<{
    radius: d3.ScaleSqrt<number, number>
    y: d3.ScaleLinear<number, number>
    boundedWidth: number
  }>()

  const {
    searchTerm,
    setSearchTerm,
    setHighlightedValidator,
    highlightedValidator,
    filteredValidators,
  } = useGlobalStore()

  const simulationData = useMemo((): SimulationNode[] => {
    if (!searchTerm || filteredValidators.length === 0) return []

    const baseValidator = filteredValidators.find(v => v.moniker === searchTerm)
    
    const nodes = filteredValidators
      .filter(v => typeof v.similarity === 'number')
      .map((validator) => ({
        id: validator.operator_address,
        moniker: validator.moniker,
        similarity: validator.similarity!,
        avgPower: validator.avgPower || 0,
      }))

    if (baseValidator && !nodes.find(n => n.id === baseValidator.operator_address)) {
      nodes.push({
        id: baseValidator.operator_address,
        moniker: baseValidator.moniker,
        similarity: 1,
        avgPower: baseValidator.avgPower || 0,
      })
    }
    
    return nodes.sort((a, b) => b.similarity - a.similarity);
  }, [searchTerm, filteredValidators])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const simSize = { width: 800, height: 1600 }
    const margin = { top: 20, right: 20, bottom: 20, left: 50 }
    const boundedWidth = simSize.width - margin.left - margin.right
    const boundedHeight = simSize.height - margin.top - margin.bottom

    scalesRef.current = {
      radius: d3.scaleSqrt().range([5, 45]),
      y: d3.scaleLinear().domain([0, 1]).range([boundedHeight, 0]),
      boundedWidth: boundedWidth,
    }

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${simSize.width} ${simSize.height}`)
      .style('width', '100%').style('height', '100%')

    svg.selectAll('g').remove()

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
    zoomGRef.current = g.append('g').attr('class', 'zoom-group')

    const axisG = zoomGRef.current.append('g').attr('class', 'y-axis')
      .attr('transform', `translate(${boundedWidth / 2}, 0)`)
    
    const yAxis = d3.axisLeft(scalesRef.current.y).ticks(5).tickFormat(d3.format('.0%'))
    axisG.call(yAxis).selectAll('text').style('font-size', '12px')
    axisG.select('.domain').attr('stroke-width', 1.5)

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 10])
      .on('zoom', (event) => zoomGRef.current?.attr('transform', event.transform))
    svg.call(zoom as any)

    simulationRef.current = d3.forceSimulation<SimulationNode>()
      .force('y', d3.forceY((d: any) => scalesRef.current!.y(d.similarity)).strength(1))
      .force('x', d3.forceX(boundedWidth / 2).strength(0.05))
      .on('tick', () => {
        zoomGRef.current?.selectAll<SVGCircleElement, SimulationNode>('circle')
          .attr('cx', d => d.x!).attr('cy', d => d.y!)
      })

    return () => simulationRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!zoomGRef.current || !scalesRef.current || !simulationRef.current) return

    const { radius: radiusScale, y: yScale, boundedWidth } = scalesRef.current
    
    const maxPower = d3.max(simulationData, d => d.avgPower) || 0
    radiusScale.domain([0, maxPower])

    d3.select('body').selectAll('.d3-tooltip').remove()
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute').style('z-index', '10').style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.7)').style('color', '#fff')
      .style('padding', '8px').style('border-radius', '4px').style('font-size', '12px')

    const oldNodeMap = new Map(simulationRef.current.nodes().map(d => [d.id, d]));
    simulationData.forEach(node => {
      const oldNode = oldNodeMap.get(node.id);
      if (oldNode) {
        node.x = oldNode.x;
        node.y = oldNode.y;
      }
    });

    // --- REVISED D3 DATA JOIN WITH SEPARATE TRANSITIONS ---
    const circles = zoomGRef.current
      .selectAll<SVGCircleElement, SimulationNode>('circle')
      .data(simulationData, d => d.id);

    // EXIT: Animate and remove circles that are no longer in the data
    circles.exit()
      .transition('exit_transition')
      .duration(300)
      .attr('r', 0)
      .remove();

    // ENTER: Create new circles, starting with radius 0
    const enterSelection = circles.enter().append('circle')
      .style('cursor', 'pointer')
      .attr('r', 0)
      .attr('cx', d => d.x || boundedWidth / 2)
      .attr('cy', d => d.y || yScale(d.similarity));

    // MERGE: Combine new (enter) and existing (update) circles
    const allCircles = enterSelection.merge(circles);

    // Apply event handlers to ALL circles
    allCircles
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
      });

    // UPDATE TRANSITION: Animate radius for existing circles
    circles
      .transition('update_radius_transition')
      .duration(750)
      .attr('r', d => radiusScale(d.avgPower));

    // ENTER TRANSITION: Animate radius for new circles from 0 to final size
    enterSelection
      .transition('enter_radius_transition')
      .duration(750)
      .attr('r', d => radiusScale(d.avgPower));
    // --- END REVISED D3 DATA JOIN ---

    simulationRef.current.nodes(simulationData);
    simulationRef.current.force('collide', d3.forceCollide((d: any) => radiusScale(d.avgPower) + 1));
    simulationRef.current.alpha(0.4).restart();

  }, [simulationData, setSearchTerm, setHighlightedValidator]);

  useEffect(() => {
    if (!zoomGRef.current) return
    zoomGRef.current.selectAll('circle')
      .transition().duration(200)
      .attr('fill', (d: any) => {
        if (d.similarity === 1) return 'rgba(234, 179, 8, 0.8)'
        return highlightedValidator === d.moniker ? 'rgba(234, 179, 8, 0.8)' : 'rgba(29, 78, 216, 0.6)'
      })
      .attr('stroke', (d: any) => {
        if (d.similarity === 1) return 'rgba(202, 138, 4, 1)'
        return highlightedValidator === d.moniker ? 'rgba(202, 138, 4, 1)' : 'rgba(29, 78, 216, 1)'
      })
  }, [highlightedValidator])

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">
          {searchTerm ? (
            <>Similarity with: <span className="text-blue-600">{searchTerm}</span></>
          ) : (
            "Validator Overview"
          )}
        </h3>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg ref={svgRef}></svg>
        <AnimatePresence>
          {!searchTerm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center p-4">
                <p className="text-gray-500 bg-gray-50 p-4 rounded-lg shadow-sm">
                  Select a validator from the heatmap or filter panel<br/>to see their similarity with others.
                </p>
              </div>
            </motion.div>
          ) : (
            simulationData.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <p className="text-gray-500 bg-white p-4 rounded-lg shadow-md">No other validators to compare.</p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

