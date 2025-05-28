'use client'

import { Users, Target, TrendingUp, Search, Loader2, User, BarChart3, Calendar, Zap, AlertCircle, Database, Filter } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { 
  validatorVizLoaderFull, 
  type HeatmapDataFull, 
  type ChainIndex,
  type CategoryIndex,
  type SimilarityMatrixFull,
  type ValidatorVizValidatorFull,
  type ValidatorVizProposalFull,
  type FilterOptions
} from '@/lib/validatorVizLoaderFull'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { VOTE_COLORS, PLOTLY_COLOR_SCALE } from '@/constants/voteColors'

// Dynamically load Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface ValidatorAnalysisFullProps {
  windowSize: { width: number; height: number }
  selectedChain?: string
  searchTerm?: string
}

export default function ValidatorAnalysisFull({ 
  windowSize, 
  selectedChain = 'all',
  searchTerm = ''
}: ValidatorAnalysisFullProps) {
  // useGlobalStore에서 실제 votingPower 데이터와 필터 상태 가져오기
  const { 
    getFilteredValidators,
    selectedCategories,
    selectedTopics
  } = useGlobalStore()
  
  // 실제 votingPower 매핑 함수
  const getActualVotingPower = (validatorName: string, chain: string): number => {
    const globalValidators = getFilteredValidators()
    const matchingValidator = globalValidators.find(v => 
      v.voter_name === validatorName && v.chain === chain
    )
    return matchingValidator?.votingPower || 0
  }
  
  // 필터링된 데이터 기반 동적 유사도 계산
  const calculateDynamicSimilarity = (
    baseValidatorId: string,
    targetValidatorId: string,
    filteredVoteLookup: { [key: string]: any },
    filteredProposals: any[]
  ): number => {
    if (baseValidatorId === targetValidatorId) return 1.0
    
    const proposalIds = filteredProposals.map(p => p.id)
    let commonVotes = 0
    let totalComparisons = 0
    
    for (const proposalId of proposalIds) {
      const baseVoteKey = `${baseValidatorId}_${proposalId}`
      const targetVoteKey = `${targetValidatorId}_${proposalId}`
      
      const baseVote = filteredVoteLookup[baseVoteKey]
      const targetVote = filteredVoteLookup[targetVoteKey]
      
      // 둘 다 투표한 경우만 비교
      if (baseVote && targetVote) {
        totalComparisons++
        if (baseVote.value === targetVote.value) {
          commonVotes++
        }
      }
    }
    
    return totalComparisons > 0 ? commonVotes / totalComparisons : 0
  }
  
  // 상태 관리 (전체 데이터)
  const [heatmapData, setHeatmapData] = useState<HeatmapDataFull | null>(null)
  const [chainIndex, setChainIndex] = useState<ChainIndex | null>(null)
  const [categoryIndex, setCategoryIndex] = useState<CategoryIndex | null>(null)
  const [similarityMatrix, setSimilarityMatrix] = useState<SimilarityMatrixFull | null>(null)
  const [referenceValidator, setReferenceValidator] = useState<ValidatorVizValidatorFull | null>(null)  // 유사도 계산 기준
  const [selectedValidator, setSelectedValidator] = useState<ValidatorVizValidatorFull | null>(null)  // 사이드바에서 선택된 검증인 (표시용)
  const [clickedValidator, setClickedValidator] = useState<ValidatorVizValidatorFull | null>(null)  // 클릭된 검증인 (즉시 반영용)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingSimilarity, setLoadingSimilarity] = useState(false)

  // 반응형 설정
  const isSmallScreen = windowSize.width < 1200
  const isVerySmallScreen = windowSize.width < 768
  const isMobileScreen = windowSize.width < 640
  const isTabletScreen = windowSize.width < 1200
  const showSidebar = !isMobileScreen
  const showPredictionPanel = !isMobileScreen && !isTabletScreen

  // 사용 가능한 너비 계산 (3-column 레이아웃 고려)
  const getAvailableWidth = () => {
    let availableWidth = windowSize.width
    
    // 좌측 필터 패널 (모바일이 아닌 경우)
    if (!isMobileScreen) {
      availableWidth -= 320 // 필터 패널 너비
    }
    
    // 우측 예측 패널 (모바일과 태블릿이 아닌 경우)
    if (showPredictionPanel) {
      availableWidth -= 320 // 예측 패널 너비
    }
    
    // 검증인 사이드바 (모바일이 아닌 경우)
    if (showSidebar) {
      availableWidth -= (isSmallScreen ? 264 : 320)
    }
    
    // 패딩 및 마진
    availableWidth -= 48
    
    return Math.max(availableWidth, 400) // 최소 너비 보장
  }

  // 기본 데이터 로드
  useEffect(() => {
    const loadBasicData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('Loading FULL validator data...')
        const { heatmapData, chainIndex, categoryIndex, metadata } = await validatorVizLoaderFull.loadBasicData()
        
        console.log('Full data loaded:', {
          proposals: heatmapData.proposals.length,
          validators: heatmapData.validators.length,
          votes: Object.keys(heatmapData.vote_lookup).length,
          chains: Object.keys(chainIndex).length
        })

        setHeatmapData(heatmapData)
        setChainIndex(chainIndex)
        setCategoryIndex(categoryIndex)
      } catch (err: any) {
        console.error('Failed to load full validator data:', err)
        setError(err.message || 'Failed to load full data')
      } finally {
        setLoading(false)
      }
    }

    loadBasicData()
  }, [])

  // 유사도 데이터 지연 로드
  const loadSimilarityData = async () => {
    if (similarityMatrix || loadingSimilarity) return

    try {
      setLoadingSimilarity(true)
      const data = await validatorVizLoaderFull.loadSimilarityMatrix()
      setSimilarityMatrix(data)
    } catch (err: any) {
      console.error('Failed to load similarity data:', err)
    } finally {
      setLoadingSimilarity(false)
    }
  }

  // 기준 검증인 선택 시 유사도 데이터 로드
  useEffect(() => {
    if (referenceValidator && !similarityMatrix) {
      loadSimilarityData()
    }
  }, [referenceValidator, similarityMatrix])

  // 필터링된 데이터 (전체 데이터 기반)
  const filteredData = useMemo(() => {
    if (!heatmapData || !chainIndex || !categoryIndex) return null

    const filters: FilterOptions = {}
    
    // 체인 필터 적용
    if (selectedChain !== 'all') {
      filters.chains = [selectedChain]
    }

    // searchTerm이 정확히 하나의 검증인 이름과 일치하는지 확인
    // 이 경우 검증인이 선택된 상태로 간주하여 해당 체인의 모든 검증인을 표시
    let isValidatorSelected = false
    if (searchTerm && heatmapData) {
      console.log('🔥 CHECKING_VALIDATOR_MATCH:', {
        searchTerm,
        searchTermTrimmed: searchTerm.trim(),
        totalValidators: heatmapData.validators.length
      })
      
      const matchingValidators = heatmapData.validators.filter(v => 
        v.name.toLowerCase().trim() === searchTerm.toLowerCase().trim()
      )
      
      console.log('🔥 MATCHING_VALIDATORS:', {
        matchingCount: matchingValidators.length,
        matchingValidators: matchingValidators.map(v => ({ name: v.name, chain: v.chain }))
      })
      
      isValidatorSelected = matchingValidators.length >= 1
      
      // 검증인이 선택된 경우 현재 선택된 체인의 해당 검증인으로 필터링하고 searchTerm은 무시
      if (isValidatorSelected) {
        // 현재 선택된 체인에서 해당 검증인 찾기
        const validatorInSelectedChain = matchingValidators.find(v => 
          selectedChain === 'all' || v.chain === selectedChain
        )
        
        if (validatorInSelectedChain) {
          filters.chains = [validatorInSelectedChain.chain]
          console.log('🔥 VALIDATOR_SELECTED:', {
            validatorName: validatorInSelectedChain.name,
            validatorChain: validatorInSelectedChain.chain,
            willShowAllValidatorsInChain: true,
            totalMatchingValidators: matchingValidators.length
          })
        } else {
          // 선택된 체인에 해당 검증인이 없으면 첫 번째 체인 사용
          const selectedValidator = matchingValidators[0]
          filters.chains = [selectedValidator.chain]
          console.log('🔥 VALIDATOR_SELECTED_FALLBACK:', {
            validatorName: selectedValidator.name,
            validatorChain: selectedValidator.chain,
            willShowAllValidatorsInChain: true
          })
        }
        // searchTerm은 적용하지 않음 (해당 체인의 모든 검증인 표시)
      }
    }
    
    if (searchTerm && !isValidatorSelected) {
      filters.searchTerm = searchTerm
    }

    // 카테고리 필터 적용
    if (selectedCategories.length > 0) {
      filters.categories = selectedCategories
    }

    // 토픽 필터 적용
    if (selectedTopics.length > 0) {
      filters.topics = selectedTopics
    }

    console.log('🔥 APPLYING_FILTERS:', {
      filters,
      hasReferenceValidator: !!referenceValidator,
      referenceValidatorName: referenceValidator?.name,
      referenceValidatorChain: referenceValidator?.chain,
      clickedValidator: clickedValidator?.name,
      isValidatorSelected,
      selectedCategories: selectedCategories.length,
      selectedTopics: selectedTopics.length
    })
    
    const result = validatorVizLoaderFull.filterHeatmapData(heatmapData, filters, chainIndex, categoryIndex)
    
    console.log('🔥 FILTERED_DATA:', {
      proposals: result.proposals.length,
      validators: result.validators.length,
      votes: Object.keys(result.filteredVoteLookup).length,
      coverage: result.metadata.coverage
    })

    return result
  }, [heatmapData, chainIndex, categoryIndex, selectedChain, searchTerm, referenceValidator, clickedValidator, selectedCategories, selectedTopics])

  // searchTerm으로 선택된 검증인을 자동으로 referenceValidator로 설정
  useEffect(() => {
    if (searchTerm && filteredData && !referenceValidator) {
      const matchingValidator = filteredData.validators.find(v => 
        v.name.toLowerCase().trim() === searchTerm.toLowerCase().trim()
      )
      if (matchingValidator) {
        console.log('🔥 AUTO_SETTING_REFERENCE:', {
          validatorName: matchingValidator.name,
          validatorChain: matchingValidator.chain
        })
        setReferenceValidator(matchingValidator)
        setSelectedValidator(matchingValidator)
      }
    }
  }, [searchTerm, filteredData, referenceValidator])

  // 정렬된 검증인 목록 (유사도 기반 또는 투표력 기반)
  const sortedValidators = useMemo(() => {
    if (!filteredData) return []

    // 기준 검증인이 있으면 동적 유사도 기반 정렬
    if (referenceValidator) {
      const baseValidatorId = referenceValidator.id
      
      const sorted = filteredData.validators
        .filter(v => v.id !== baseValidatorId)
        .map(validator => ({
          ...validator,
          dynamicSimilarity: calculateDynamicSimilarity(
            baseValidatorId,
            validator.id,
            filteredData.filteredVoteLookup,
            filteredData.proposals
          )
        }))
        .sort((a, b) => b.dynamicSimilarity - a.dynamicSimilarity)

      console.log('🔥 SORTED_VALIDATORS (Dynamic Similarity):', {
        referenceValidator: referenceValidator.name,
        referenceChain: referenceValidator.chain,
        totalValidators: sorted.length + 1,
        filteredProposals: filteredData.proposals.length,
        firstFew: sorted.slice(0, 5).map(v => ({ 
          name: v.name, 
          chain: v.chain, 
          dynamicSimilarity: (v.dynamicSimilarity * 100).toFixed(1) + '%',
          votingPower: getActualVotingPower(v.name, v.chain)
        }))
      })
      
      return [referenceValidator, ...sorted]
    }

    // 기본 정렬: 투표력(votingPower) 높은 순으로 내림차순
    const sorted = [...filteredData.validators].sort((a, b) => {
      const aPower = getActualVotingPower(a.name, a.chain)
      const bPower = getActualVotingPower(b.name, b.chain)
      return bPower - aPower
    })
    
    console.log('🔥 SORTED_VALIDATORS (Power):', {
      totalValidators: sorted.length,
      sortType: 'votingPower_desc',
      firstFew: sorted.slice(0, 5).map(v => ({ 
        name: v.name, 
        chain: v.chain, 
        votingPower: getActualVotingPower(v.name, v.chain)
      }))
    })
    
    return sorted
  }, [filteredData, referenceValidator, getActualVotingPower, calculateDynamicSimilarity])

  // 히트맵 데이터 준비 (전체 데이터 기반 - 모든 데이터 표시)
  const heatmapPlotData = useMemo(() => {
    if (!filteredData) return null

    const displayValidators = referenceValidator ? sortedValidators : filteredData.validators
    
    // 검증인 순서 - 내림차순 정렬 (높은 순위가 상단)
    const finalValidators = displayValidators
    
    console.log('🔥 HEATMAP_PREP:', {
      referenceValidator: referenceValidator?.name,
      displayValidatorsCount: displayValidators.length,
      proposalsCount: filteredData.proposals.length,
      usingSort: !!referenceValidator,
      firstValidatorInOrder: finalValidators[0]?.name,
      lastValidatorInOrder: finalValidators[finalValidators.length - 1]?.name
    })
    
    // 모든 데이터 표시 - 제한 없음
    const maxValidators = finalValidators.length
    const maxProposals = filteredData.proposals.length
    
    return validatorVizLoaderFull.generateHeatmapMatrix(
      filteredData.proposals,
      finalValidators,
      filteredData.filteredVoteLookup,
      maxValidators,
      maxProposals
    )
  }, [filteredData, sortedValidators, referenceValidator])

  // 성능 통계
  const performanceStats = validatorVizLoaderFull.getPerformanceStats()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading full validator data...</p>
          <p className="text-xs text-gray-500 mt-2">Processing all validators and proposals</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <p className="text-lg font-medium">Error loading data</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!heatmapData || !filteredData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">No visualization data available.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 lg:py-3 bg-white border-b border-gray-100">
        {/* 데이터 정보 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <Database className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Full Data</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>Total: {heatmapData.metadata.proposal_count}P × {heatmapData.metadata.validator_count}V</span>
            <span>|</span>
            <span>Filtered: {filteredData.metadata.proposal_count}P × {filteredData.metadata.validator_count}V</span>
            <span>|</span>
            <span>Coverage: {(filteredData.metadata.coverage * 100).toFixed(1)}%</span>
            {(referenceValidator || selectedChain !== 'all') && (
              <>
                <span>|</span>
                <span className="text-blue-600 font-medium">
                  Chain: {referenceValidator ? referenceValidator.chain : selectedChain}
                </span>
              </>
            )}
            {selectedCategories.length > 0 && (
              <>
                <span>|</span>
                <span className="text-purple-600 font-medium">
                  Categories: {selectedCategories.length}
                </span>
              </>
            )}
            {selectedTopics.length > 0 && (
              <>
                <span>|</span>
                <span className="text-orange-600 font-medium">
                  Topics: {selectedTopics.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 성능 표시 */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span>Optimized</span>
          </div>
          <span>Memory: {performanceStats.totalMemoryUsage}</span>
                     {heatmapPlotData && (
             <span>
               Displaying: {heatmapPlotData.displayValidators.length.toLocaleString()}V × {heatmapPlotData.displayProposals.length.toLocaleString()}P (All Data)
             </span>
           )}
        </div>

        {/* 기준 검증인 정보 */}
        {referenceValidator && (
          <div className="flex items-center gap-3 px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <User className="w-4 h-4 text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900 text-sm">
                Reference: {referenceValidator.name}
              </span>
              <span className="text-xs text-blue-600">
                {referenceValidator.chain} • {referenceValidator.vote_count} votes
              </span>
              {loadingSimilarity && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              )}
            </div>
            <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
              Showing {referenceValidator.chain} validators by filtered similarity
            </span>
            <button
              onClick={() => {
                setReferenceValidator(null)
                setClickedValidator(null)
                setSelectedValidator(null)
              }}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 시각화 영역 */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {heatmapPlotData ? (
            <div style={{ 
              width: getAvailableWidth(),
              height: Math.max(windowSize.height - 200, heatmapPlotData.displayValidators.length * 2),
              minWidth: heatmapPlotData.displayProposals.length * 2,
              minHeight: heatmapPlotData.displayValidators.length * 2
            }}>
              <Plot
                data={[{
                  z: heatmapPlotData.z,
                  type: 'heatmap',
                  colorscale: PLOTLY_COLOR_SCALE,
                  showscale: false,
                  zmin: 0,
                  zmax: 4,
                  hovertemplate: '<b>%{customdata.validator}</b><br>' +
                                'Proposal: %{customdata.proposal}<br>' +
                                'Vote: %{customdata.vote}<br>' +
                                'Power: %{customdata.power}<br>' +
                                'Date: %{customdata.date}<br>' +
                                'Chain: %{customdata.chain}<br>' +
                                'Category: %{customdata.category}<br>' +
                                'Topic: %{customdata.topic}<extra></extra>',
                  customdata: heatmapPlotData.customdata
                }]}
                layout={{
                  margin: { 
                    l: 80,  // 검증인 이름 제거로 좌측 마진 축소
                    r: 20, 
                    t: 20, 
                    b: 60   // 하단 마진 축소
                  },
                  xaxis: {
                    title: '',
                    tickmode: 'array',
                    tickvals: heatmapPlotData.displayProposals.map((_, i) => i).filter((_, i) => 
                      i % Math.max(1, Math.floor(heatmapPlotData.displayProposals.length / 20)) === 0
                    ),
                    ticktext: heatmapPlotData.displayProposals.map(p => 
                      new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ).filter((_, i) => 
                      i % Math.max(1, Math.floor(heatmapPlotData.displayProposals.length / 20)) === 0
                    ),
                    tickangle: -45,
                    tickfont: { size: 8 }
                  },
                  yaxis: {
                    title: 'Validators',
                    showticklabels: false,  // 검증인 이름 숨김
                    tickfont: { size: 8 },
                    autorange: 'reversed'  // y축 방향 뒤집기 - 첫 번째 검증인이 최상단에 위치
                  },
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  font: { family: 'Inter, sans-serif', size: 8 }
                }}
                config={{ displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-700">
              No visualization data available.
            </div>
          )}
        </div>

        {/* 검증인 목록 사이드바 */}
        {showSidebar && filteredData && (
          <div className={`${isSmallScreen ? 'w-64' : 'w-80'} bg-white border-l border-gray-200 flex flex-col`}>
            <div className="p-3 border-b border-gray-100">
              <h4 className="font-medium text-gray-900 text-sm">
                                 Validators ({filteredData.validators.length.toLocaleString()})
              </h4>
              <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                <span>Coverage: {(filteredData.metadata.coverage * 100).toFixed(1)}%</span>
                <span className="text-green-600 font-medium">Full Data</span>
              </div>
                             <div className="text-xs text-gray-500 mt-1">
                 {referenceValidator ? (
                   <span className="text-blue-600">
                     Sorted by filtered similarity to <strong>{referenceValidator.name}</strong> ({referenceValidator.chain})
                   </span>
                 ) : (
                   <span>Showing all {filteredData.validators.length.toLocaleString()} validators</span>
                 )}
               </div>
            </div>
            
                         <div className="flex-1 overflow-y-auto">
               {sortedValidators.map((validator) => (
                <div
                  key={validator.id}
                  className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedValidator?.id === validator.id ? 'bg-green-50 border-green-200' : ''
                  } ${
                    referenceValidator?.id === validator.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    setClickedValidator(validator)  // 즉시 반영용
                    setSelectedValidator(validator)
                    setReferenceValidator(validator)  // 클릭한 검증인을 기준으로 설정
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {validator.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{validator.vote_count} votes</span>
                        {selectedChain === 'all' && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">{validator.chain}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">
                        {(getActualVotingPower(validator.name, validator.chain) * 100).toFixed(4)}%
                      </p>
                      {referenceValidator && validator.id !== referenceValidator.id && (
                        <p className="text-xs text-blue-600">
                          {(() => {
                            const similarity = calculateDynamicSimilarity(
                              referenceValidator.id,
                              validator.id,
                              filteredData.filteredVoteLookup,
                              filteredData.proposals
                            )
                            return (similarity * 100).toFixed(1) + '%'
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 모든 검증인 표시 - 추가 메시지 제거 */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 