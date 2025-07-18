'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore, type ValidatorSortKey } from '@/stores/useGlobalStore'
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Palette } from 'lucide-react'
import { calculateSimilarity } from '@/lib/similarity'
import type { Vote, Validator } from '@/lib/dataLoader'

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
    id:string
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

interface ValidatorWithAvgPower extends Validator {
  avgPower: number;
}


export default function ValidatorHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [config, setConfig] = useState<HeatmapConfig>(DEFAULT_CONFIG)
  const [zoom, setZoom] = useState(1)
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    proposals: rawProposals,
    validators: rawValidators,
    votes: rawVotes,
    getFilteredProposals,
    getFilteredValidators,
    loading,
    searchTerm,
    setSearchTerm,
    validatorSortKey,
    setValidatorSortKey,
    votingPowerFilterMode,
    votingPowerRange,
    setVotingPowerDynamicRange,
    setVotingPowerRange,
  } = useGlobalStore()

  const searchTermRef = useRef(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  const validatorsWithAvgPower = useMemo((): ValidatorWithAvgPower[] => {
    const filteredProposals = getFilteredProposals();
    const validatorsForProcessing = getFilteredValidators();

    if (!filteredProposals.length || !validatorsForProcessing.length) {
      return [];
    }

    const proposalSet = new Set(filteredProposals.map(p => p.proposal_id));
    const validatorPowerSum = new Map<string, number>();
    const validatorVoteCount = new Map<string, number>();

    for (const vote of rawVotes) {
      if (proposalSet.has(vote.proposal_id)) {
        const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
        if (power && !isNaN(power)) {
          const address = vote.validator_address;
          validatorVoteCount.set(address, (validatorVoteCount.get(address) || 0) + 1);
          validatorPowerSum.set(address, (validatorPowerSum.get(address) || 0) + power);
        }
      }
    }

    const getAveragePower = (address: string) => {
      const sum = validatorPowerSum.get(address) || 0;
      const count = validatorVoteCount.get(address) || 0;
      return count > 0 ? sum / count : 0;
    };

    return validatorsForProcessing.map(v => ({
      ...v,
      avgPower: getAveragePower(v.validator_address)
    }));
  }, [getFilteredProposals, getFilteredValidators, rawVotes]);

  useEffect(() => {
    if (!validatorsWithAvgPower.length) {
      setVotingPowerDynamicRange([0, 100]);
      setVotingPowerRange([0, 100]);
      return;
    }

    if (votingPowerFilterMode === 'ratio') {
      const powers = validatorsWithAvgPower.map(v => v.avgPower);
      const minPower = Math.min(...powers);
      const maxPower = Math.max(...powers);
      // Floor the min and ceil the max to ensure the range includes the exact values.
      const newRange: [number, number] = [
        Math.floor(minPower * 10000) / 100, 
        Math.ceil(maxPower * 10000) / 100
      ];
      setVotingPowerDynamicRange(newRange);
      setVotingPowerRange(newRange);
    } else { // 'rank'
      const newRange: [number, number] = [1, validatorsWithAvgPower.length];
      setVotingPowerDynamicRange(newRange);
      setVotingPowerRange(newRange);
    }
  }, [validatorsWithAvgPower, votingPowerFilterMode, setVotingPowerDynamicRange, setVotingPowerRange]);


  const heatmapData = useMemo((): ProcessedHeatmapData => {
    const filteredProposals = getFilteredProposals()
    if (!filteredProposals.length || !validatorsWithAvgPower.length) {
      return { validators: [], proposals: [], votes: [] }
    }

    let finalFilteredValidators: ValidatorWithAvgPower[];

    if (votingPowerFilterMode === 'ratio') {
      const [minPower, maxPower] = votingPowerRange;
      const minRatio = minPower / 100;
      const maxRatio = maxPower / 100;
      finalFilteredValidators = validatorsWithAvgPower.filter(v => v.avgPower >= minRatio && v.avgPower <= maxRatio);
    } else { // 'rank'
      const rankedValidators = [...validatorsWithAvgPower].sort((a, b) => b.avgPower - a.avgPower);
      const [minRank, maxRank] = votingPowerRange;
      finalFilteredValidators = rankedValidators.slice(minRank - 1, maxRank);
    }

    const proposalSet = new Set(filteredProposals.map(p => p.proposal_id))
    const votesByValidator = new Map<string, Vote[]>()
    for (const vote of rawVotes) {
      if (!votesByValidator.has(vote.validator_address)) {
        votesByValidator.set(vote.validator_address, [])
      }
      votesByValidator.get(vote.validator_address)!.push(vote)
    }

    const sortedValidators = finalFilteredValidators.slice();

    if (validatorSortKey === 'similarity' && searchTerm) {
      const selectedValidator = rawValidators.find(v => v.moniker === searchTerm);
      if (selectedValidator) {
        const similarityScores = new Map<string, number>();
        const selectedVotes = votesByValidator.get(selectedValidator.validator_address) || [];
        
        for (const validator of sortedValidators) {
          const targetVotes = votesByValidator.get(validator.validator_address) || [];
          const score = calculateSimilarity(targetVotes, selectedVotes, proposalSet);
          similarityScores.set(validator.validator_address, score);
        }

        sortedValidators.sort((a, b) => {
          const scoreA = similarityScores.get(a.validator_address) || -2;
          const scoreB = similarityScores.get(b.validator_address) || -2;
          return scoreB - scoreA;
        });
      }
    } else if (validatorSortKey === 'name') {
      sortedValidators.sort((a, b) => (a.moniker || '').localeCompare(b.moniker || ''));
    } else if (validatorSortKey === 'votingPower') {
      sortedValidators.sort((a, b) => b.avgPower - a.avgPower);
    } else { // Default to 'voteCount'
      const validatorVoteCounts = new Map<string, number>();
      for (const vote of rawVotes) {
        if (proposalSet.has(vote.proposal_id)) {
          validatorVoteCounts.set(vote.validator_address, (validatorVoteCounts.get(vote.validator_address) || 0) + 1);
        }
      }
      sortedValidators.sort((a, b) => (validatorVoteCounts.get(b.validator_address) || 0) - (validatorVoteCounts.get(a.validator_address) || 0));
    }
    
    const validators = sortedValidators.map((v, index) => ({ address: v.validator_address, name: v.moniker || 'Unknown', index }))

    const proposals = filteredProposals
      .sort((a, b) => new Date(b.submit_time).getTime() - new Date(a.submit_time).getTime())
      .map((p, index) => ({ id: p.proposal_id, title: p.title, index, status: p.status }))

    const validatorAddressToIndex = new Map(validators.map(v => [v.address, v.index]))
    const proposalIdToIndex = new Map(proposals.map(p => [p.id, p.index]))

    const votes = rawVotes
      .filter(vote => validatorAddressToIndex.has(vote.validator_address) && proposalIdToIndex.has(vote.proposal_id))
      .map(vote => ({
        validatorIndex: validatorAddressToIndex.get(vote.validator_address)!,
        proposalIndex: proposalIdToIndex.get(vote.proposal_id)!,
        voteOption: vote.vote_option,
      }))

    return { validators, proposals, votes }
  }, [getFilteredProposals, validatorsWithAvgPower, rawVotes, validatorSortKey, searchTerm, rawValidators, votingPowerFilterMode, votingPowerRange])

  // Main D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || !heatmapData.validators.length || loading) {
      if (svgRef.current) d3.select(svgRef.current).selectAll('*').remove();
      setIsLoading(loading);
      return;
    }

    setIsLoading(true)
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { validators, proposals, votes } = heatmapData
    const { cellWidth, cellHeight, margin, colors } = config

    const chartWidth = proposals.length * cellWidth
    const chartHeight = validators.length * cellHeight
    const totalWidth = chartWidth + margin.left + margin.right
    const totalHeight = chartHeight + margin.top + margin.bottom

    svg.attr('width', totalWidth * zoom).attr('height', totalHeight * zoom).style('background', colors.background)
    const g = svg.append('g').attr('transform', `translate(${margin.left * zoom}, ${margin.top * zoom}) scale(${zoom})`)
    const getVoteColor = (option: string) => colors[option as keyof typeof colors] || colors.NO_VOTE

    g.selectAll('.cell')
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
      .on('mouseover', function(event, d) {
        const validator = validators[d.validatorIndex]
        const proposal = proposals[d.proposalIndex]
        d3.select('body').selectAll('.heatmap-tooltip').remove()
        const tooltip = d3.select('body').append('div').attr('class', 'heatmap-tooltip')
          .style('position', 'absolute').style('background', 'rgba(0,0,0,0.8)').style('color', 'white')
          .style('padding', '8px').style('border-radius', '4px').style('font-size', '12px')
          .style('pointer-events', 'none').style('z-index', '1000')
          .html(`<strong>${validator.name}</strong><br/>${proposal.title.slice(0, 50)}...<br/>Vote: ${d.voteOption}`)
        tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px')
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5)
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove()
        d3.select(this).attr('stroke', 'none')
      })
      .on('click', function(event, d) {
        const validator = validators[d.validatorIndex]
        if (searchTermRef.current === validator.name) {
          setSearchTerm('');
        } else {
          setSearchTerm(validator.name);
        }
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
      .on('click', (event, d) => {
        if (searchTermRef.current === d.name) {
          setSearchTerm('');
        } else {
          setSearchTerm(d.name);
        }
      })

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
  }, [heatmapData, config, zoom, loading, setSearchTerm])

  // Lightweight effect for highlighting only
  useEffect(() => {
    if (!svgRef.current || loading) return;
    const svg = d3.select(svgRef.current)
    const lowercasedSearchTerm = searchTerm.toLowerCase()

    svg.selectAll('.validator-label')
      .style('font-weight', d => ((d as { name: string }).name.toLowerCase() === lowercasedSearchTerm && searchTerm) ? 'bold' : 'normal')
      .style('fill', d => ((d as { name: string }).name.toLowerCase() === lowercasedSearchTerm && searchTerm) ? 'blue' : 'black')
  }, [searchTerm, loading, heatmapData.validators])


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
      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
        {/* Row 1: Title and Legend */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Heatmap
            </h3>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            {Object.entries(config.colors).filter(([key]) => key !== 'background' && key !== 'NO_VOTE').map(([key, color]) => (
              <span key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
                <span className="text-gray-600">{key.replace('_', ' ')}</span>
              </span>
            ))}
             <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: config.colors.NO_VOTE }}></div>
                <span className="text-gray-600">NO VOTE</span>
              </span>
          </div>
        </div>

        {/* Row 2: Sort and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setValidatorSortKey('votingPower')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'votingPower' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              title="Sort by voting power"
            >
              Avg. Voting Power
            </button>
            <button 
              onClick={() => setValidatorSortKey('voteCount')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'voteCount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              title="Sort by vote participation"
            >
              Vote Count
            </button>
            <button 
              onClick={() => setValidatorSortKey('name')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'name' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              title="Sort by name"
            >
              Name
            </button>
            <button 
              onClick={() => setValidatorSortKey('similarity')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'similarity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sort by similarity to the selected validator"
              disabled={!searchTerm}
            >
              Similarity
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
              <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
              <span className="px-3 py-2 text-sm font-mono border-x text-gray-800">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 border-l" title="Reset Zoom"><RotateCcw className="w-4 h-4" /></button>
            </div>
            <button className="p-2 border rounded-lg hover:bg-gray-100" title="Customize Colors"><Palette className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto">
        <svg ref={svgRef} className="block"></svg>
      </div>
    </div>
  )
}
