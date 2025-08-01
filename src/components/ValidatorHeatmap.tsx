'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore, type ValidatorSortKey, type ProposalForHeatmap } from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import { CATEGORY_COLORS } from '@/constants/categoryColors'
import ToggleButtonGroup from './ui/ToggleButtonGroup'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { Vote, Validator, Proposal } from '@/lib/dataLoader'

// Helper function for percentile calculation using linear interpolation
const getPercentilePower = (percentile: number, sortedValidators: { avgPower?: any }[]): number => {
  const sortedPowers = sortedValidators.map(v => {
    const power = Number(v.avgPower || 0);
    return isFinite(power) ? power : 0;
  });

  const count = sortedPowers.length;
  if (count === 0) return 0;

  if (percentile <= 0) return sortedPowers[0];
  if (percentile >= 100) return sortedPowers[count - 1];

  const index = (percentile / 100) * (count - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedPowers[lowerIndex];
  }

  const lowerValue = sortedPowers[lowerIndex];
  const upperValue = sortedPowers[upperIndex];
  const fraction = index - lowerIndex;

  return lowerValue + fraction * (upperValue - lowerValue);
};

// Define layout constants
const PROPOSAL_LABEL_HEIGHT = 240;
const SUMMARY_CHART_HEIGHT = 120;
const CATEGORY_ROW_HEIGHT = 12; // Same as default cellHeight
const CHART_SPACING = 20;
const TOP_MARGIN = PROPOSAL_LABEL_HEIGHT + SUMMARY_CHART_HEIGHT + CATEGORY_ROW_HEIGHT + CHART_SPACING * 2;

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
  margin: { top: TOP_MARGIN, right: 120, bottom: 60, left: 180 },
  colors: {
    ...VOTE_COLORS,
    background: '#ffffff'
  }
}

interface ProcessedHeatmapData {
  validators: Array<{
    address: string
    moniker: string
    displayName: string
    index: number
  }>
  proposals: Array<{
    id: string
    title: string
    index: number
    status: string
    category: string
    isFilteredIn: boolean
    voteDistribution: { [key: string]: number }
  }>
  votes: Array<{
    validatorAddress: string
    proposalId: string
    validatorIndex: number
    proposalIndex: number
    voteOption: string
    votingPower: number | string
  }>
}

