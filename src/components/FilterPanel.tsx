'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Filter, Search, RotateCcw, Loader2 } from 'lucide-react'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import Image from 'next/image'
import React from 'react'

// Performance configuration
const PERFORMANCE_CONFIG = {
  maxValidatorsDisplay: 100,
  searchDebounceMs: 300,
  chunkSize: 50,
  virtualScrollThreshold: 200
}

// 체인 로고 경로 헬퍼 함수
const getChainLogo = (chainName: string) => {
  const logoName = chainName.toLowerCase().replace(/\s+/g, '-')
  return `/chain-logos/${logoName}.png`
}

// 🔥 성능 최적화: 투표력 분포 배경 메모이제이션
const VotingPowerBackground = React.memo(({ votingPowerDistribution }: { votingPowerDistribution: { [key: string]: number } }) => {
  const segments = useMemo(() => {
    // 🔥 Null/undefined 체크 추가
    if (!votingPowerDistribution || typeof votingPowerDistribution !== 'object') return []
    
    const totalPower = Object.values(votingPowerDistribution).reduce((sum, power) => sum + power, 0)
    if (totalPower === 0) return []

    let currentPosition = 0
    return VOTE_ORDER.map(voteType => {
      const power = votingPowerDistribution[voteType] || 0
      const percentage = (power / totalPower) * 100
      const segment = {
        voteType,
        startPosition: currentPosition,
        percentage,
        color: VOTE_COLORS[voteType]
      }
      currentPosition += percentage
      return segment
    }).filter(segment => segment.percentage > 0)
  }, [votingPowerDistribution])

  if (segments.length === 0) return null

  return (
    <div className="absolute left-0 top-0 h-full w-full rounded-lg overflow-hidden opacity-50">
      {segments.map((segment, index) => (
        <div
          key={segment.voteType}
          className="absolute h-full"
          style={{
            left: `${segment.startPosition}%`,
            width: `${segment.percentage}%`,
            backgroundColor: segment.color
          }}
        />
      ))}
    </div>
  )
})

// 🔥 성능 최적화: 투표 분포 배경 메모이제이션 (개수 기반)
const VoteCountBackground = React.memo(({ voteDistribution }: { voteDistribution: { [key: string]: number } }) => {
  const segments = useMemo(() => {
    // 🔥 Null/undefined 체크 추가
    if (!voteDistribution || typeof voteDistribution !== 'object') return []
    
    const totalVotes = Object.values(voteDistribution).reduce((sum, count) => sum + count, 0)
    if (totalVotes === 0) return []

    let currentPosition = 0
    return VOTE_ORDER.map(voteType => {
      const count = voteDistribution[voteType] || 0
      const percentage = (count / totalVotes) * 100
      const segment = {
        voteType,
        startPosition: currentPosition,
        percentage,
        color: VOTE_COLORS[voteType]
      }
      currentPosition += percentage
      return segment
    }).filter(segment => segment.percentage > 0)
  }, [voteDistribution])

  if (segments.length === 0) return null

  return (
    <div className="absolute left-0 top-0 h-full w-full rounded-lg overflow-hidden opacity-50">
      {segments.map((segment, index) => (
        <div
          key={segment.voteType}
          className="absolute h-full"
          style={{
            left: `${segment.startPosition}%`,
            width: `${segment.percentage}%`,
            backgroundColor: segment.color
          }}
        />
      ))}
    </div>
  )
})

// 🔥 성능 최적화: 통과율 배경 메모이제이션
const PassRateBackground = React.memo(({ passRate }: { passRate: number }) => {
  const backgroundClass = useMemo(() => {
    if (passRate >= 80) return 'bg-gradient-to-r from-green-100 to-green-50'
    if (passRate >= 60) return 'bg-gradient-to-r from-yellow-100 to-yellow-50'
    return 'bg-gradient-to-r from-red-100 to-red-50'
  }, [passRate])

  return (
    <div 
      className={`absolute left-0 top-0 h-full rounded-l-lg opacity-50 ${backgroundClass}`}
      style={{ width: `${passRate}%` }}
    />
  )
})

