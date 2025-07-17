'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { Loader2, BarChart3, Activity } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useGlobalStore } from '@/stores/useGlobalStore'

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

// 히트맵 시각화 컴포넌트
const ValidatorHeatmap = dynamic(() => import('@/components/ValidatorHeatmap'), {
  loading: () => (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-lg font-medium text-gray-900 mb-2">Loading Heatmap Visualization...</p>
        <p className="text-sm text-gray-600">Preparing D3.js chart...</p>
      </div>
    </div>
  ),
  ssr: false
})

export default function ResearchLayout() {
  const { 
    windowSize, 
    loading,
    selectedCategories,
    selectedTopics,
    selectedChain,
    setWindowSize, 
    loadData
  } = useGlobalStore()

  // 컴포넌트 로딩 상태 관리
  const [componentsLoaded, setComponentsLoaded] = useState({
    filterPanel: false
  })

  // 컴포넌트 로딩 (단순화됨)
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        setComponentsLoaded(prev => ({ ...prev, filterPanel: true }))
      }, 100)
    }
  }, [loading])

  // Data loading - 한 번만 실행
  useEffect(() => {
    loadData('cosmos')
  }, [loadData])

  // Window size tracking
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setWindowSize])

  // 화면 크기에 따른 레이아웃 결정
  const isMobileScreen = windowSize.width < 640
  const showFilterPanel = !isMobileScreen && componentsLoaded.filterPanel

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Governance Data</h2>
          <p className="text-gray-600">Preparing validator analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 상단 헤더 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Governance Research Platform
          </h1>
          
          <div className="flex items-center gap-3 mx-4">
            {/* 현재 필터 상태 표시 */}
            <div className="flex items-center gap-2">
              {selectedChain && (
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
        </div>
      </div>

      {/* 메인 콘텐츠 - 2-column 레이아웃 */}
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

        {/* 우측 메인 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          
          
          <div className="flex-1 overflow-hidden">
            <ValidatorHeatmap />
          </div>
        </div>
      </div>
    </div>
  )
}
 