'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useGlobalStore, type ValidatorSortKey } from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { calculateSimilarity } from '@/lib/similarity'
import type { Vote, Validator, Proposal } from '@/lib/dataLoader'

// Define layout constants
const PROPOSAL_LABEL_HEIGHT = 240;
const SUMMARY_CHART_HEIGHT = 120;
const CHART_SPACING = 20;
const TOP_MARGIN = PROPOSAL_LABEL_HEIGHT + SUMMARY_CHART_HEIGHT + CHART_SPACING;

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
    name: string
    index: number
    isPinnedAndFilteredOut?: boolean
  }>
  proposals: Array<{
    id: string
    title: string
    index: number
    status: string
    tallyRatio: { [key: string]: number }
  }>
  votes: Array<{
    validatorIndex: number
    proposalIndex: number
    voteOption: string
  }>
}

interface ValidatorWithAvgPower extends Validator {
  avgPower: number;
  participationRate: number;
  isPinnedAndFilteredOut?: boolean;
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
    validatorsWithDerivedData,
    votes: rawVotes,
    getFilteredProposals,
    selectedTopics,
    loading,
    searchTerm,
    setSearchTerm,
    validatorSortKey,
    setValidatorSortKey,
    votingPowerMetric,
    votingPowerDisplayMode,
    votingPowerRange,
    participationRateRange,
    countNoVoteAsParticipation,
    recalculateValidatorMetrics,
    categoryVisualizationMode,
  } = useGlobalStore()

  const searchTermRef = useRef(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    recalculateValidatorMetrics();
  }, [getFilteredProposals, countNoVoteAsParticipation, recalculateValidatorMetrics]);


  const heatmapData = useMemo((): ProcessedHeatmapData => {
    const filteredProposals = getFilteredProposals();
    if (!filteredProposals.length || !validatorsWithDerivedData.length) {
      return { validators: [], proposals: [], votes: [] };
    }

    let currentValidators = [...validatorsWithDerivedData];
    let pinnedValidator: ValidatorWithAvgPower | undefined;

    if (validatorSortKey.startsWith('similarity') && searchTerm) {
      const foundValidator = currentValidators.find(v => v.moniker === searchTerm);
      if (foundValidator) {
        pinnedValidator = { ...foundValidator };
        currentValidators = currentValidators.filter(v => v.validator_address !== pinnedValidator?.validator_address);
      }
    }

    let filteredByVotingPower: ValidatorWithDerivedData[];
    if (votingPowerDisplayMode === 'ratio') {
      const [minPower, maxPower] = votingPowerRange;
      filteredByVotingPower = currentValidators.filter(v => {
        const power = votingPowerMetric === 'avg' ? (v.avgPower || 0) : (v.totalPower || 0);
        return power >= minPower && power <= maxPower;
      });
    } else { // 'rank'
      const rankedValidators = [...currentValidators].sort((a, b) => {
        const powerA = votingPowerMetric === 'avg' ? (a.avgPower || 0) : (a.totalPower || 0);
        const powerB = votingPowerMetric === 'avg' ? (b.avgPower || 0) : (b.totalPower || 0);
        return powerB - powerA;
      });
      const [minRank, maxRank] = votingPowerRange;
      filteredByVotingPower = rankedValidators.slice(minRank - 1, maxRank);
    }

    const proposalSetForParticipation = new Set(filteredProposals.map(p => p.proposal_id));
    const validatorVoteCountsForParticipation = new Map<string, number>();
    let totalProposalsForParticipation = filteredProposals.length;

    if (!countNoVoteAsParticipation) {
      const proposalsWithNoMeaningfulVotes = new Set<string>();
      const proposalVoteOptions = new Map<string, Set<string>>();

      for (const vote of rawVotes) {
        if (proposalSetForParticipation.has(vote.proposal_id)) {
          if (!proposalVoteOptions.has(vote.proposal_id)) {
            proposalVoteOptions.set(vote.proposal_id, new Set());
          }
          proposalVoteOptions.get(vote.proposal_id)!.add(vote.vote_option);
        }
      }

      for (const proposal of filteredProposals) {
        const options = proposalVoteOptions.get(proposal.proposal_id);
        if (!options || (options.size === 1 && options.has('NO_VOTE'))) {
          proposalsWithNoMeaningfulVotes.add(proposal.proposal_id);
        }
      }
      totalProposalsForParticipation -= proposalsWithNoMeaningfulVotes.size;
    }

    for (const vote of rawVotes) {
      if (proposalSetForParticipation.has(vote.proposal_id)) {
        if (!countNoVoteAsParticipation && vote.vote_option === 'NO_VOTE') {
          continue;
        }
        validatorVoteCountsForParticipation.set(vote.validator_address, (validatorVoteCountsForParticipation.get(vote.validator_address) || 0) + 1);
      }
    }

    const getParticipationRate = (address: string) => {
      const count = validatorVoteCountsForParticipation.get(address) || 0;
      return totalProposalsForParticipation > 0 ? (count / totalProposalsForParticipation) * 100 : 0;
    };

    const [minParticipation, maxParticipation] = participationRateRange;
    let finalFilteredValidators = filteredByVotingPower.filter(v => {
      const rate = getParticipationRate(v.validator_address);
      return rate >= minParticipation && rate <= maxParticipation;
    });

    if (pinnedValidator) {
      const meetsVotingPower = (() => {
        if (votingPowerDisplayMode === 'ratio') {
          const power = votingPowerMetric === 'avg' ? (pinnedValidator.avgPower || 0) : (pinnedValidator.totalPower || 0);
          return power >= votingPowerRange[0] && power <= votingPowerRange[1];
        } else { // rank
          const allValidatorsSorted = [...validatorsWithDerivedData].sort((a, b) => {
            const powerA = votingPowerMetric === 'avg' ? (a.avgPower || 0) : (a.totalPower || 0);
            const powerB = votingPowerMetric === 'avg' ? (b.avgPower || 0) : (b.totalPower || 0);
            return powerB - powerA;
          });
          const pinnedIndex = allValidatorsSorted.findIndex(v => v.validator_address === pinnedValidator?.validator_address);
          const pinnedRank = pinnedIndex + 1;
          return pinnedRank >= votingPowerRange[0] && pinnedRank <= votingPowerRange[1];
        }
      })();
      
      const meetsParticipationRate = (getParticipationRate(pinnedValidator.validator_address) >= participationRateRange[0] && getParticipationRate(pinnedValidator.validator_address) <= participationRateRange[1]);

      if (!meetsVotingPower || !meetsParticipationRate) {
        pinnedValidator.isPinnedAndFilteredOut = true;
      } else {
        pinnedValidator.isPinnedAndFilteredOut = false;
      }
      finalFilteredValidators.unshift(pinnedValidator);
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
    const validatorDisplayValues = new Map<string, string>();

    if (validatorSortKey.startsWith('similarity') && searchTerm) {
      const selectedValidator = rawValidators.find(v => v.moniker === searchTerm);
      if (selectedValidator) {
        const similarityScores = new Map<string, number>();
        const selectedVotes = votesByValidator.get(selectedValidator.validator_address) || [];
        
        const mode = validatorSortKey === 'similarity_common'
          ? 'common'
          : validatorSortKey === 'similarity_base'
          ? 'base'
          : 'comprehensive';

        for (const validator of sortedValidators) {
          const targetVotes = votesByValidator.get(validator.validator_address) || [];
          const score = calculateSimilarity(selectedVotes, targetVotes, proposalSet, countNoVoteAsParticipation, mode);
          similarityScores.set(validator.validator_address, score);
          validatorDisplayValues.set(validator.validator_address, `(${(score * 100).toFixed(0)}%)`);
        }

        sortedValidators.sort((a, b) => {
          if (a.moniker === searchTerm) return -1;
          if (b.moniker === searchTerm) return 1;
          
          const scoreA = similarityScores.get(a.validator_address) || -1;
          const scoreB = similarityScores.get(b.validator_address) || -1;
          return scoreB - scoreA;
        });
      }
    } else if (validatorSortKey === 'name') {
      sortedValidators.sort((a, b) => (a.moniker || '').localeCompare(b.moniker || ''));
    } else if (validatorSortKey === 'votingPower') {
      sortedValidators.sort((a, b) => (b.avgPower || 0) - (a.avgPower || 0));
      for (const validator of sortedValidators) {
        validatorDisplayValues.set(validator.validator_address, `(${( (validator.avgPower || 0) * 100).toFixed(1)}%)`);
      }
    } else if (validatorSortKey === 'totalVotingPower') {
      sortedValidators.sort((a, b) => (b.totalPower || 0) - (a.totalPower || 0));
      for (const validator of sortedValidators) {
        validatorDisplayValues.set(validator.validator_address, `(${(validator.totalPower || 0).toLocaleString()})`);
      }
    } else { // Default to 'voteCount'
      const validatorVoteCounts = new Map<string, number>();
      for (const vote of rawVotes) {
        if (proposalSet.has(vote.proposal_id)) {
          if (!countNoVoteAsParticipation && vote.vote_option === 'NO_VOTE') {
            continue;
          }
          validatorVoteCounts.set(vote.validator_address, (validatorVoteCounts.get(vote.validator_address) || 0) + 1);
        }
      }
      sortedValidators.sort((a, b) => (validatorVoteCounts.get(b.validator_address) || 0) - (validatorVoteCounts.get(a.validator_address) || 0));
      for (const validator of sortedValidators) {
        const count = validatorVoteCounts.get(validator.validator_address) || 0;
        validatorDisplayValues.set(validator.validator_address, `(${count})`);
      }
    }
    
    const validators = sortedValidators.map((v, index) => ({ 
      address: v.validator_address,
      moniker: v.moniker || 'Unknown',
      displayName: `${v.moniker || 'Unknown'} ${validatorDisplayValues.get(v.validator_address) || ''}`.trim(),
      index, 
      isPinnedAndFilteredOut: v.isPinnedAndFilteredOut 
    }));

    const proposalsWithTally = filteredProposals
      .sort((a, b) => {
        const timeA = a.submit_time ? new Date(Number(a.submit_time)).getTime() : 0;
        const timeB = b.submit_time ? new Date(Number(b.submit_time)).getTime() : 0;
        if (!timeA || !timeB) return 0;
        return timeA - timeB;
      })
      .map((p: Proposal & { voteDistribution: { [key: string]: number } }, index: number) => {
        const totalVotes = Object.values(p.voteDistribution).reduce((sum, count) => sum + count, 0);
        const tallyRatio = VOTE_ORDER.reduce((acc, key) => {
          acc[key] = totalVotes > 0 ? (p.voteDistribution[key] || 0) / totalVotes : 0;
          return acc;
        }, {} as { [key: string]: number });

        return { 
          id: p.proposal_id, 
          title: p.title, 
          index, 
          status: p.status,
          tallyRatio
        };
      });

    const validatorAddressToIndex = new Map(validators.map(v => [v.address, v.index]))
    const proposalIdToIndex = new Map(proposalsWithTally.map(p => [p.id, p.index]))

    const votes = rawVotes
      .filter(vote => validatorAddressToIndex.has(vote.validator_address) && proposalIdToIndex.has(vote.proposal_id))
      .map(vote => ({
        validatorAddress: vote.validator_address,
        proposalId: vote.proposal_id,
        validatorIndex: validatorAddressToIndex.get(vote.validator_address)!,
        proposalIndex: proposalIdToIndex.get(vote.proposal_id)!,
        voteOption: vote.vote_option,
        votingPower: vote.voting_power,
      }))

    return { validators, proposals: proposalsWithTally, votes }
  }, [getFilteredProposals, selectedTopics, validatorsWithDerivedData, rawVotes, validatorSortKey, searchTerm, rawValidators, votingPowerMetric, votingPowerDisplayMode, votingPowerRange, participationRateRange, countNoVoteAsParticipation, categoryVisualizationMode])

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

    // Validator Labels
    const validatorLabels = g.selectAll('.validator-label')
      .data(validators, (d: any) => d.address);

    validatorLabels.exit()
      .transition().duration(DURATION)
      .style('opacity', 0)
      .remove();

    const mergedLabels = validatorLabels.enter()
      .append('text')
      .attr('class', 'validator-label')
      .attr('x', -10)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', `${Math.max(8, cellHeight * 0.7)}px`)
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .merge(validatorLabels as any);
      
    mergedLabels
      .on('click', (event, d: any) => {
        if (searchTermRef.current === d.moniker) {
          setSearchTerm('');
        } else {
          setSearchTerm(d.moniker);
        }
      })
      .transition().duration(DURATION)
      .attr('y', (d: any) => d.index * cellHeight + cellHeight / 2)
      .text((d: any) => d.displayName.slice(0, 35))
      .style('opacity', 1);

    // Cells
    const cells = g.selectAll('.cell')
      .data(votes, (d: any) => `${d.validatorAddress}-${d.proposalId}`);

    cells.exit()
      .transition().duration(DURATION)
      .style('opacity', 0)
      .remove();

    const mergedCells = cells.enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d: any) => d.proposalIndex * cellWidth)
      .attr('y', (d: any) => d.validatorIndex * cellHeight)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .attr('fill', (d: any) => getVoteColor(d.voteOption))
      .merge(cells as any);

    mergedCells
      .on('click', (event, d: any) => {
        const validator = validators[d.validatorIndex];
        if (validator && validator.moniker) {
          if (searchTermRef.current === validator.moniker) {
            setSearchTerm('');
          } else {
            setSearchTerm(validator.moniker);
          }
        }
      })
      .transition().duration(DURATION)
      .attr('x', (d: any) => d.proposalIndex * cellWidth)
      .attr('y', (d: any) => d.validatorIndex * cellHeight)
      .style('opacity', 1)
      .attr('fill', (d: any) => getVoteColor(d.voteOption));
      
    // Tooltip logic needs to be re-attached to the merged selection
    mergedCells
      .on('mouseover', function(event, d: any) {
        const validator = validators[d.validatorIndex];
        const proposal = proposals[d.proposalIndex];
        if (!validator || !proposal) return;

        const power = typeof d.votingPower === 'string' ? parseFloat(d.votingPower) : d.votingPower;
        const formattedPower = power != null && !isNaN(power) 
          ? power.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
          : 'N/A';

        d3.select('body').selectAll('.heatmap-tooltip').remove();
        const tooltip = d3.select('body').append('div').attr('class', 'heatmap-tooltip')
          .style('position', 'absolute').style('background', 'rgba(0,0,0,0.8)').style('color', 'white')
          .style('padding', '8px').style('border-radius', '4px').style('font-size', '12px')
          .style('pointer-events', 'none').style('z-index', '1000')
          .style('max-width', '300px').style('white-space', 'normal')
          .html(`
            <strong>${validator.moniker}</strong><br/>
            Proposal #${d.proposalId}: ${proposal.title}<br/>
            <hr style="margin: 4px 0; border-color: rgba(255,255,255,0.5);"/>
            Vote: <strong>${d.voteOption}</strong><br/>
            Voting Power: ${formattedPower}
          `);
        tooltip.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5);
      })
      .on('mouseout', function() {
        d3.selectAll('.heatmap-tooltip').remove();
        d3.select(this).attr('stroke', 'none');
      });

    // Proposal Labels (with transition)
    const proposalLabelY = -SUMMARY_CHART_HEIGHT - CHART_SPACING - 10;
    const proposalLabels = g.selectAll('.proposal-label')
      .data(proposals, (d: any) => d.id);

    proposalLabels.exit()
      .transition().duration(DURATION)
      .style('opacity', 0)
      .remove();

    proposalLabels.enter()
      .append('text')
      .attr('class', 'proposal-label')
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => setSelectedProposal(d.id))
      .attr('text-anchor', 'start')
      .style('opacity', 0)
      .merge(proposalLabels as any)
      .transition().duration(DURATION)
      .attr('x', (d: any) => d.index * cellWidth + cellWidth / 2)
      .attr('y', proposalLabelY)
      .attr('transform', (d: any) => `rotate(-60, ${d.index * cellWidth + cellWidth / 2}, ${proposalLabelY})`)
      .style('font-size', `${Math.max(8, cellWidth * 0.7)}px`)
      .style('fill', (d: any) => d.status.includes('PASSED') ? colors.YES : colors.NO)
      .text((d: any) => {
        const title = d.title;
        const truncated = title.length > 40 ? title.slice(0, 40) + '...' : title;
        return `${truncated} ${d.status.includes('PASSED') ? '✓' : '✗'}`;
      })
      .style('opacity', 1);

    // Summary Chart (with transition)
    const summaryG = g.selectAll('.summary-chart').data([null])
      .join('g')
      .attr('class', 'summary-chart')
      .attr('transform', `translate(0, ${-SUMMARY_CHART_HEIGHT - CHART_SPACING})`);

    const summaryChartYScale = d3.scaleLinear().domain([0, 1]).range([SUMMARY_CHART_HEIGHT, 0]);
    const stack = d3.stack().keys(VOTE_ORDER);
    const stackedData = stack(proposals.map((p: any) => p.tallyRatio));

    summaryG.selectAll('.bar-series')
      .data(stackedData)
      .join('g')
      .attr('class', 'bar-series')
      .attr('fill', (d: any) => getVoteColor(d.key))
      .selectAll('rect')
      .data(d => d)
      .join(
        enter => enter.append('rect')
          .attr('x', (d, i) => proposals[i].index * cellWidth)
          .attr('y', d => summaryChartYScale(d[1]))
          .attr('height', 0)
          .attr('width', cellWidth - 1)
          .transition().duration(DURATION)
          .attr('height', d => summaryChartYScale(d[0]) - summaryChartYScale(d[1])),
        update => update
          .transition().duration(DURATION)
          .attr('x', (d, i) => proposals[i].index * cellWidth)
          .attr('y', d => summaryChartYScale(d[1]))
          .attr('height', d => summaryChartYScale(d[0]) - summaryChartYScale(d[1])),
        exit => exit.transition().duration(DURATION).attr('height', 0).remove()
      );

    // Set loading to false after a short delay to allow transitions to start
    setTimeout(() => setIsLoading(false), DURATION);
  }, [heatmapData, config, zoom, loading, setSearchTerm, rawProposals, setSelectedProposal])

  // Lightweight effect for highlighting only
  useEffect(() => {
    if (!svgRef.current || loading) return;
    const svg = d3.select(svgRef.current)
    const lowercasedSearchTerm = searchTerm.toLowerCase()

    svg.selectAll('.validator-label')
      .style('font-weight', d => {
        const validator = d as any;
        if (!validator || !validator.moniker) return 'normal';
        return (validator.moniker.toLowerCase() === lowercasedSearchTerm && searchTerm) ? 'bold' : 'normal'
      })
      .style('fill', d => {
        const validator = d as any;
        if (!validator || !validator.moniker) return 'black';
        
        let fillColor = 'black';
        if (searchTerm && validator.moniker.toLowerCase() === lowercasedSearchTerm) {
          fillColor = validator.isPinnedAndFilteredOut ? 'orange' : 'blue';
        }
        return fillColor;
      })
  }, [searchTerm, loading, heatmapData.validators])


  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.2))
  const handleResetZoom = () => setZoom(1)

  if (loading && !heatmapData.validators.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading chain data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Heatmap
          </h3>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setValidatorSortKey('totalVotingPower')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'totalVotingPower' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              title="Sort by total voting power"
            >
              Total Voting Power
            </button>
            <button 
              onClick={() => setValidatorSortKey('votingPower')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'votingPower' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              title="Sort by voting power"
            >
              Avg. Voting Power
            </button>
            <button 
              onClick={() => setValidatorSortKey('voteCount')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'voteCount' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              title="Sort by vote participation"
            >
              Vote Count
            </button>
            <button 
              onClick={() => setValidatorSortKey('name')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'name' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              title="Sort by name"
            >
              Name
            </button>
            <button 
              onClick={() => setValidatorSortKey('similarity_comprehensive')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'similarity_comprehensive' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sort by similarity including non-participation"
              disabled={!searchTerm}
            >
              Similarity (Comprehensive)
            </button>
            <button 
              onClick={() => setValidatorSortKey('similarity_base')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'similarity_base' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sort by similarity based on the selected validator's votes"
              disabled={!searchTerm}
            >
              Similarity (Base)
            </button>
            <button 
              onClick={() => setValidatorSortKey('similarity_common')} 
              className={`px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${validatorSortKey === 'similarity_common' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sort by similarity based on common votes"
              disabled={!searchTerm}
            >
              Similarity (Common)
            </button>
          </div>
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100" title="Zoom Out"><ZoomOut className="w-4 h-4 text-gray-500" /></button>
            <span className="px-3 py-2 text-sm font-mono border-x text-gray-800">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100" title="Zoom In"><ZoomIn className="w-4 h-4 text-gray-500" /></button>
            <button onClick={handleResetZoom} className="p-2 hover:bg-gray-100 border-l" title="Reset Zoom"><RotateCcw className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
      </div>
    </div>
      <div ref={containerRef} className="flex-1 overflow-auto">
        <svg ref={svgRef} className="block"></svg>
      </div>
    </div>
  )
}
