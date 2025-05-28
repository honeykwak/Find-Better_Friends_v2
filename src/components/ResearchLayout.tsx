'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { Info, GripHorizontal, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { LEGEND_ITEMS } from '@/constants/voteColors'

// 동적 임포트로 컴포넌트들을 지연 로딩
const FilterPanel = dynamic(() => import('@/components/FilterPanel'), {
  loading: () => (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm text-gray-600">Loading filters...</p>
      </div>
    </div>
  ),
  ssr: false
})

const ProposalAnalysis = dynamic(() => import('@/components/ProposalAnalysis'), {
  loading: () => (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm text-gray-600">Loading proposal analysis...</p>
      </div>
    </div>
  ),
  ssr: false
})

const ValidatorAnalysisFull = dynamic(() => import('@/components/ValidatorAnalysisFull'), {
  loading: () => (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm text-gray-600">Loading validator analysis...</p>
      </div>
    </div>
  ),
  ssr: false
})

const PredictionPanel = dynamic(() => import('@/components/PredictionPanel'), {
  loading: () => (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
        <p className="text-sm text-gray-600">Loading predictions...</p>
      </div>
    </div>
  ),
  ssr: false
})

const InfoModal = dynamic(() => import('@/components/InfoModal'), {
  ssr: false
})

