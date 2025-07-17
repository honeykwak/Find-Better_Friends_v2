'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Palette } from 'lucide-react'

// ... (interfaces and config remain the same)

interface HeatmapConfig {
  cellWidth: number
  cellHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  colors: {
    YES: string
    NO: string
    ABSTAIN: string
    NO_WITH_VETO: string
    NO_VOTE: string
    background: string
  }
}

const DEFAULT_CONFIG: HeatmapConfig = {
  cellWidth: 12,
  cellHeight: 12,
  margin: { top: 80, right: 120, bottom: 60, left: 180 },
  colors: {
    YES: '#22c55e',      // Green
    NO: '#ef4444',       // Red  
    ABSTAIN: '#f59e0b',  // Orange
    NO_WITH_VETO: '#dc2626', // Dark Red
    NO_VOTE: '#e5e7eb',   // Light Gray
    background: '#ffffff'
  }
}

interface ProcessedHeatmapData {
  validators: Array<{
    address: string
    name: string
    index: number
  }>
  proposals: Array<{
    id: string
    title: string
    index: number
    status: string
  }>
  votes: Array<{
    validatorIndex: number
    proposalIndex: number
    voteOption: string
  }>
}

export default function ValidatorHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [config, setConfig] = useState<HeatmapConfig>(DEFAULT_CONFIG)
  const [zoom, setZoom] = useState(1)
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null)
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    proposals: rawProposals,
    validators: rawValidators,
    votes: rawVotes,
    getFilteredProposals,
    getFilteredValidators,
    selectedChain,
    loading,
    selectedTopics,
    searchTerm,
  } = useGlobalStore()

  // 데이터 전처리 및 메모이제이션
  const heatmapData = useMemo((): ProcessedHeatmapData => {
    const filteredProposals = getFilteredProposals()
    const filteredValidators = getFilteredValidators()

    if (!filteredProposals.length || !filteredValidators.length) {
      return { validators: [], proposals: [], votes: [] }
    }

    const validatorSet = new Set(filteredValidators.map(v => v.validator_address))
    const proposalSet = new Set(filteredProposals.map(p => p.proposal_id))

    const validators = filteredValidators
      .sort((a, b) => {
        const aVotes = rawVotes.filter(v => v.validator_address === a.validator_address).length
        const bVotes = rawVotes.filter(v => v.validator_address === b.validator_address).length
        return bVotes - aVotes
      })
      .map((v, index) => ({
        address: v.validator_address,
        name: v.moniker || 'Unknown',
        index,
      }))

    const proposals = filteredProposals
      .sort((a, b) => {
        const proposalA = rawProposals.find(p => p.proposal_id === a.proposal_id)
        const proposalB = rawProposals.find(p => p.proposal_id === b.proposal_id)
        return new Date(proposalB?.submit_time || 0).getTime() - new Date(proposalA?.submit_time || 0).getTime()
      })
      .map((p, index) => ({
        id: p.proposal_id,
        title: p.title,
        index,
        status: p.status,
      }))

    const validatorAddressToIndex = new Map(validators.map(v => [v.address, v.index]))
    const proposalIdToIndex = new Map(proposals.map(p => [p.id, p.index]))

    const votes = rawVotes
      .filter(
        vote =>
          validatorAddressToIndex.has(vote.validator_address) && proposalIdToIndex.has(vote.proposal_id),
      )
      .map(vote => ({
        validatorIndex: validatorAddressToIndex.get(vote.validator_address)!,
        proposalIndex: proposalIdToIndex.get(vote.proposal_id)!,
        voteOption: vote.vote_option,
      }))

    return { validators, proposals, votes }
  }, [rawProposals, rawValidators, rawVotes, selectedTopics, searchTerm, getFilteredProposals, getFilteredValidators])

  // D3.js 히트맵 렌더링
  useEffect(() => {
    if (!svgRef.current || !heatmapData.validators.length || loading) {
      if (svgRef.current) d3.select(svgRef.current).selectAll('*').remove();
      setIsLoading(loading);
      return;
    };

    setIsLoading(true)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { validators, proposals, votes } = heatmapData
    const { cellWidth, cellHeight, margin, colors } = config

    const chartWidth = proposals.length * cellWidth
    const chartHeight = validators.length * cellHeight
    const totalWidth = chartWidth + margin.left + margin.right
    const totalHeight = chartHeight + margin.top + margin.bottom

    svg
      .attr('width', totalWidth * zoom)
      .attr('height', totalHeight * zoom)
      .style('background', colors.background)

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left * zoom}, ${margin.top * zoom}) scale(${zoom})`)

    const getVoteColor = (option: string) => {
      return colors[option as keyof typeof colors] || colors.NO_VOTE;
    }

    const cells = g.selectAll('.cell')
      .data(votes)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => d.proposalIndex * cellWidth)
      .attr('y', d => d.validatorIndex * cellHeight)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .attr('fill', d => getVoteColor(d.voteOption))
      .style('cursor', 'pointer')

    cells
      .on('mouseover', function(event, d) {
        const validator = validators[d.validatorIndex]
        const proposal = proposals[d.proposalIndex]
        
        d3.select('body').selectAll('.heatmap-tooltip').remove();
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'heatmap-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <strong>${validator.name}</strong><br/>
            ${proposal.title.slice(0, 50)}...<br/>
            Vote: ${d.voteOption}
          `)

        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')

        d3.select(this)
          .attr('stroke', '#000')
          .attr('stroke-width', 1.5)
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove()
        d3.select(this)
          .attr('stroke', 'none')
      })
      .on('click', function(event, d) {
        const validator = validators[d.validatorIndex]
        const proposal = proposals[d.proposalIndex]
        setSelectedValidator(validator.address)
        setSelectedProposal(proposal.id)
      })

    g.selectAll('.validator-label')
      .data(validators)
      .enter()
      .append('text')
      .attr('class', 'validator-label')
      .attr('x', -10)
      .attr('y', d => d.index * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', `${Math.max(8, cellHeight * 0.7)}px`)
      .text(d => d.name.slice(0, 25))
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedValidator(d.address))

    g.selectAll('.proposal-label')
      .data(proposals)
      .enter()
      .append('text')
      .attr('class', 'proposal-label')
      .attr('x', d => d.index * cellWidth + cellWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .attr('transform', d => `rotate(-60, ${d.index * cellWidth + cellWidth / 2}, -10)`)
      .style('font-size', `${Math.max(8, cellWidth * 0.7)}px`)
      .text(d => `${d.title.slice(0, 20)}... ${d.status.includes('PASSED') ? '✓' : '✗'}`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedProposal(d.id))

    setIsLoading(false)

  }, [heatmapData, config, zoom, loading, rawProposals])

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.2))
  const handleResetZoom = () => setZoom(1)

  if (loading && !heatmapData.validators.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading chain data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Validator-Proposal Heatmap ({selectedChain})
          </h3>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
            <span className="px-3 py-2 text-sm font-mono border-x">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 border-l" title="Reset Zoom"><RotateCcw className="w-4 h-4" /></button>
          </div>
          <button className="p-2 border rounded-lg hover:bg-gray-100" title="Customize Colors"><Palette className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="px-4 py-2 bg-blue-50 text-sm">
        <div className="flex items-center gap-6">
          <span>📊 {heatmapData.validators.length} validators × {heatmapData.proposals.length} proposals</span>
          <div className="flex items-center gap-4">
            {Object.entries(config.colors).filter(([key]) => key !== 'background' && key !== 'NO_VOTE').map(([key, color]) => (
              <span key={key} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
                {key}
              </span>
            ))}
             <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: config.colors.NO_VOTE }}></div>
                NO VOTE
              </span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto">
        <svg ref={svgRef} className="block"></svg>
      </div>
    </div>
  )
}
