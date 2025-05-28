'use client'

import { Users, Target, TrendingUp, Search, Loader2, User, BarChart3, Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { 
  validatorVizLoader, 
  type HeatmapData, 
  type GanttData, 
  type SimilarityIndex,
  type ValidatorVizValidator,
  type ValidatorVizProposal 
} from '@/lib/validatorVizLoader'
import { VOTE_COLORS, PLOTLY_COLOR_SCALE } from '@/constants/voteColors'

// Dynamically load Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface ValidatorAnalysisOptimizedProps {
  windowSize: { width: number; height: number }
  selectedChain?: string
  searchTerm?: string
}

export default function ValidatorAnalysisOptimized({ 
  windowSize, 
  selectedChain = 'all',
  searchTerm = ''
}: ValidatorAnalysisOptimizedProps) {
  // 상태 관리
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [ganttData, setGanttData] = useState<GanttData | null>(null)
  const [similarityIndex, setSimilarityIndex] = useState<SimilarityIndex | null>(null)
  const [selectedValidator, setSelectedValidator] = useState<ValidatorVizValidator | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'heatmap' | 'gantt'>('heatmap')

  // 반응형 설정
  const isSmallScreen = windowSize.width < 1200
  const isVerySmallScreen = windowSize.width < 768
  const isMobileScreen = windowSize.width < 640
  const showSidebar = !isMobileScreen

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [heatmap, gantt, similarity] = await Promise.all([
          validatorVizLoader.loadHeatmapData(),
          validatorVizLoader.loadGanttData(),
          validatorVizLoader.loadSimilarityIndex()
        ])

        setHeatmapData(heatmap)
        setGanttData(gantt)
        setSimilarityIndex(similarity)
      } catch (err: any) {
        console.error('Failed to load validator visualization data:', err)
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    if (!heatmapData) return null

    const filters: any = {}
    
    if (selectedChain !== 'all') {
      filters.chains = [selectedChain]
    }

    if (searchTerm) {
      // 검증인 이름으로 필터링
      const matchingValidators = heatmapData.validators
        .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(v => v.id)
      
      if (matchingValidators.length > 0) {
        filters.validators = matchingValidators
      }
    }

    return validatorVizLoader.filterHeatmapData(heatmapData, filters)
  }, [heatmapData, selectedChain, searchTerm])

  // 정렬된 검증인 목록
  const sortedValidators = useMemo(() => {
    if (!filteredData || !similarityIndex || !selectedValidator) {
      return filteredData?.validators || []
    }

    return validatorVizLoader.sortValidatorsBySimilarity(
      filteredData.validators,
      similarityIndex,
      selectedValidator.id
    )
  }, [filteredData, similarityIndex, selectedValidator])

  // 히트맵 데이터 준비
  const prepareHeatmapPlotData = () => {
    if (!filteredData) return null

    const displayValidators = selectedValidator ? sortedValidators : filteredData.validators
    const maxValidators = isMobileScreen ? 15 : isSmallScreen ? 25 : 40
    const maxProposals = isMobileScreen ? 30 : isSmallScreen ? 50 : 80

    const limitedValidators = displayValidators.slice(0, maxValidators)
    const limitedProposals = filteredData.proposals.slice(-maxProposals) // 최근 프로포절

    // Z 매트릭스 생성
    const z: number[][] = []
    const customdata: any[][] = []

    limitedValidators.forEach((validator, vIdx) => {
      const originalVIdx = filteredData.validators.findIndex(v => v.id === validator.id)
      const row: number[] = []
      const customRow: any[] = []

      limitedProposals.forEach((proposal, pIdx) => {
        const originalPIdx = filteredData.proposals.findIndex(p => p.id === proposal.id)
        
        let voteInfo = { option: 'NO_VOTE', power: 0, value: 2 }
        if (originalVIdx !== -1 && originalPIdx !== -1 && 
            filteredData.matrix[originalVIdx] && 
            filteredData.matrix[originalVIdx][originalPIdx]) {
          voteInfo = filteredData.matrix[originalVIdx][originalPIdx]
        }

        row.push(voteInfo.value)
        customRow.push({
          validator: validator.name,
          proposal: proposal.title,
          vote: voteInfo.option,
          power: voteInfo.power.toFixed(4),
          date: proposal.date,
          chain: proposal.chain
        })
      })

      z.push(row)
      customdata.push(customRow)
    })

    return {
      z,
      customdata,
      validators: limitedValidators,
      proposals: limitedProposals
    }
  }

  // 간트차트 데이터 준비
  const prepareGanttPlotData = () => {
    if (!ganttData) return null

    const maxProposals = isMobileScreen ? 20 : isSmallScreen ? 40 : 60
    const recentProposals = ganttData.proposals.slice(-maxProposals)

    // 간트차트용 데이터 구조 생성
    const ganttTraces: any[] = []
    const colors = Object.values(VOTE_COLORS)

    recentProposals.forEach((proposal, idx) => {
      const startDate = new Date(proposal.voting_start)
      const endDate = new Date(proposal.voting_end)
      
      ganttTraces.push({
        x: [startDate, endDate],
        y: [idx, idx],
        mode: 'lines',
        line: {
          color: proposal.passed ? colors[0] : colors[1],
          width: 8
        },
        name: proposal.title.substring(0, 30) + '...',
        hovertemplate: `<b>${proposal.title}</b><br>` +
                      `Chain: ${proposal.chain}<br>` +
                      `Category: ${proposal.category}<br>` +
                      `Duration: ${proposal.duration_hours.toFixed(1)} hours<br>` +
                      `Status: ${proposal.passed ? 'PASSED' : 'FAILED'}<br>` +
                      `Start: ${startDate.toLocaleDateString()}<br>` +
                      `End: ${endDate.toLocaleDateString()}<extra></extra>`
      })
    })

    return {
      traces: ganttTraces,
      proposals: recentProposals
    }
  }

  const heatmapPlotData = prepareHeatmapPlotData()
  const ganttPlotData = prepareGanttPlotData()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading validator visualization data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-medium">Error loading data</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!heatmapData || !ganttData) {
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
        {/* 뷰 모드 선택 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'heatmap' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Heatmap
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'gantt' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Timeline
          </button>
        </div>

        {/* 현재 필터 상태 */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Filters:</span>
          {selectedChain !== 'all' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
              {selectedChain}
            </span>
          )}
          {searchTerm && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
              "{searchTerm}"
            </span>
          )}
          {selectedChain === 'all' && !searchTerm && (
            <span className="text-gray-700">All Data</span>
          )}
        </div>

        {/* 선택된 검증인 정보 */}
        {selectedValidator && (
          <div className="flex items-center gap-3 px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <User className="w-4 h-4 text-blue-600" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900 text-sm">
                {selectedValidator.name}
              </span>
              <span className="text-xs text-blue-600">Base Validator</span>
            </div>
            <button
              onClick={() => setSelectedValidator(null)}
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
        <div className="flex-1 p-4 lg:p-6 overflow-hidden">
          {viewMode === 'heatmap' && heatmapPlotData ? (
            <Plot
              data={[{
                z: heatmapPlotData.z,
                type: 'heatmap',
                colorscale: PLOTLY_COLOR_SCALE,
                showscale: false,
                hovertemplate: '<b>%{customdata.validator}</b><br>' +
                              'Proposal: %{customdata.proposal}<br>' +
                              'Vote: %{customdata.vote}<br>' +
                              'Voting Power: %{customdata.power}<br>' +
                              'Date: %{customdata.date}<br>' +
                              'Chain: %{customdata.chain}<extra></extra>',
                customdata: heatmapPlotData.customdata
              }]}
              layout={{
                margin: { 
                  l: isMobileScreen ? 100 : 140, 
                  r: 20, 
                  t: 20, 
                  b: isMobileScreen ? 80 : 100 
                },
                xaxis: {
                  title: '',
                  tickmode: 'array',
                  tickvals: heatmapPlotData.proposals.map((_, i) => i).filter((_, i) => 
                    i % Math.max(1, Math.floor(heatmapPlotData.proposals.length / (isMobileScreen ? 5 : 8))) === 0
                  ),
                  ticktext: heatmapPlotData.proposals.map(p => 
                    new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  ).filter((_, i) => 
                    i % Math.max(1, Math.floor(heatmapPlotData.proposals.length / (isMobileScreen ? 5 : 8))) === 0
                  ),
                  tickangle: -45,
                  tickfont: { size: isMobileScreen ? 8 : 10 }
                },
                yaxis: {
                  title: '',
                  tickmode: 'array',
                  tickvals: heatmapPlotData.validators.map((_, i) => i),
                  ticktext: heatmapPlotData.validators.map(v => 
                    v.name.length > (isMobileScreen ? 15 : 25) 
                      ? v.name.substring(0, isMobileScreen ? 15 : 25) + '...'
                      : v.name
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
          ) : viewMode === 'gantt' && ganttPlotData ? (
            <Plot
              data={ganttPlotData.traces}
              layout={{
                margin: { l: 60, r: 20, t: 20, b: 60 },
                xaxis: {
                  title: 'Timeline',
                  type: 'date',
                  tickfont: { size: isMobileScreen ? 8 : 10 }
                },
                yaxis: {
                  title: 'Proposals',
                  tickmode: 'array',
                  tickvals: ganttPlotData.proposals.map((_, i) => i),
                  ticktext: ganttPlotData.proposals.map(p => 
                    p.title.length > 30 ? p.title.substring(0, 30) + '...' : p.title
                  ),
                  tickfont: { size: isMobileScreen ? 8 : 10 }
                },
                showlegend: false,
                plot_bgcolor: 'rgba(0,0,0,0)',
                paper_bgcolor: 'rgba(0,0,0,0)',
                font: { family: 'Inter, sans-serif', size: isMobileScreen ? 9 : 11 }
              }}
              config={{ displayModeBar: false }}
              style={{ width: '100%', height: '100%' }}
            />
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
                Validators ({filteredData.validators.length})
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Coverage: {(filteredData.metadata.coverage * 100).toFixed(1)}%
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {sortedValidators.slice(0, 50).map((validator) => (
                <div
                  key={validator.id}
                  className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                    selectedValidator?.id === validator.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedValidator(validator)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {validator.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {validator.chain}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">
                        {validator.power.toFixed(4)}
                      </p>
                      {selectedValidator && validator.id !== selectedValidator.id && similarityIndex && (
                        <p className="text-xs text-blue-600">
                          {((similarityIndex[selectedValidator.id]?.[validator.id]?.similarity || 0) * 100).toFixed(1)}%
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