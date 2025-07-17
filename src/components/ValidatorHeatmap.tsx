'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Palette } from 'lucide-react'

interface HeatmapConfig {
  cellWidth: number
  cellHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  colors: {
    yes: string
    no: string
    abstain: string
    noWithVeto: string
    noVote: string
    background: string
  }
}

const DEFAULT_CONFIG: HeatmapConfig = {
  cellWidth: 12,
  cellHeight: 12,
  margin: { top: 60, right: 120, bottom: 60, left: 180 },
  colors: {
    yes: '#22c55e',      // Green
    no: '#ef4444',       // Red  
    abstain: '#f59e0b',  // Orange
    noWithVeto: '#dc2626', // Dark Red
    noVote: '#e5e7eb',   // Light Gray
    background: '#ffffff'
  }
}

interface ProcessedHeatmapData {
  validators: Array<{
    id: string
    name: string
    index: number
  }>
  proposals: Array<{
    id: string
    title: string
    index: number
    passed: boolean
  }>
  votes: Array<{
    validatorIndex: number
    proposalIndex: number
    vote_code: number
    power: number
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
    rawProposals,
    rawValidators, 
    rawVotes,
    selectedChain,
    loading
  } = useGlobalStore()

  // 데이터 전처리 및 메모이제이션
  const heatmapData = useMemo((): ProcessedHeatmapData => {
    if (!rawProposals.length || !rawValidators.length || !rawVotes.length) {
      return { validators: [], proposals: [], votes: [] }
    }

    // 모든 검증자 선택 (정렬은 유지)
    const allValidators = rawValidators
      .slice()
      .sort((a, b) => {
        const aVotes = rawVotes.filter(v => v.validator_id === a.validator_id).length
        const bVotes = rawVotes.filter(v => v.validator_id === b.validator_id).length
        return bVotes - aVotes
      })

    // 모든 프로포절 선택 (정렬은 유지)
    const allProposals = rawProposals
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)

    // 인덱스 매핑
    const validators = allValidators.map((v, index) => ({
      id: v.validator_id,
      name: v.voter_name || 'Unknown',
      index
    }))

    const proposals = allProposals.map((p, index) => ({
      id: p.proposal_id,
      title: p.title,
      index,
      passed: p.passed
    }))

    // 투표 데이터 매핑
    const validatorIdToIndex = new Map(validators.map(v => [v.id, v.index]))
    const proposalIdToIndex = new Map(proposals.map(p => [p.id, p.index]))

    const votes = rawVotes
      .filter(vote => 
        validatorIdToIndex.has(vote.validator_id) && 
        proposalIdToIndex.has(vote.proposal_id)
      )
      .map(vote => ({
        validatorIndex: validatorIdToIndex.get(vote.validator_id)!,
        proposalIndex: proposalIdToIndex.get(vote.proposal_id)!,
        vote_code: vote.vote_code,
        power: vote.voting_power
      }))

    return { validators, proposals, votes }
  }, [rawProposals, rawValidators, rawVotes])

  // D3.js 히트맵 렌더링
  useEffect(() => {
    if (!svgRef.current || !heatmapData.validators.length || loading) return

    setIsLoading(true)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // 기존 내용 제거

    const { validators, proposals, votes } = heatmapData
    const { cellWidth, cellHeight, margin, colors } = config

    // 차트 크기 계산
    const chartWidth = proposals.length * cellWidth
    const chartHeight = validators.length * cellHeight
    const totalWidth = chartWidth + margin.left + margin.right
    const totalHeight = chartHeight + margin.top + margin.bottom

    // SVG 크기 설정
    svg
      .attr('width', totalWidth * zoom)
      .attr('height', totalHeight * zoom)
      .style('background', colors.background)

    // 메인 그룹 생성
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left * zoom}, ${margin.top * zoom}) scale(${zoom})`)

    // 투표 색상 매핑 (vote_code 기반)
    const getVoteColor = (code: number) => {
      switch (code) {
        case 5: return colors.yes;         // YES
        case 1: return colors.no;          // NO
        case 0: return colors.abstain;     // ABSTAIN
        case 3: return colors.noWithVeto;  // NO_WITH_VETO
        default: return colors.noVote;      // NO_VOTE, WEIGHTED_VOTE, UNKNOWN 등
      }
    }
    
    const getVoteString = (code: number) => {
      switch (code) {
        case 5: return 'YES';
        case 1: return 'NO';
        case 0: return 'ABSTAIN';
        case 3: return 'NO_WITH_VETO';
        case 4: return 'WEIGHTED_VOTE';
        default: return 'NO_VOTE';
      }
    }

    // 히트맵 셀 생성
    const cells = g.selectAll('.cell')
      .data(votes)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => d.proposalIndex * cellWidth)
      .attr('y', d => d.validatorIndex * cellHeight)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .attr('fill', d => getVoteColor(d.vote_code))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')

    // 인터랙션 추가
    cells
      .on('mouseover', function(event, d) {
        const validator = validators[d.validatorIndex]
        const proposal = proposals[d.proposalIndex]
        
        // 툴팁 표시 (간단한 구현)
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
            Vote: ${getVoteString(d.vote_code)}<br/>
            Power: ${(d.power * 100).toFixed(2)}%
          `)

        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')

        // 하이라이트 효과
        d3.select(this)
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove()
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
      })
      .on('click', function(event, d) {
        const validator = validators[d.validatorIndex]
        const proposal = proposals[d.proposalIndex]
        setSelectedValidator(validator.id)
        setSelectedProposal(proposal.id)
        console.log('Selected:', validator.name, proposal.title)
      })

    // Y축 레이블 (검증자)
    g.selectAll('.validator-label')
      .data(validators)
      .enter()
      .append('text')
      .attr('class', 'validator-label')
      .attr('x', -10)
      .attr('y', d => d.index * cellHeight + cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', `${Math.max(8, cellHeight * 0.6)}px`)
      .style('font-family', 'monospace')
      .text(d => d.name.slice(0, 20))
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedValidator(d.id))

    // X축 레이블 (프로포절) - 회전
    g.selectAll('.proposal-label')
      .data(proposals)
      .enter()
      .append('text')
      .attr('class', 'proposal-label')
      .attr('x', d => d.index * cellWidth + cellWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .attr('transform', d => `rotate(-45, ${d.index * cellWidth + cellWidth / 2}, -10)`)
      .style('font-size', `${Math.max(8, cellWidth * 0.6)}px`)
      .style('font-family', 'monospace')
      .text(d => `${d.title.slice(0, 15)}... ${d.passed ? '✓' : '✗'}`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedProposal(d.id))

    setIsLoading(false)

  }, [heatmapData, config, zoom, loading])

  // 줌 컨트롤
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3))
  const handleResetZoom = () => setZoom(1)

  // 색상 설정 변경
  const updateColors = (newColors: Partial<HeatmapConfig['colors']>) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, ...newColors }
    }))
  }

  if (loading) {
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
      {/* 컨트롤 패널 */}
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
          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-mono border-x border-gray-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-100 transition-colors border-l border-gray-300"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 색상 컨트롤 */}
          <button
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            title="Customize Colors"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 정보 패널 */}
      <div className="px-4 py-2 bg-blue-50 text-sm">
        <div className="flex items-center gap-6">
          <span>📊 {heatmapData.validators.length} validators × {heatmapData.proposals.length} proposals</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              YES
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              NO/VETO
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              ABSTAIN
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              NO VOTE
            </span>
          </div>
        </div>
      </div>

      {/* 메인 히트맵 영역 */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <svg ref={svgRef} className="block"></svg>
      </div>

      {/* 선택된 항목 정보 */}
      {(selectedValidator || selectedProposal) && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm">
            {selectedValidator && <p><strong>Selected Validator:</strong> {selectedValidator}</p>}
            {selectedProposal && <p><strong>Selected Proposal:</strong> {selectedProposal}</p>}
          </div>
        </div>
      )}
    </div>
  )
}