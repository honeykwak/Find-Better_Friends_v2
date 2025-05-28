'use client'

import { Users, Target, TrendingUp, Search, Loader2, User } from 'lucide-react'
import dynamic from 'next/dynamic'
import { calculateSimilarity, type Vote } from '@/lib/dataLoader'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { VOTE_COLORS_RGBA, VOTE_VALUE_MAP, PLOTLY_COLOR_SCALE, type VoteOption } from '@/constants/voteColors'

// Dynamically load Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export default function ValidatorAnalysis() {
  const {
    validatorData,
    rawVotes,
    rawProposals,
    selectedChain,
    searchTerm,
    loading,
    error,
    windowSize,
    selectedValidator,
    setSelectedChain,
    setSearchTerm,
    setSelectedValidator,
    getFilteredValidators,
    getChains
  } = useGlobalStore()

  // Calculate responsive layout
  const isSmallScreen = windowSize.width < 1200
  const isVerySmallScreen = windowSize.width < 768
  const isMobileScreen = windowSize.width < 640
  
  // Whether to show sidebar
  const showSidebar = !isMobileScreen

  // Prepare data for main visualization
  const prepareGanttData = () => {
    // Adjust number of proposals based on screen size
    const proposalCount = isMobileScreen ? 30 : isSmallScreen ? 40 : 50
    const validatorCount = isMobileScreen ? 10 : isSmallScreen ? 15 : 20

    const recentProposals = rawProposals
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, proposalCount)
              .reverse() // Sort by time

          // Select validators to display (similarity order if base validator exists, otherwise voting power order)
    let displayValidators = []
    if (selectedValidator) {
      displayValidators = [selectedValidator, ...validatorData.similarValidators.slice(0, validatorCount - 1)]
    } else {
      displayValidators = validatorData.validators
        .sort((a, b) => b.votingPower - a.votingPower)
        .slice(0, validatorCount)
    }

    if (displayValidators.length === 0 || recentProposals.length === 0) {
      return null
    }

          // Use global color and value mapping for vote options
    const voteColorMap: Record<string, { color: string; value: number }> = {
      'YES': { color: VOTE_COLORS_RGBA.YES, value: VOTE_VALUE_MAP.YES },
      'NO': { color: VOTE_COLORS_RGBA.NO, value: VOTE_VALUE_MAP.NO },
      'ABSTAIN': { color: VOTE_COLORS_RGBA.ABSTAIN, value: VOTE_VALUE_MAP.ABSTAIN },
      'NO_WITH_VETO': { color: VOTE_COLORS_RGBA.NO_WITH_VETO, value: VOTE_VALUE_MAP.NO_WITH_VETO },
      'NO_VOTE': { color: VOTE_COLORS_RGBA.NO_VOTE, value: VOTE_VALUE_MAP.NO_VOTE }
    }

          // Map voting data by validator
    const validatorVoteMap = new Map<string, Map<string, Vote>>()
    rawVotes.forEach(vote => {
      if (!validatorVoteMap.has(vote.validator_id)) {
        validatorVoteMap.set(vote.validator_id, new Map())
      }
      validatorVoteMap.get(vote.validator_id)!.set(vote.proposal_id, vote)
    })

    // Generate heatmap data
    const z: number[][] = []
    const text: string[][] = []
    const customdata: any[][] = []

    displayValidators.forEach((validator, validatorIndex) => {
      const row: number[] = []
      const textRow: string[] = []
      const customRow: any[] = []

      recentProposals.forEach((proposal, proposalIndex) => {
        const vote = validatorVoteMap.get(validator.validator_id)?.get(proposal.proposal_id)
        
        if (vote) {
          const voteInfo = voteColorMap[vote.vote_option] || voteColorMap['NO_VOTE']
          
          row.push(voteInfo.value)
          textRow.push(vote.vote_option)
          customRow.push({
            validator: validator.voter_name || validator.validator_address.slice(0, isMobileScreen ? 10 : 20),
            proposal: proposal.title.length > (isMobileScreen ? 30 : 50) 
              ? proposal.title.substring(0, isMobileScreen ? 30 : 50) + '...' 
              : proposal.title,
            vote: vote.vote_option,
            power: vote.voting_power,
            date: new Date(proposal.timestamp).toLocaleDateString('en-US')
          })
        } else {
          row.push(VOTE_VALUE_MAP.NO_VOTE)
          textRow.push('NO_VOTE')
          customRow.push({
            validator: validator.voter_name || validator.validator_address.slice(0, isMobileScreen ? 10 : 20),
            proposal: proposal.title.length > (isMobileScreen ? 30 : 50) 
              ? proposal.title.substring(0, isMobileScreen ? 30 : 50) + '...' 
              : proposal.title,
            vote: 'NO_VOTE',
            power: 0,
            date: new Date(proposal.timestamp).toLocaleDateString('en-US')
          })
        }
      })

      z.push(row)
      text.push(textRow)
      customdata.push(customRow)
    })

    return {
      z,
      text,
      customdata,
      validators: displayValidators,
      proposals: recentProposals,
      colorscale: PLOTLY_COLOR_SCALE
    }
  }

  // Select base validator
  const selectBaseValidator = (validator: any) => {
    setSelectedValidator(validator)
  }

  // Filtered validator list
  const filteredValidators = getFilteredValidators()
  const chains = getChains()

  const ganttData = prepareGanttData()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading validator data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
                  <p className="text-error">Error occurred</p>
        <p className="text-body-small mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!validatorData.validators.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">No validator data available.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top status bar - removed filters, only show selected validator info */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 lg:py-3 bg-white border-b border-gray-100">
        {/* Display current filter status */}
        <div className="flex items-center gap-2 text-body-small text-gray-600">
          <span>Filters:</span>
          {selectedChain !== 'all' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-badge">
              {selectedChain}
            </span>
          )}
          {searchTerm && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-badge">
              "{searchTerm}"
            </span>
          )}
          {selectedChain === 'all' && !searchTerm && (
            <span className="text-gray-700">All Validators</span>
          )}
        </div>

        {/* Selected validator information */}
        {selectedValidator && (
          <div className="flex items-center gap-3 px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900 text-body-small">
                {selectedValidator.voter_name || selectedValidator.validator_address.slice(0, 20)}
                </span>
              <span className="text-caption text-blue-600">
                Base Validator
                </span>
              </div>
              <button
              onClick={() => setSelectedValidator(null)}
              className="text-blue-600 hover:text-blue-800 text-caption"
              >
                Clear
              </button>
            </div>
          )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main visualization area */}
        <div className="flex-1 p-4 lg:p-6 overflow-hidden">
          {ganttData ? (
                <Plot
                  data={[{
                    z: ganttData.z,
                    type: 'heatmap',
                    colorscale: ganttData.colorscale,
                    showscale: false,
                    hovertemplate: '<b>%{customdata.validator}</b><br>' +
                              'Proposal: %{customdata.proposal}<br>' +
                              'Vote: %{customdata.vote}<br>' +
                              'Voting Power: %{customdata.power}<br>' +
                              'Date: %{customdata.date}<extra></extra>',
                customdata: ganttData.customdata
                  }]}
                  layout={{
                    margin: { 
                  l: isMobileScreen ? 80 : 120, 
                  r: 20, 
                  t: 20, 
                  b: isMobileScreen ? 60 : 80 
                    },
                    xaxis: {
                      title: '',
                      tickmode: 'array',
                      tickvals: ganttData.proposals.map((_, i) => i).filter((_, i) => 
                    i % Math.max(1, Math.floor(ganttData.proposals.length / (isMobileScreen ? 5 : 10))) === 0
                      ),
                  ticktext: ganttData.proposals.map(p => 
                    new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  ).filter((_, i) => 
                    i % Math.max(1, Math.floor(ganttData.proposals.length / (isMobileScreen ? 5 : 10))) === 0
                      ),
                      tickangle: -45,
                  tickfont: { size: isMobileScreen ? 8 : 10 }
                    },
                    yaxis: {
                      title: '',
                      tickmode: 'array',
                      tickvals: ganttData.validators.map((_, i) => i),
                  ticktext: ganttData.validators.map(v => 
                    v.voter_name || v.validator_address.slice(0, isMobileScreen ? 15 : 25)
                  ),
                  tickfont: { size: isMobileScreen ? 8 : 10 }
                    },
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    paper_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Inter, sans-serif', size: isMobileScreen ? 9 : 11 }
                  }}
              config={{ displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-700">
              No validator data to display.
            </div>
          )}
        </div>

        {/* Validator list sidebar */}
        {showSidebar && (
          <div className={`${isSmallScreen ? 'w-64' : 'w-80'} bg-white border-l border-gray-200 flex flex-col`}>
            <div className="p-3 border-b border-gray-100">
              <h4 className="font-medium text-gray-900 text-body-small">
                Validator List ({filteredValidators.length})
                </h4>
              </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredValidators.slice(0, 50).map((validator) => (
                    <div
                      key={validator.validator_id}
                  className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                    selectedValidator?.validator_id === validator.validator_id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                      onClick={() => selectBaseValidator(validator)}
                    >
                  <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                      <p className="text-body-small font-medium text-gray-900 truncate">
                        {validator.voter_name || 'Unknown'}
                      </p>
                      <p className="text-caption text-gray-700 truncate">
                        {validator.validator_address}
                          </p>
                      <p className="text-caption text-gray-600">
                        {validator.chain}
                      </p>
                        </div>
                    <div className="text-right">
                      <p className="text-caption text-gray-600">
                        {validator.votingPower.toFixed(3)}
                          </p>
                      {selectedValidator && validator.validator_id !== selectedValidator.validator_id && (
                        <p className="text-caption text-blue-600">
                          {(validator.similarity * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 