export default function ResearchLayout() {
  const { 
    windowSize, 
    showInfo, 
    loading,
    splitRatio,
    rawProposals,
    proposalData,
    selectedCategories,
    selectedTopics,
    selectedChain,
    searchTerm,
    setWindowSize, 
    setShowInfo, 
    loadData,
    setSplitRatio
  } = useGlobalStore()

  // 컴포넌트 로딩 상태 관리
  const [componentsLoaded, setComponentsLoaded] = useState({
    filterPanel: false,
    proposalAnalysis: false,
    validatorAnalysis: false,
    predictionPanel: false
  })

  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartRatio, setDragStartRatio] = useState(0)

  // Calculate filtered pass rate
  const getFilteredPassRate = () => {
    if (!proposalData || !rawProposals.length) return 0

    let filteredProposals = rawProposals

    // Category filter
    if (selectedCategories.length > 0) {
      filteredProposals = filteredProposals.filter(p => selectedCategories.includes(p.high_level_category))
    }

    // Detailed category (topic) filter
    if (selectedTopics.length > 0) {
      filteredProposals = filteredProposals.filter(p => selectedTopics.includes(p.topic_subject))
    }

    // Chain filter
    if (selectedChain !== 'all') {
      filteredProposals = filteredProposals.filter(p => p.chain === selectedChain)
    }

    if (filteredProposals.length === 0) return 0

    const passedCount = filteredProposals.filter(p => p.passed).length
    return (passedCount / filteredProposals.length) * 100
  }

  // 순차적 컴포넌트 로딩
  useEffect(() => {
    const loadComponentsSequentially = async () => {
      // 기본 데이터 로딩 완료 후 컴포넌트들을 순차적으로 활성화
      if (!loading && proposalData) {
        // 1. 필터 패널 먼저 로드
        setTimeout(() => {
          setComponentsLoaded(prev => ({ ...prev, filterPanel: true }))
        }, 100)

        // 2. 프로포절 분석 로드
        setTimeout(() => {
          setComponentsLoaded(prev => ({ ...prev, proposalAnalysis: true }))
        }, 300)

        // 3. 검증인 분석 로드
        setTimeout(() => {
          setComponentsLoaded(prev => ({ ...prev, validatorAnalysis: true }))
        }, 600)

        // 4. 예측 패널 마지막 로드
        setTimeout(() => {
          setComponentsLoaded(prev => ({ ...prev, predictionPanel: true }))
        }, 900)
      }
    }

    loadComponentsSequentially()
  }, [loading, proposalData])

  // Data loading
  useEffect(() => {
    loadData()
  }, [loadData])

  // Window size tracking
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    // Set initial size
    handleResize()

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [setWindowSize])

  // 화면 크기에 따른 레이아웃 결정
  const isMobileScreen = windowSize.width < 640
  const isTabletScreen = windowSize.width < 1200
  const showFilterPanel = !isMobileScreen && componentsLoaded.filterPanel
  const showPredictionPanel = !isMobileScreen && !isTabletScreen && componentsLoaded.predictionPanel

  // 드래그 핸들러들
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartRatio(splitRatio)
  }, [splitRatio])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaY = e.clientY - dragStartY
    const containerHeight = windowSize.height - 64 // 헤더 높이 제외
    const deltaRatio = deltaY / containerHeight
    const newRatio = dragStartRatio + deltaRatio
    
    setSplitRatio(newRatio)
  }, [isDragging, dragStartY, dragStartRatio, windowSize.height, setSplitRatio])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const filteredPassRate = getFilteredPassRate()
  const needsValidatorAnalysis = filteredPassRate < 80

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Blockchain Governance Data</h2>
          <p className="text-gray-600">Initializing visualization components...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <h1 className="text-gray-900 truncate font-semibold text-lg">
            Find Better Friends
          </h1>
        </div>
        
        {/* 중앙 영역: 필터 상태 및 통과율 */}
        <div className="flex items-center gap-3 mx-4">
          {/* 현재 필터 상태 표시 */}
          <div className="flex items-center gap-2">
            {selectedChain !== 'all' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                {selectedChain}
              </span>
            )}
            {selectedCategories.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {selectedCategories.length} categories
              </span>
            )}
            {selectedTopics.length > 0 && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                {selectedTopics.length} topics
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowInfo(true)}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
        >
          <Info className="w-4 h-4" />
          <span className="text-sm font-medium">Info</span>
        </button>
      </div>

      {/* 메인 콘텐츠 - 3-column 레이아웃 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 필터 패널 */}
        {showFilterPanel && (
          <Suspense fallback={
            <div className="w-80 h-full bg-white border-r border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Loading filters...</p>
              </div>
            </div>
          }>
            <FilterPanel />
          </Suspense>
        )}

        {/* 중앙 시각화 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 프로포절 분석 */}
          <div 
            className="bg-white flex flex-col overflow-hidden border-b border-gray-200"
            style={{ height: `${splitRatio * 100}%` }}
          >
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">
                Proposal Analysis
              </h2>
              {!componentsLoaded.proposalAnalysis && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {componentsLoaded.proposalAnalysis ? (
                <Suspense fallback={
                  <div className="h-full bg-white flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-600">Loading proposal analysis...</p>
                    </div>
                  </div>
                }>
                  <ProposalAnalysis />
                </Suspense>
              ) : (
                <div className="h-full bg-white flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-600">Preparing proposal analysis...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 리사이저 + 범례 */}
          <div 
            className={`h-8 bg-gray-200 hover:bg-blue-50 cursor-ns-resize flex items-center justify-between px-4 group transition-colors border-y border-gray-300 ${
              isDragging ? 'bg-blue-100' : ''
            }`}
            onMouseDown={handleMouseDown}
          >
            {/* 범례 - 전역 색상 사용 */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-600 font-medium">Vote Types:</span>
              <div className="flex items-center gap-2">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.option} className="flex items-center gap-1" title={item.description}>
                    <div 
                      className="w-3 h-3 rounded-sm opacity-80" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 드래그 핸들 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 group-hover:text-gray-700">Drag to resize</span>
              <GripHorizontal className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </div>
          </div>

          {/* 검증인 분석 */}
          <div 
            className="bg-white flex flex-col overflow-hidden"
            style={{ height: `${(1 - splitRatio) * 100}%` }}
          >
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900">
                Validator Analysis
              </h2>
              {!componentsLoaded.validatorAnalysis && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {componentsLoaded.validatorAnalysis ? (
                <Suspense fallback={
                  <div className="h-full bg-white flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-600">Loading validator analysis...</p>
                    </div>
                  </div>
                }>
                  <ValidatorAnalysisFull 
                    windowSize={windowSize}
                    selectedChain={selectedChain}
                    searchTerm={searchTerm}
                  />
                </Suspense>
              ) : (
                <div className="h-full bg-white flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-600">Preparing validator analysis...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측 예측 패널 */}
        {showPredictionPanel && (
          <Suspense fallback={
            <div className="w-80 h-full bg-white border-l border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-gray-600">Loading predictions...</p>
              </div>
            </div>
          }>
            <PredictionPanel />
          </Suspense>
        )}
      </div>

      {/* 정보 모달 */}
      {showInfo && (
        <Suspense fallback={null}>
          <InfoModal onClose={() => setShowInfo(false)} />
        </Suspense>
      )}
    </div>
  )
} 