// 🔥 성능 최적화: 카테고리 컴포넌트 메모이제이션
const CategoryItem = React.memo(({ 
  category, 
  isHovered, 
  isCategorySelected, 
  selectedTopicsInCategory, 
  hasSelectedTopics, 
  allTopicsSelected, 
  categoryVisualizationMode,
  onCategoryMouseEnter,
  onCategoryMouseLeave,
  onToggleCategoryWithTopics,
  onTopicToggle
}: {
  category: any
  isHovered: boolean
  isCategorySelected: boolean
  selectedTopicsInCategory: any[]
  hasSelectedTopics: boolean
  allTopicsSelected: boolean
  categoryVisualizationMode: 'passRate' | 'voteCount' | 'votingPower'
  onCategoryMouseEnter: (name: string) => void
  onCategoryMouseLeave: () => void
  onToggleCategoryWithTopics: (categoryName: string, topicNames: string[]) => void
  onTopicToggle: (topicName: string, categoryName: string) => void
}) => {
  const shouldExpand = isHovered || hasSelectedTopics
  const checkboxState = allTopicsSelected && isCategorySelected ? 'checked' : 
                       hasSelectedTopics ? 'indeterminate' : 'unchecked'

  return (
    <div 
      className="border border-gray-200 rounded-lg"
      onMouseEnter={() => onCategoryMouseEnter(category.name)}
      onMouseLeave={onCategoryMouseLeave}
    >
      {/* 메인 카테고리 */}
      <div className="flex items-center p-3 hover:bg-gray-50 relative">
        {/* 배경 바 - 모드에 따라 다름 */}
        {categoryVisualizationMode === 'passRate' ? (
          <PassRateBackground passRate={category.passRate} />
        ) : categoryVisualizationMode === 'votingPower' ? (
          <VotingPowerBackground votingPowerDistribution={category.votingPowerDistribution as unknown as { [key: string]: number }} />
        ) : (
          <VoteCountBackground voteDistribution={category.voteDistribution as unknown as { [key: string]: number }} />
        )}
        
        <input
          type="checkbox"
          checked={checkboxState === 'checked'}
          ref={(el) => {
            if (el) {
              el.indeterminate = checkboxState === 'indeterminate'
            }
          }}
          onChange={() => onToggleCategoryWithTopics(category.name, category.topics.map((t: any) => t.name))}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 relative z-10 mr-2"
        />
        
        <div className="flex items-center justify-between flex-1 relative z-10">
          <span className="text-sm font-medium text-gray-700">
            {category.name}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span>{category.count}</span>
            <span className={`font-medium ${
              category.passRate >= 80 ? 'text-green-600' : 
              category.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {category.passRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 상세 카테고리 (토픽) */}
      <div 
        className={`border-t border-gray-200 bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out ${
          shouldExpand ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-2 space-y-1 overflow-y-auto">
          {category.topics.map((topic: any) => (
            <TopicItem
              key={topic.name}
              topic={topic}
              isSelected={selectedTopicsInCategory.some(t => t.name === topic.name)}
              categoryVisualizationMode={categoryVisualizationMode}
              categoryName={category.name}
              onToggle={onTopicToggle}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

// 🔥 성능 최적화: 토픽 컴포넌트 메모이제이션
const TopicItem = React.memo(({ 
  topic, 
  isSelected, 
  categoryVisualizationMode, 
  categoryName, 
  onToggle 
}: {
  topic: any
  isSelected: boolean
  categoryVisualizationMode: 'passRate' | 'voteCount' | 'votingPower'
  categoryName: string
  onToggle: (topicName: string, categoryName: string) => void
}) => {
  return (
    <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer relative">
      {/* 토픽 배경 바 - 모드에 따라 다름 */}
      {categoryVisualizationMode === 'passRate' ? (
        <PassRateBackground passRate={topic.passRate} />
      ) : categoryVisualizationMode === 'votingPower' ? (
        <VotingPowerBackground votingPowerDistribution={topic.votingPowerDistribution as unknown as { [key: string]: number }} />
      ) : (
        <VoteCountBackground voteDistribution={topic.voteDistribution as unknown as { [key: string]: number }} />
      )}
      
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(topic.name, categoryName)}
        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 relative z-10"
      />
      <div className="flex items-center justify-between flex-1 relative z-10">
        <span className="text-xs text-gray-600">
          {topic.name}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">{topic.count}</span>
          <span className={`font-medium ${
            topic.passRate >= 80 ? 'text-green-600' : 
            topic.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {topic.passRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </label>
  )
})

export default function FilterPanel() {
  const {
    proposalData,
    selectedCategories,
    selectedTopics,
    selectedChain,
    searchTerm,
    windowSize,
    categoryVisualizationMode,
    setSelectedCategories,
    setSelectedTopics,
    toggleCategory,
    toggleTopic,
    setSelectedChain,
    setSearchTerm,
    setCategoryVisualizationMode,
    getChains,
    getFilteredCategoryHierarchy,
    getFilteredValidators,
    calculateValidatorStats
  } = useGlobalStore()

  // 카테고리 호버 상태 관리
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  
  // 검증인 자동완성 상태 관리
  const [showValidatorSuggestions, setShowValidatorSuggestions] = useState(false)
  const [filteredValidators, setFilteredValidators] = useState<any[]>([])
  const [isLoadingValidators, setIsLoadingValidators] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  // 체인 선택 드롭다운 상태 관리
  const [showChainDropdown, setShowChainDropdown] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const [chainAutoSelected, setChainAutoSelected] = useState(false)
  
  // 체인 변경 확인 다이얼로그 상태
  const [showChainChangeConfirm, setShowChainChangeConfirm] = useState(false)
  const [pendingChainChange, setPendingChainChange] = useState<string | null>(null)

  // 반응형 레이아웃
  const isVerySmallScreen = windowSize.width < 768
  const isMobileScreen = windowSize.width < 640

  // 🔥 성능 최적화: 시각화 모드 전환 함수 메모이제이션
  const handleVisualizationModeChange = useCallback((mode: 'passRate' | 'voteCount' | 'votingPower') => {
    setCategoryVisualizationMode(mode)
  }, [setCategoryVisualizationMode])

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, PERFORMANCE_CONFIG.searchDebounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setSelectedCategories([])
    setSelectedTopics([])
    // 체인은 초기화하지 않음 (현재 선택된 체인 유지)
    setSearchTerm('')
  }, [setSelectedCategories, setSelectedTopics, setSearchTerm])

  // 활성 필터 개수 계산
  const activeFiltersCount = useMemo(() => [
    selectedCategories.length > 0,
    selectedTopics.length > 0,
    searchTerm.length > 0
  ].filter(Boolean).length, [selectedCategories.length, selectedTopics.length, searchTerm.length])

  // 체인 목록 (메모이제이션)
  const chains = useMemo(() => getChains(), [getChains])
  
  // 🔥 성능 최적화: 필터링된 카테고리 계층 구조 메모이제이션 강화
  // 시각화 모드는 표시 방법만 바꾸므로 데이터 재계산 불필요
  const filteredCategoryHierarchy = useMemo(() => {
    return getFilteredCategoryHierarchy()
  }, [getFilteredCategoryHierarchy, selectedChain])

  // 🔥 성능 최적화: 이벤트 핸들러 메모이제이션
  const handleCategoryMouseEnter = useCallback((categoryName: string) => {
    setHoveredCategory(categoryName)
  }, [])

  const handleCategoryMouseLeave = useCallback(() => {
    setHoveredCategory(null)
  }, [])

  const handleTopicToggle = useCallback((topicName: string, categoryName: string) => {
    toggleTopic(topicName)
    
    // 토픽이 선택되면 부모 카테고리도 선택
    if (!selectedTopics.includes(topicName) && !selectedCategories.includes(categoryName)) {
      setSelectedCategories([...selectedCategories, categoryName])
    }
  }, [toggleTopic, selectedTopics, selectedCategories, setSelectedCategories])

  const toggleCategoryWithTopics = useCallback((categoryName: string, topicNames: string[]) => {
    const isCategorySelected = selectedCategories.includes(categoryName)
    const selectedTopicsInCategory = selectedTopics.filter(topic => 
      topicNames.includes(topic)
    )
    const allTopicsSelected = selectedTopicsInCategory.length === topicNames.length

    if (allTopicsSelected && isCategorySelected) {
      // 모든 토픽과 카테고리가 선택된 경우: 전체 해제
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName))
      setSelectedTopics(selectedTopics.filter(t => !topicNames.includes(t)))
    } else {
      // 그렇지 않은 경우: 전체 선택
      if (!isCategorySelected) {
        setSelectedCategories([...selectedCategories, categoryName])
      }
      const newTopics = [...selectedTopics]
      topicNames.forEach(topic => {
        if (!newTopics.includes(topic)) {
          newTopics.push(topic)
        }
      })
      setSelectedTopics(newTopics)
    }
  }, [selectedCategories, selectedTopics, setSelectedCategories, setSelectedTopics])

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h2>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* 시각화 모드 토글 버튼 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visualization Mode
          </label>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleVisualizationModeChange('passRate')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                categoryVisualizationMode === 'passRate'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pass Rate
            </button>
            <button
              onClick={() => handleVisualizationModeChange('voteCount')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                categoryVisualizationMode === 'voteCount'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vote Count
            </button>
            <button
              onClick={() => handleVisualizationModeChange('votingPower')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                categoryVisualizationMode === 'votingPower'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vote Power
            </button>
          </div>
        </div>

        {/* 체인 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chain
          </label>
          <div className="relative" ref={chainDropdownRef}>
            <button
              onClick={() => setShowChainDropdown(!showChainDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <div className="flex items-center gap-2">
                {selectedChain !== 'all' && (
                  <Image
                    src={getChainLogo(selectedChain) || ''}
                    alt={selectedChain}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )}
                <span className="capitalize">
                  {selectedChain}
                </span>
              </div>
            </button>
            
            {showChainDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {chains.map((chain) => (
                  <button
                    key={chain}
                    onClick={() => {
                      setSelectedChain(chain)
                      setShowChainDropdown(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                  >
                    {chain !== 'all' && (
                      <Image
                        src={getChainLogo(chain) || ''}
                        alt={chain}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <span className="capitalize">
                      {chain}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 검색 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Validator
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type validator name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowValidatorSuggestions(true)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">
            Categories ({filteredCategoryHierarchy.length})
          </h3>
        </div>
        
        {filteredCategoryHierarchy.map((category) => {
          const isHovered = hoveredCategory === category.name
          const isCategorySelected = selectedCategories.includes(category.name)
          const selectedTopicsInCategory = selectedTopics.filter(topic => 
            category.topics.some(t => t.name === topic)
          )
          const hasSelectedTopics = selectedTopicsInCategory.length > 0
          const allTopicsSelected = selectedTopicsInCategory.length === category.topics.length

          return (
            <CategoryItem
              key={category.name}
              category={category}
              isHovered={isHovered}
              isCategorySelected={isCategorySelected}
              selectedTopicsInCategory={selectedTopicsInCategory}
              hasSelectedTopics={hasSelectedTopics}
              allTopicsSelected={allTopicsSelected}
              categoryVisualizationMode={categoryVisualizationMode}
              onCategoryMouseEnter={handleCategoryMouseEnter}
              onCategoryMouseLeave={handleCategoryMouseLeave}
              onToggleCategoryWithTopics={toggleCategoryWithTopics}
              onTopicToggle={handleTopicToggle}
            />
          )
        })}
      </div>
    </div>
  )
} 