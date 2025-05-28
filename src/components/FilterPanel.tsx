'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Filter, Search, RotateCcw, Loader2 } from 'lucide-react'
import { useGlobalStore } from '@/stores/useGlobalStore'
import Image from 'next/image'

// Performance configuration
const PERFORMANCE_CONFIG = {
  maxValidatorsDisplay: 100, // 최대 표시할 검증인 수
  searchDebounceMs: 300, // 검색 디바운스 시간
  chunkSize: 50, // 청킹 단위
  virtualScrollThreshold: 200 // 가상 스크롤 임계값
}

// 체인 로고 경로 헬퍼 함수
const getChainLogo = (chainName: string) => {
  if (chainName === 'all') return null
  const logoName = chainName.toLowerCase().replace(/\s+/g, '-')
  return `/chain-logos/${logoName}.png`
}

export default function FilterPanel() {
  const {
    proposalData,
    selectedCategories,
    selectedTopics,
    selectedChain,
    searchTerm,
    windowSize,
    setSelectedCategories,
    setSelectedTopics,
    toggleCategory,
    toggleTopic,
    setSelectedChain,
    setSearchTerm,
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
    setSelectedChain('all')
    setSearchTerm('')
  }, [setSelectedCategories, setSelectedTopics, setSelectedChain, setSearchTerm])

  // 활성 필터 개수 계산
  const activeFiltersCount = useMemo(() => [
    selectedCategories.length > 0,
    selectedTopics.length > 0,
    selectedChain !== 'all',
    searchTerm.length > 0
  ].filter(Boolean).length, [selectedCategories.length, selectedTopics.length, selectedChain, searchTerm.length])

  // 체인 목록 (메모이제이션)
  const chains = useMemo(() => getChains(), [getChains])
  
  // 선택된 체인에 따른 필터링된 카테고리 계층 구조 (메모이제이션)
  const filteredCategoryHierarchy = useMemo(() => getFilteredCategoryHierarchy(), [getFilteredCategoryHierarchy])
  
  // 검증인 자동완성 로직 (성능 최적화)
  useEffect(() => {
    const loadValidators = async () => {
      setIsLoadingValidators(true)
      
      try {
        const validators = getFilteredValidators()
        
        if (debouncedSearchTerm.trim() === '') {
          // 검색어가 없으면 투표력 순으로 정렬 (성능을 위해 제한)
          const sortedValidators = validators
            .sort((a, b) => (b.votingPower || 0) - (a.votingPower || 0))
            .slice(0, PERFORMANCE_CONFIG.maxValidatorsDisplay)
          setFilteredValidators(sortedValidators)
        } else {
          // 검색어가 있으면 필터링 (검증인 이름만 검색)
          const term = debouncedSearchTerm.toLowerCase()
          const filtered = validators
            .filter(v => {
              const name = (v.voter_name || '').toLowerCase()
              return name.includes(term)
            })
            .sort((a, b) => {
              const aName = (a.voter_name || 'Unknown').toLowerCase()
              const bName = (b.voter_name || 'Unknown').toLowerCase()
              
              // 우선순위 계산 함수
              const getPriority = (name: string) => {
                if (name.startsWith(term)) return 1 // 이름이 검색어로 시작
                if (name.includes(' ' + term) || name.includes('-' + term) || name.includes('_' + term)) return 2 // 단어 시작
                if (name.includes(term)) return 3 // 포함
                return 4 // 기타
              }
              
              const aPriority = getPriority(aName)
              const bPriority = getPriority(bName)
              
              // 우선순위가 다르면 우선순위 순으로
              if (aPriority !== bPriority) {
                return aPriority - bPriority
              }
              
              // 우선순위가 같으면 알파벳 순
              return aName.localeCompare(bName)
            })
            .slice(0, PERFORMANCE_CONFIG.maxValidatorsDisplay) // 성능을 위해 제한
          setFilteredValidators(filtered)
        }
      } catch (error) {
        console.error('Error loading validators:', error)
        setFilteredValidators([])
      } finally {
        setIsLoadingValidators(false)
      }
    }

    // 디바운스된 검색어나 체인 변경 시에만 실행
    loadValidators()
  }, [debouncedSearchTerm, selectedChain, getFilteredValidators])

  // 외부 클릭 시 드롭다운 닫기 및 키보드 이벤트 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 검증인 자동완성 닫기
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowValidatorSuggestions(false)
      }
      
      // 체인 드롭다운 닫기
      if (
        chainDropdownRef.current &&
        !chainDropdownRef.current.contains(event.target as Node)
      ) {
        setShowChainDropdown(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC 키로 확인 다이얼로그 닫기
      if (event.key === 'Escape' && showChainChangeConfirm) {
        cancelChainChange()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showChainChangeConfirm])

  // 카테고리 호버 핸들러
  const handleCategoryMouseEnter = useCallback((categoryName: string) => {
    setHoveredCategory(categoryName)
  }, [])

  const handleCategoryMouseLeave = useCallback(() => {
    setHoveredCategory(null)
  }, [])

  // 카테고리 전체 선택/해제
  const toggleCategoryWithTopics = useCallback((categoryName: string, topics: string[]) => {
    const isSelected = selectedCategories.includes(categoryName)
    
    if (isSelected) {
      // 카테고리와 모든 토픽 해제
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName))
      setSelectedTopics(selectedTopics.filter(t => !topics.includes(t)))
    } else {
      // 카테고리와 모든 토픽 선택
      setSelectedCategories([...selectedCategories, categoryName])
      const newTopics = topics.filter(t => !selectedTopics.includes(t))
      setSelectedTopics([...selectedTopics, ...newTopics])
    }
  }, [selectedCategories, selectedTopics, setSelectedCategories, setSelectedTopics])

  // 토픽 선택 시 부모 카테고리도 자동 선택
  const handleTopicToggle = useCallback((topicName: string, categoryName: string) => {
    toggleTopic(topicName)
    
    // 토픽이 선택되면 부모 카테고리도 선택
    if (!selectedTopics.includes(topicName) && !selectedCategories.includes(categoryName)) {
      setSelectedCategories([...selectedCategories, categoryName])
    }
  }, [toggleTopic, selectedTopics, selectedCategories, setSelectedCategories])

  // 체인 선택 핸들러
  const handleChainSelect = useCallback((chain: string) => {
    // 현재 선택된 검증인이 있는지 확인
    const selectedValidatorInfo = getSelectedValidatorInfo()
    
    if (selectedValidatorInfo && selectedValidatorInfo.chain !== chain) {
      // 다른 체인으로 변경하려는 경우 확인 다이얼로그 표시
      setPendingChainChange(chain)
      setShowChainChangeConfirm(true)
    } else {
      // 같은 체인이거나 선택된 검증인이 없는 경우 바로 변경
      setSelectedChain(chain)
      setShowChainDropdown(false)
      
      // 체인 변경 시 검색어 초기화 (다른 체인의 검증인 이름일 수 있음)
      if (searchTerm && !chainAutoSelected) {
        setSearchTerm('')
      }
      setChainAutoSelected(false)
    }
  }, [setSelectedChain, searchTerm, setSearchTerm, chainAutoSelected])

  const confirmChainChange = useCallback(() => {
    if (pendingChainChange) {
      setSelectedChain(pendingChainChange)
      setSearchTerm('') // 체인 변경 시 검색어 초기화
      setShowChainDropdown(false)
      setShowChainChangeConfirm(false)
      setPendingChainChange(null)
    }
  }, [pendingChainChange, setSelectedChain, setSearchTerm])

  const cancelChainChange = useCallback(() => {
    setShowChainChangeConfirm(false)
    setPendingChainChange(null)
  }, [])

  const handleValidatorSelect = useCallback((validator: any) => {
    const validatorName = validator.voter_name || 'Unknown'
    setSearchTerm(validatorName)
    setShowValidatorSuggestions(false)
    
    // 검증인의 체인과 현재 선택된 체인이 다르면 자동으로 체인 변경
    if (validator.chain && validator.chain !== selectedChain) {
      setSelectedChain(validator.chain)
      setChainAutoSelected(true)
      console.log(`🔄 Auto-selected chain: ${validator.chain} for validator: ${validatorName}`)
    }
    
    // 포커스를 검색 입력창에서 제거
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
  }, [setSearchTerm, selectedChain, setSelectedChain])

  const handleSearchFocus = useCallback(() => {
    setShowValidatorSuggestions(true)
  }, [])

  // 검색 입력 핸들러 (즉시 반영)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim() === '') {
      setShowValidatorSuggestions(false)
    } else {
      setShowValidatorSuggestions(true)
    }
  }, [setSearchTerm])

  // 선택된 검증인 정보 가져오기 (메모이제이션)
  const getSelectedValidatorInfo = useCallback(() => {
    if (!searchTerm.trim()) return null
    
    const validators = getFilteredValidators()
    const matchingValidator = validators.find(v => 
      (v.voter_name || '').toLowerCase().trim() === searchTerm.toLowerCase().trim()
    )
    
    if (matchingValidator) {
      const stats = calculateValidatorStats(matchingValidator.voter_name)
      return {
        name: matchingValidator.voter_name,
        chain: matchingValidator.chain,
        votingPower: matchingValidator.votingPower || 0,
        ...stats
      }
    }
    
    return null
  }, [searchTerm, getFilteredValidators, calculateValidatorStats])

  // 텍스트 하이라이트 함수 (메모이제이션)
  const highlightText = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    )
  }, [])

  // 로딩 상태 표시
  if (!proposalData) {
    return (
      <div className="w-80 h-full bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading filters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isMobileScreen ? 'w-full' : 'w-80'} bg-white border-r border-gray-200 flex flex-col h-full`}>
      {/* 필터 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* 체인 선택 */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chain
          </label>
          <div className="relative" ref={chainDropdownRef}>
            <button
              onClick={() => setShowChainDropdown(!showChainDropdown)}
              className={`w-full px-3 py-2 text-sm text-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:bg-gray-50 transition-all duration-300 ${
                chainAutoSelected 
                  ? 'border-green-400 bg-green-50 shadow-md' 
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedChain !== 'all' && getChainLogo(selectedChain) && (
                  <Image
                    src={getChainLogo(selectedChain)!}
                    alt={selectedChain}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span>{selectedChain === 'all' ? 'All Chains' : selectedChain}</span>
                {chainAutoSelected && (
                  <span className="text-xs text-green-600 font-medium ml-1">
                    (auto)
                  </span>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showChainDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <button
                  onClick={() => handleChainSelect('all')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 flex items-center gap-2"
                >
                  <span className="text-sm text-gray-900">All Chains</span>
                </button>
                {chains.slice(1).map(chain => (
                  <button
                    key={chain}
                    onClick={() => handleChainSelect(chain)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                  >
                    {getChainLogo(chain) && (
                      <Image
                        src={getChainLogo(chain)!}
                        alt={chain}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-900">{chain}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 검증인 검색 */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Validator Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              placeholder="Search validator name..."
              className="w-full pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* 자동완성 드롭다운 */}
            {showValidatorSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
              >
                {isLoadingValidators ? (
                  <div className="px-3 py-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-600" />
                    <span className="text-xs text-gray-600">Loading validators...</span>
                  </div>
                ) : filteredValidators.length > 0 ? (
                  <>
                    {!searchTerm && (
                      <div className="px-3 py-2 text-xs text-gray-600 text-center border-b border-gray-100 bg-gray-50">
                        Top validators by voting power
                      </div>
                    )}
                    {filteredValidators.map((validator, index) => (
                      <button
                        key={`${validator.voter_name}-${validator.chain}-${index}`}
                        onClick={() => handleValidatorSelect(validator)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {highlightText(validator.voter_name || 'Unknown', searchTerm)}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {validator.chain}
                            </span>
                            <span className="text-xs text-gray-500">
                              {validator.votingPower ? (validator.votingPower * 100).toFixed(3) + '%' : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    {searchTerm ? 'No validators found' : 'No validators available'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 계층형 카테고리 선택 */}
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categories
          </label>
          
          <div className="space-y-1">
            {filteredCategoryHierarchy.length > 0 ? (
              filteredCategoryHierarchy.map((category) => {
                const isHovered = hoveredCategory === category.name
                const isCategorySelected = selectedCategories.includes(category.name)
                const selectedTopicsInCategory = category.topics.filter(topic => 
                  selectedTopics.includes(topic.name)
                )
                const hasSelectedTopics = selectedTopicsInCategory.length > 0
                const allTopicsSelected = selectedTopicsInCategory.length === category.topics.length
                const shouldExpand = isHovered || hasSelectedTopics
                
                // 체크박스 상태 결정
                const checkboxState = allTopicsSelected && isCategorySelected ? 'checked' : 
                                     hasSelectedTopics ? 'indeterminate' : 'unchecked'
                
                return (
                  <div 
                    key={category.name} 
                    className="border border-gray-200 rounded-lg"
                    onMouseEnter={() => handleCategoryMouseEnter(category.name)}
                    onMouseLeave={handleCategoryMouseLeave}
                  >
                    {/* 메인 카테고리 */}
                    <div className="flex items-center p-3 hover:bg-gray-50 relative">
                      {/* 통과율 배경 바 */}
                      <div 
                        className={`absolute left-0 top-0 h-full rounded-l-lg opacity-50 ${
                          category.passRate >= 80 
                            ? 'bg-gradient-to-r from-green-100 to-green-50' 
                            : category.passRate >= 60 
                            ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' 
                            : 'bg-gradient-to-r from-red-100 to-red-50'
                        }`}
                        style={{ width: `${category.passRate}%` }}
                      />
                      
                      <input
                        type="checkbox"
                        checked={checkboxState === 'checked'}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = checkboxState === 'indeterminate'
                          }
                        }}
                        onChange={() => toggleCategoryWithTopics(category.name, category.topics.map(t => t.name))}
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
                        {category.topics.map((topic) => {
                          const isTopicSelected = selectedTopics.includes(topic.name)
                          
                          return (
                            <label
                              key={topic.name}
                              className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer relative"
                            >
                              {/* 토픽 통과율 배경 바 */}
                              <div 
                                className={`absolute left-0 top-0 h-full rounded opacity-50 ${
                                  topic.passRate >= 80 
                                    ? 'bg-gradient-to-r from-green-100 to-green-50' 
                                    : topic.passRate >= 60 
                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' 
                                    : 'bg-gradient-to-r from-red-100 to-red-50'
                                }`}
                                style={{ width: `${topic.passRate}%` }}
                              />
                              
                              <input
                                type="checkbox"
                                checked={isTopicSelected}
                                onChange={() => handleTopicToggle(topic.name, category.name)}
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
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                {selectedChain === 'all' 
                  ? 'Loading categories...' 
                  : `No proposals found for ${selectedChain}.`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 요약 정보 */}
      <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>
                {selectedChain === 'all' ? 'Total Proposals:' : `${selectedChain} Proposals:`}
              </span>
              <span className="font-medium">
                {filteredCategoryHierarchy.reduce((sum, cat) => sum + cat.count, 0)}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>
                {selectedChain === 'all' ? 'Overall Pass Rate:' : `${selectedChain} Pass Rate:`}
              </span>
              <span className="font-medium text-green-600">
                {filteredCategoryHierarchy.length > 0 ? 
                  (filteredCategoryHierarchy.reduce((sum, cat) => sum + (cat.passRate * cat.count), 0) / 
                   filteredCategoryHierarchy.reduce((sum, cat) => sum + cat.count, 0)).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Active Chains:</span>
              <span className="font-medium">{chains.length - 1}</span>
            </div>
            {(selectedCategories.length > 0 || selectedTopics.length > 0) && (
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span>Selected Filters:</span>
                <span className="font-medium text-blue-600">
                  {selectedCategories.length + selectedTopics.length}
                </span>
              </div>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors ml-3"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 체인 변경 확인 다이얼로그 */}
      {showChainChangeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg text-gray-900 font-semibold">Chain Change Warning</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-3">
                You have selected a validator from a different chain. Changing to{' '}
                <span className="font-medium text-blue-600">
                  {pendingChainChange === 'all' ? 'All Chains' : pendingChainChange}
                </span>{' '}
                will clear your current validator selection.
              </p>
              
              {getSelectedValidatorInfo() && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs text-gray-600 mb-1">Currently selected validator:</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {getSelectedValidatorInfo()?.name}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {getSelectedValidatorInfo()?.chain}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelChainChange}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmChainChange}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Continue & Clear Validator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 