export default function ValidatorHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [config, setConfig] = useState<HeatmapConfig>(DEFAULT_CONFIG)
  const [zoom, setZoom] = useState(1)
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    votes: rawVotes,
    getProposalsForHeatmap,
    loading,
    searchTerm,
    setSearchTerm,
    validatorSortKey,
    setValidatorSortKey,
    recalculateValidatorMetrics,
    highlightedValidator,
    categoryVisualizationMode,
    votingPowerSortType,
    matchAbstainInSimilarity,
    setMatchAbstainInSimilarity,
  } = useGlobalStore()
  
  const filteredValidators = useGlobalStore(state => state.filteredValidators);

  const searchTermRef = useRef(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    recalculateValidatorMetrics();
  }, [getProposalsForHeatmap, recalculateValidatorMetrics]);


  const heatmapData = useMemo((): ProcessedHeatmapData => {
    const proposalsForHeatmap = getProposalsForHeatmap();
    
    if (!proposalsForHeatmap.length || !filteredValidators.length) {
      return { validators: [], proposals: [], votes: [] };
    }
    
    const sortedValidators = [...filteredValidators];
    const validatorDisplayValues = new Map<string, string>();

    // Sorting logic remains here as it's a presentation concern
    if (validatorSortKey === 'similarity' && searchTerm) {
      sortedValidators.sort((a, b) => {
        if (a.moniker === searchTerm) return -1;
        if (b.moniker === searchTerm) return 1;
        return (b.similarity || 0) - (a.similarity || 0);
      });
      for (const validator of sortedValidators) {
        if (typeof validator.similarity === 'number') {
          validatorDisplayValues.set(validator.validator_address, `(${(validator.similarity * 100).toFixed(0)}%)`);
        }
      }
    } else { // Default to 'votingPower'
      if (votingPowerSortType === 'recent') {
        sortedValidators.sort((a, b) => (b.recentVotingPower || 0) - (a.recentVotingPower || 0));
        for (const validator of sortedValidators) {
            if (typeof validator.recentVotingPower === 'number') {
                validatorDisplayValues.set(validator.validator_address, `(${(validator.recentVotingPower * 100).toFixed(1)}%)`);
            }
        }
      } else { // 'average'
        sortedValidators.sort((a, b) => (b.avgPower || 0) - (a.avgPower || 0));
        for (const validator of sortedValidators) {
          validatorDisplayValues.set(validator.validator_address, `(${( (validator.avgPower || 0) * 100).toFixed(1)}%)`);
        }
      }
    }
    
    const validators = sortedValidators.map((v, index) => ({
      address: v.validator_address,
      moniker: v.moniker || 'Unknown',
      displayValue: validatorDisplayValues.get(v.validator_address) || '',
      index
    }));

    const proposals = proposalsForHeatmap
      .map((p, index) => ({
        id: p.proposal_id,
        title: p.title,
        index,
        status: p.status,
        category: p.type, // Use `type` for the main category
        voteDistribution: p.voteDistribution || {},
        isFilteredIn: p.isFilteredIn,
      }));

    const validatorAddressToIndex = new Map(validators.map(v => [v.address, v.index]));
    const proposalIdToIndex = new Map(proposals.map(p => [p.id, p.index]));

    const votes = rawVotes
      .filter(vote => validatorAddressToIndex.has(vote.validator_address) && proposalIdToIndex.has(vote.proposal_id))
      .map(vote => ({
        validatorAddress: vote.validator_address,
        proposalId: vote.proposal_id,
        validatorIndex: validatorAddressToIndex.get(vote.validator_address)!,
        proposalIndex: proposalIdToIndex.get(vote.proposal_id)!,
        voteOption: vote.vote_option,
        votingPower: vote.voting_power,
      }));

    return { validators, proposals, votes };
  }, [filteredValidators, getProposalsForHeatmap, rawVotes, validatorSortKey, searchTerm, votingPowerSortType, categoryVisualizationMode]);

  // Main D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || loading) {
      setIsLoading(loading);
      return;
    }
    setIsLoading(true);

    const DURATION = 500;
    const svg = d3.select(svgRef.current);
    
    const { validators, proposals, votes } = heatmapData;
    const { cellWidth, cellHeight, margin, colors } = config;

    const chartWidth = proposals.length * cellWidth;
    const chartHeight = validators.length * cellHeight;
    const totalWidth = chartWidth + margin.left + margin.right;
    const totalHeight = chartHeight + margin.top + margin.bottom;

    svg.attr('width', totalWidth * zoom).attr('height', totalHeight * zoom);
    const g = svg.selectAll('.main-group').data([null])
      .join('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left * zoom}, ${margin.top * zoom}) scale(${zoom})`);

    const getVoteColor = (option: string) => colors[option as keyof typeof colors] || colors.NO_VOTE;

    const validatorGroups = g.selectAll('.validator-row')
      .data(validators, (d: any) => d.address);

    validatorGroups.exit().transition().duration(DURATION).style('opacity', 0).remove();

    const validatorGroupsEnter = validatorGroups.enter().append('g')
      .attr('class', 'validator-row')
      .attr('transform', (d: any) => `translate(0, ${d.index * cellHeight})`)
      .style('opacity', 0);

    validatorGroupsEnter.append('rect')
      .attr('class', 'validator-row-bg')
      .attr('x', -margin.left)
      .attr('width', totalWidth)
      .attr('height', cellHeight);

    validatorGroupsEnter.append('text')
      .attr('class', 'validator-label')
      .attr('x', -10)
      .attr('y', cellHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', `${Math.max(8, cellHeight * 0.7)}px`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        if (searchTermRef.current === d.moniker) setSearchTerm('');
        else setSearchTerm(d.moniker);
      });

    const mergedValidatorGroups = validatorGroupsEnter.merge(validatorGroups as any);

    mergedValidatorGroups.transition().duration(DURATION)
      .attr('transform', (d: any) => `translate(0, ${d.index * cellHeight})`)
      .style('opacity', 1);
    
    // Set initial background color without transition
    mergedValidatorGroups.select('.validator-row-bg').attr('fill', (d: any) => d.moniker === highlightedValidator ? 'rgba(252, 211, 77, 0.3)' : 'transparent');

    mergedValidatorGroups.select('.validator-label')
      .text((d: any) => {
        const MAX_LENGTH = 35;
        const value = d.displayValue || '';
        const valueLength = value.length;
        const maxMonikerLength = MAX_LENGTH - valueLength - (valueLength > 0 ? 1 : 0);

        let moniker = d.moniker;
        if (moniker.length > maxMonikerLength) {
          moniker = moniker.slice(0, maxMonikerLength - 3) + '...';
        }
        
        return `${moniker} ${value}`.trim();
      })
      .style('font-weight', (d: any) => (searchTerm && d.moniker === searchTerm) ? 'bold' : 'normal')
      .style('fill', (d: any) => {
        if (searchTerm && d.moniker === searchTerm) return '#EECF8C';
        return 'black';
      });

    const cells = mergedValidatorGroups.selectAll('.cell')
      .data((d: any) => votes.filter(vote => vote.validatorAddress === d.address), (d: any) => d.proposalId);

    cells.exit().transition().duration(DURATION).style('opacity', 0).remove();

    const cellsEnter = cells.enter().append('rect')
      .attr('class', 'cell')
      .attr('y', 0)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .style('cursor', 'pointer')
      .attr('x', (d: any) => proposals.find(p => p.id === d.proposalId)!.index * cellWidth)
      .style('opacity', 0);

    const mergedCells = cellsEnter.merge(cells as any);
    
    mergedCells.on('click', (event, d: any) => {
        const validator = validators.find(v => v.address === d.validatorAddress);
        if (validator) {
          if (searchTermRef.current === validator.moniker) setSearchTerm('');
          else setSearchTerm(validator.moniker);
        }
      })
      .on('mouseover', function(event, d: any) {
        const validator = validators.find(v => v.address === d.validatorAddress);
        const proposal = proposals.find(p => p.id === d.proposalId);
        if (!validator || !proposal) return;
        const power = typeof d.votingPower === 'string' ? parseFloat(d.votingPower) : d.votingPower;
        const formattedPower = !isNaN(power) ? power.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'N/A';
        d3.select('body').selectAll('.heatmap-tooltip').remove();
        const tooltip = d3.select('body').append('div').attr('class', 'heatmap-tooltip').style('position', 'absolute').style('background', 'rgba(0,0,0,0.8)').style('color', 'white').style('padding', '8px').style('border-radius', '4px').style('font-size', '12px').style('pointer-events', 'none').style('z-index', '1000').style('max-width', '300px').html(`<strong>${validator.moniker}</strong><br/>Proposal #${d.proposalId}: ${proposal.title}<br/>Category: ${proposal.category}<br/><hr style="margin: 4px 0; border-color: rgba(255,255,255,0.5);"/>Vote: <strong style="font-weight: 500;">${d.voteOption}</strong><br/>Voting Power: ${formattedPower}`);
        tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5);
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove();
        d3.select(this).attr('stroke', 'none');
      });

    mergedCells.transition().duration(DURATION)
      .attr('x', (d: any) => proposals.find(p => p.id === d.proposalId)!.index * cellWidth)
      .attr('fill', (d: any) => getVoteColor(d.voteOption))
      .style('opacity', (d: any) => {
        const proposal = proposals.find(p => p.id === d.proposalId);
        return proposal?.isFilteredIn ? 1 : 0.3;
      });
      
    const proposalLabels = g.selectAll('.proposal-label').data(proposals, (d: any) => d.id);
    
    proposalLabels.exit().transition().duration(DURATION).style('opacity', 0).remove();

    const proposalLabelsEnter = proposalLabels.enter().append('text')
      .attr('class', 'proposal-label')
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => setSelectedProposal(d.id))
      .attr('text-anchor', 'start')
      .style('font-size', `${Math.max(8, cellWidth * 0.7)}px`)
      .style('opacity', 0)
      .attr('x', (d: any) => d.index * cellWidth + cellWidth / 2)
      .attr('y', -SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT - 5) // Tighter spacing
      .attr('transform', (d: any) => `rotate(-60, ${d.index * cellWidth + cellWidth / 2}, ${-SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT - 5})`)
      .style('fill', (d: any) => CATEGORY_COLORS[d.category] || '#1F2937') // Use category color
      .text((d: any) => {
        const title = `#${d.id} ${d.title}`;
        return `${title.slice(0, 40)}${title.length > 40 ? '...' : ''}` // Removed status icon
      });

    proposalLabels.merge(proposalLabelsEnter)
      .transition().duration(DURATION)
      .attr('x', (d: any) => d.index * cellWidth + cellWidth / 2)
      .attr('y', -SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT - 5) // Tighter spacing
      .attr('transform', (d: any) => `rotate(-60, ${d.index * cellWidth + cellWidth / 2}, ${-SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT - 5})`)
      .style('opacity', (d: any) => d.isFilteredIn ? 1 : 0.3);

    // Category color indicators
    const categoryIndicators = g.selectAll('.category-indicator-group').data(proposals, (d: any) => d.id);
    categoryIndicators.exit().transition().duration(DURATION).style('opacity', 0).remove();
    
    const categoryIndicatorsEnter = categoryIndicators.enter().append('g')
      .attr('class', 'category-indicator-group')
      .style('cursor', 'pointer')
      .attr('transform', (d: any) => `translate(${d.index * cellWidth}, ${-SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT})`); // Position above summary chart

    categoryIndicatorsEnter.append('rect')
      .attr('width', cellWidth - 1)
      .attr('height', CATEGORY_ROW_HEIGHT - 1);

    categoryIndicatorsEnter.append('text')
      .attr('class', 'status-checkmark')
      .attr('x', (cellWidth - 1) / 2)
      .attr('y', (CATEGORY_ROW_HEIGHT - 1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', `${Math.max(8, cellWidth * 0.8)}px`)
      .style('fill', 'white')
      .style('pointer-events', 'none');

    const mergedIndicators = categoryIndicators.merge(categoryIndicatorsEnter);

    mergedIndicators
      .on('mouseover', function(event, d: any) {
        d3.select('body').selectAll('.heatmap-tooltip').remove();
        const tooltip = d3.select('body').append('div').attr('class', 'heatmap-tooltip').style('position', 'absolute').style('background', 'rgba(0,0,0,0.8)').style('color', 'white').style('padding', '8px').style('border-radius', '4px').style('font-size', '12px').style('pointer-events', 'none').style('z-index', '1000');
        tooltip.html(`Category: <strong>${d.category}</strong>`);
        tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove();
      });

    mergedIndicators.transition().duration(DURATION)
      .attr('transform', (d: any) => `translate(${d.index * cellWidth}, ${-SUMMARY_CHART_HEIGHT - (2 * cellHeight) - CATEGORY_ROW_HEIGHT})`) // Position above summary chart
      .style('opacity', (d: any) => d.isFilteredIn ? 1 : 0.3);

    mergedIndicators.select('rect')
      .transition().duration(DURATION)
      .attr('fill', (d: any) => CATEGORY_COLORS[d.category] || '#E5E7EB');
      
    mergedIndicators.select('.status-checkmark')
      .text((d: any) => d.status.includes('PASSED') ? '✓' : '');

    const summaryG = g.selectAll('.summary-chart').data([null]).join('g').attr('class', 'summary-chart').attr('transform', `translate(0, ${-SUMMARY_CHART_HEIGHT - (2 * cellHeight)})`); // 2-cell gap
    const summaryChartYScale = d3.scaleLinear().domain([0, 1]).range([SUMMARY_CHART_HEIGHT, 0]);
    const stack = d3.stack().keys(VOTE_ORDER);
    const stackedData = stack(proposals.map(p => {
      const total = Object.values(p.voteDistribution).reduce((s, c) => s + c, 0);
      const ratios = { id: p.id, index: p.index, isFilteredIn: p.isFilteredIn } as any;
      VOTE_ORDER.forEach(key => ratios[key] = total > 0 ? (p.voteDistribution[key] || 0) / total : 0);
      return ratios;
    }));
    summaryG.selectAll('.bar-series').data(stackedData).join('g').attr('class', 'bar-series').attr('fill', (d: any) => getVoteColor(d.key)).selectAll('rect').data(d => d, (d: any) => d.data.id)
      .join(
        enter => enter.append('rect')
          .attr('x', d => d.data.index * cellWidth)
          .attr('y', d => summaryChartYScale(d[1]))
          .attr('height', d => summaryChartYScale(d[0]) - summaryChartYScale(d[1]))
          .attr('width', cellWidth - 1)
          .style('opacity', 0)
          .transition().duration(DURATION)
          .style('opacity', (d: any) => d.data.isFilteredIn ? 1 : 0.3),
        update => update.transition().duration(DURATION)
          .attr('x', d => d.data.index * cellWidth)
          .attr('y', d => summaryChartYScale(d[1]))
          .attr('height', d => summaryChartYScale(d[0]) - summaryChartYScale(d[1]))
          .style('opacity', (d: any) => d.data.isFilteredIn ? 1 : 0.3),
        exit => exit.transition().duration(DURATION).attr('width', 0).style('opacity', 0).remove()
      );

    setTimeout(() => setIsLoading(false), DURATION);
  }, [heatmapData, config, zoom, loading, setSearchTerm, categoryVisualizationMode]);

  // Effect for handling validator highlighting separately for performance
  useEffect(() => {
    if (!svgRef.current) return;
    const DURATION = 200;
    const svg = d3.select(svgRef.current);

    svg.selectAll('.validator-row-bg')
      .transition().duration(DURATION)
      .attr('fill', (d: any) => d.moniker === highlightedValidator ? 'rgba(238, 207, 140, 0.3)' : 'transparent');
  }, [highlightedValidator]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.2));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (event.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    container.addEventListener('wheel', handleWheel);
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleZoomIn, handleZoomOut]);

  if (loading && !heatmapData.validators.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-accent" />
          <p className="h3-small-title text-gray-500">Loading chain data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="h2-subtitle text-gray-800">Heatmap</h3>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary-accent" />}
          </div>
          <div className="flex items-center gap-4">
            <ToggleButtonGroup
              options={[
                { value: 'votingPower', label: 'Voting Power' },
                { value: 'similarity', label: 'Similarity' }
              ]}
              selectedValue={validatorSortKey}
              onChange={(value) => {
                if (value === 'similarity' && !searchTerm) return;
                setValidatorSortKey(value as ValidatorSortKey);
              }}
            />
            {validatorSortKey === 'similarity' && (
              <label className="flex items-center space-x-2 content-text text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchAbstainInSimilarity}
                  onChange={(e) => setMatchAbstainInSimilarity(e.target.checked)}
                  className="form-checkbox h-3 w-3 text-primary-accent rounded focus:ring-primary-accent"
                />
                <span>Include abstentions</span>
              </label>
            )}
            <div className="content-text text-gray-500">
              Scroll to pan, Ctrl/Cmd + Scroll to zoom
            </div>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto" key={useGlobalStore.getState().selectedChain}>
        <svg ref={svgRef} className="block"></svg>
      </div>
    </div>
  )
}