'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Filter, Search, RotateCcw, X } from 'lucide-react'
import { useGlobalStore, type CategoryHierarchyNode, type TopicNode, type Validator } from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import Image from 'next/image'
import React from 'react'

// A custom hook for the range slider, corrected for smooth dragging
const useRangeSlider = (
  min: number,
  max: number,
  initialValues: [number, number],
  onChangeComplete: (values: [number, number]) => void,
  step: number = 1
) => {
  const [values, setValues] = useState<[number, number]>(initialValues)
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const minThumbRef = useRef<HTMLDivElement>(null)
  const maxThumbRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'min' | 'max' | null>(null)

  const onChangeCompleteRef = useRef(onChangeComplete)
  onChangeCompleteRef.current = onChangeComplete

  const valuesRef = useRef(values)
  valuesRef.current = values

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues[0], initialValues[1]])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const rawValue = (percent / 100) * (max - min) + min
      const newValue = Math.round(rawValue / step) * step;

      setValues(currentValues => {
        let [currentMin, currentMax] = currentValues
        if (draggingRef.current === 'min') {
          currentMin = Math.min(newValue, currentMax)
        } else {
          currentMax = Math.max(newValue, currentMin)
        }
        return [currentMin, currentMax]
      })
    }

    const handleMouseUp = () => {
      if (draggingRef.current) {
        onChangeCompleteRef.current(valuesRef.current)
        draggingRef.current = null
        setActiveThumb(null)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleMouseDown = (thumb: 'min' | 'max') => {
      draggingRef.current = thumb
      setActiveThumb(thumb)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    const minThumb = minThumbRef.current
    const maxThumb = maxThumbRef.current

    const handleMinMouseDown = () => handleMouseDown('min')
    const handleMaxMouseDown = () => handleMouseDown('max')

    minThumb?.addEventListener('mousedown', handleMinMouseDown)
    maxThumb?.addEventListener('mousedown', handleMaxMouseDown)

    return () => {
      minThumb?.removeEventListener('mousedown', handleMinMouseDown)
      maxThumb?.removeEventListener('mousedown', handleMaxMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [min, max, step])

  const minPercent = max > min ? ((values[0] - min) / (max - min)) * 100 : 0
  const maxPercent = max > min ? ((values[1] - min) / (max - min)) * 100 : 0

  return { sliderRef, minThumbRef, maxThumbRef, values, minPercent, maxPercent, activeThumb }
}

const ApprovalRateSlider = () => {
  const approvalRateRange = useGlobalStore(state => state.approvalRateRange)
  const setApprovalRateRange = useGlobalStore(state => state.setApprovalRateRange)

  const { sliderRef, minThumbRef, maxThumbRef, values, minPercent, maxPercent, activeThumb } = useRangeSlider(
    0, 100, approvalRateRange, setApprovalRateRange, 1
  )

  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-medium text-gray-700">Yes Rate</label>
      </div>
      <div 
        className="relative w-full h-9 border border-gray-300 rounded-md overflow-hidden flex items-center justify-center" 
        ref={sliderRef}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gray-200" />
        <div className="absolute top-0 h-full bg-blue-500" style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} />
        
        <span className="relative z-10 text-xs font-medium text-white mix-blend-difference">
          {values[0]}% - {values[1]}%
        </span>

        <div ref={minThumbRef} className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer ${activeThumb === 'min' ? 'z-20' : 'z-10'}`} style={{ left: `${minPercent}%`, transform: 'translate(-50%, -50%)' }} />
        <div ref={maxThumbRef} className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer ${activeThumb === 'max' ? 'z-20' : 'z-10'}`} style={{ left: `${maxPercent}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  )
}

const VotingPowerSlider = () => {
  const {
    votingPowerFilterMode,
    votingPowerRange,
    votingPowerDynamicRange,
    setVotingPowerFilterMode,
    setVotingPowerRange,
  } = useGlobalStore();

  const isRatio = votingPowerFilterMode === 'ratio';
  const [min, max] = votingPowerDynamicRange;
  const step = isRatio ? 0.01 : 1;

  const { sliderRef, minThumbRef, maxThumbRef, values, minPercent, maxPercent, activeThumb } = useRangeSlider(
    min, max, votingPowerRange, setVotingPowerRange, step
  );

  const formatValue = (val: number) => {
    if (isRatio) return `${val.toFixed(2)}%`;
    return `${Math.round(val)}`;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Avg. Voting Power</label>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setVotingPowerFilterMode('ratio')} className={`flex-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${isRatio ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Ratio</button>
          <button onClick={() => setVotingPowerFilterMode('rank')} className={`flex-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${!isRatio ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Rank</button>
        </div>
      </div>
      <div 
        className="relative w-full h-9 border border-gray-300 rounded-md overflow-hidden flex items-center justify-center" 
        ref={sliderRef}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gray-200" />
        <div className="absolute top-0 h-full bg-blue-500" style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} />
        
        <span className="relative z-10 text-xs font-medium text-white mix-blend-difference">
          {formatValue(values[0])} - {formatValue(values[1])}
        </span>

        <div ref={minThumbRef} className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer ${activeThumb === 'min' ? 'z-20' : 'z-10'}`} style={{ left: `${minPercent}%`, transform: 'translate(-50%, -50%)' }} />
        <div ref={maxThumbRef} className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer ${activeThumb === 'max' ? 'z-20' : 'z-10'}`} style={{ left: `${maxPercent}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  );
}


const getChainLogo = (chainName: string) => {
  const logoName = chainName.toLowerCase().replace(/\s+/g, '-')
  return `/chain-logos/${logoName}.png`
}

const VotingPowerBackground = React.memo(({ votingPowerDistribution }: { votingPowerDistribution: { [key: string]: number } }) => {
  const segments = useMemo(() => {
    if (!votingPowerDistribution || typeof votingPowerDistribution !== 'object') return []
    const totalPower = Object.values(votingPowerDistribution).reduce((sum, power) => sum + power, 0)
    if (totalPower === 0) return []

    let currentPosition = 0
    return VOTE_ORDER.map(voteType => {
      const power = votingPowerDistribution[voteType] || 0
      const percentage = (power / totalPower) * 100
      const segment = { voteType, startPosition: currentPosition, percentage, color: VOTE_COLORS[voteType] }
      currentPosition += percentage
      return segment
    }).filter(segment => segment.percentage > 0)
  }, [votingPowerDistribution])

  if (segments.length === 0) return null
  return <div className="absolute left-0 top-0 h-full w-full rounded-lg overflow-hidden opacity-50">{segments.map((s, i) => <div key={`${s.voteType}-${i}`} className="absolute h-full" style={{ left: `${s.startPosition}%`, width: `${s.percentage}%`, backgroundColor: s.color }} />)}</div>
})

const VoteCountBackground = React.memo(({ voteDistribution }: { voteDistribution: { [key: string]: number } }) => {
  const segments = useMemo(() => {
    if (!voteDistribution || typeof voteDistribution !== 'object') return []
    const totalVotes = Object.values(voteDistribution).reduce((sum, count) => sum + count, 0)
    if (totalVotes === 0) return []

    let currentPosition = 0
    return VOTE_ORDER.map(voteType => {
      const count = voteDistribution[voteType] || 0
      const percentage = (count / totalVotes) * 100
      const segment = { voteType, startPosition: currentPosition, percentage, color: VOTE_COLORS[voteType] }
      currentPosition += percentage
      return segment
    }).filter(segment => segment.percentage > 0)
  }, [voteDistribution])

  if (segments.length === 0) return null
  return <div className="absolute left-0 top-0 h-full w-full rounded-lg overflow-hidden opacity-50">{segments.map((s, i) => <div key={`${s.voteType}-${i}`} className="absolute h-full" style={{ left: `${s.startPosition}%`, width: `${s.percentage}%`, backgroundColor: s.color }} />)}</div>
})

const PassRateBackground = React.memo(({ passRate }: { passRate: number }) => {
  const backgroundClass = useMemo(() => {
    if (passRate >= 80) return 'bg-gradient-to-r from-green-100 to-green-50'
    if (passRate >= 60) return 'bg-gradient-to-r from-yellow-100 to-yellow-50'
    return 'bg-gradient-to-r from-red-100 to-red-50'
  }, [passRate])
  return <div className={`absolute left-0 top-0 h-full rounded-l-lg opacity-50 ${backgroundClass}`} style={{ width: `${passRate}%` }} />
})

const CategoryItem = React.memo(({ category, isHovered, isCategorySelected, selectedTopicsInCategory, hasSelectedTopics, allTopicsSelected, categoryVisualizationMode, onCategoryMouseEnter, onCategoryMouseLeave, onToggleCategoryWithTopics, onTopicToggle }: { category: CategoryHierarchyNode; isHovered: boolean; isCategorySelected: boolean; selectedTopicsInCategory: string[]; hasSelectedTopics: boolean; allTopicsSelected: boolean; categoryVisualizationMode: 'passRate' | 'voteCount'; onCategoryMouseEnter: (name: string) => void; onCategoryMouseLeave: () => void; onToggleCategoryWithTopics: (categoryName: string, topicNames: string[]) => void; onTopicToggle: (topicName: string, categoryName: string) => void; }) => {
  const shouldExpand = isHovered || hasSelectedTopics
  const checkboxState = allTopicsSelected && isCategorySelected ? 'checked' : hasSelectedTopics ? 'indeterminate' : 'unchecked'

  return (
    <div className="border border-gray-200 rounded-lg" onMouseEnter={() => onCategoryMouseEnter(category.name)} onMouseLeave={onCategoryMouseLeave}>
      <div className="flex items-center px-3 py-2 hover:bg-gray-50 relative">
        {categoryVisualizationMode === 'passRate' ? <PassRateBackground passRate={category.passRate} /> : <VoteCountBackground voteDistribution={category.voteDistribution} />}
        <input type="checkbox" checked={checkboxState === 'checked'} ref={el => el && (el.indeterminate = checkboxState === 'indeterminate')} onChange={() => onToggleCategoryWithTopics(category.name, category.topics.map(t => t.name))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 relative z-10 mr-2" />
        <div className="flex items-center justify-between flex-1 relative z-10">
          <span className="text-sm font-medium text-gray-700">{category.name}</span>
          <div className="flex items-center gap-2 text-xs">
            <span>{category.count}</span>
            <span className={`font-medium ${category.passRate >= 80 ? 'text-green-600' : category.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{category.passRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div className={`border-t border-gray-200 bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out ${shouldExpand ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-2 space-y-1 overflow-y-auto">
          {category.topics.map(topic => <TopicItem key={topic.name} topic={topic} isSelected={selectedTopicsInCategory.includes(topic.name)} categoryVisualizationMode={categoryVisualizationMode} categoryName={category.name} onToggle={onTopicToggle} />)}
        </div>
      </div>
    </div>
  )
})

const TopicItem = React.memo(({ topic, isSelected, categoryVisualizationMode, categoryName, onToggle }: { topic: TopicNode; isSelected: boolean; categoryVisualizationMode: 'passRate' | 'voteCount'; categoryName: string; onToggle: (topicName: string, categoryName: string) => void; }) => {
  return (
    <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer relative">
      {categoryVisualizationMode === 'passRate' ? <PassRateBackground passRate={topic.passRate} /> : <VoteCountBackground voteDistribution={topic.voteDistribution} />}
      <input type="checkbox" checked={isSelected} onChange={() => onToggle(topic.name, categoryName)} className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 relative z-10" />
      <div className="flex items-center justify-between flex-1 relative z-10">
        <span className="text-xs text-gray-600">{topic.name}</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">{topic.count}</span>
          <span className={`font-medium ${topic.passRate >= 80 ? 'text-green-600' : topic.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{topic.passRate.toFixed(1)}%</span>
        </div>
      </div>
    </label>
  )
})

export default function FilterPanel() {
  const {
    selectedCategories,
    selectedTopics,
    selectedChain,
    searchTerm,
    approvalRateRange,
    categoryVisualizationMode,
    validators,
    setSelectedCategories,
    setSelectedTopics,
    setApprovalRateRange,
    setVotingPowerFilterMode,
    setSelectedChain,
    setSearchTerm,
    setCategoryVisualizationMode,
    getChains,
    getFilteredCategoryHierarchy,
    proposals, // Get proposals for dependency array
  } = useGlobalStore()

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [showChainDropdown, setShowChainDropdown] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Validator[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)


  const handleVisualizationModeChange = useCallback((mode: 'passRate' | 'voteCount') => {
    setCategoryVisualizationMode(mode)
  }, [setCategoryVisualizationMode])

  const resetFilters = useCallback(() => {
    setSelectedCategories([])
    setSelectedTopics([])
    setInputValue('')
    setSearchTerm('')
    setApprovalRateRange([0, 100])
    setVotingPowerFilterMode('ratio');
    // The dynamic range will be reset in the heatmap component effect
  }, [setSelectedCategories, setSelectedTopics, setSearchTerm, setApprovalRateRange, setVotingPowerFilterMode])

  const activeFiltersCount = useMemo(() => [
    selectedCategories.length > 0,
    selectedTopics.length > 0,
    searchTerm.length > 0,
    approvalRateRange[0] > 0 || approvalRateRange[1] < 100
  ].filter(Boolean).length, [selectedCategories.length, selectedTopics.length, searchTerm.length, approvalRateRange])

  const chains = useMemo(() => getChains(), [getChains])
  const filteredCategoryHierarchy = useMemo(() => getFilteredCategoryHierarchy(), [proposals, approvalRateRange, getFilteredCategoryHierarchy]);


  const handleCategoryMouseEnter = useCallback((categoryName: string) => setHoveredCategory(categoryName), [])
  const handleCategoryMouseLeave = useCallback(() => setHoveredCategory(null), [])

  const handleTopicToggle = useCallback((topicName: string, categoryName: string) => {
    const store = useGlobalStore.getState();
    store.toggleTopic(topicName);
    if (!store.selectedTopics.includes(topicName) && !store.selectedCategories.includes(categoryName)) {
      store.setSelectedCategories([...store.selectedCategories, categoryName]);
    }
  }, [])

  const toggleCategoryWithTopics = useCallback((categoryName: string, topicNames: string[]) => {
    const store = useGlobalStore.getState();
    const isCategorySelected = store.selectedCategories.includes(categoryName);
    const selectedTopicsInCategory = store.selectedTopics.filter(topic => topicNames.includes(topic));
    const allTopicsSelected = selectedTopicsInCategory.length === topicNames.length;

    if (allTopicsSelected && isCategorySelected) {
      store.setSelectedCategories(store.selectedCategories.filter(c => c !== categoryName));
      store.setSelectedTopics(store.selectedTopics.filter(t => !topicNames.includes(t)));
    } else {
      if (!isCategorySelected) {
        store.setSelectedCategories([...store.selectedCategories, categoryName]);
      }
      const newTopics = [...new Set([...store.selectedTopics, ...topicNames])];
      store.setSelectedTopics(newTopics);
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (value) {
      const filteredSuggestions = validators
        .filter(v => v.moniker?.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10) // 제안 개수 제한
      setSuggestions(filteredSuggestions)
      setIsDropdownOpen(true)
    } else {
      setSuggestions([])
      setIsDropdownOpen(false)
    }
  }

  const handleSearchFocus = () => {
    if (!inputValue) {
      const initialSuggestions = validators.slice(0, 10);
      setSuggestions(initialSuggestions);
    }
    setIsDropdownOpen(true);
  };

  const handleSuggestionClick = (moniker: string) => {
    if (searchTerm === moniker) {
      setSearchTerm('')
    } else {
      setSearchTerm(moniker)
    }
    setInputValue('')
    setSuggestions([])
    setIsDropdownOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target as Node)) {
        setShowChainDropdown(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Chain Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Chain</h3>
            <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"><RotateCcw className="w-3 h-3" />Reset</button>
          </div>
          <div className="relative mb-4" ref={chainDropdownRef}>
            <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md">
              <div className="flex items-center gap-2">
                {selectedChain !== 'all' && <Image src={getChainLogo(selectedChain)} alt={selectedChain} width={16} height={16} className="rounded-full" />}
                <span className="capitalize font-medium text-gray-800">{selectedChain}</span>
              </div>
            </button>
            {showChainDropdown && <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {chains.map(chain => (
                <button 
                  key={chain} 
                  onClick={() => { setSelectedChain(chain); setShowChainDropdown(false); }} 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <Image src={getChainLogo(chain)} alt={chain} width={16} height={16} className="rounded-full" />
                  <span className="capitalize">{chain}</span>
                </button>
              ))}
            </div>}
          </div>
        </div>

        {/* Proposal Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Proposal</h3>
          <div className="mb-4">
            <ApprovalRateSlider />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Categories</h3>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => handleVisualizationModeChange('voteCount')} className={`flex-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${categoryVisualizationMode === 'voteCount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Vote Count</button>
                <button onClick={() => handleVisualizationModeChange('passRate')} className={`flex-1 px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${categoryVisualizationMode === 'passRate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}>Pass Rate</button>
              </div>
            </div>
            <div className="space-y-3">
              {filteredCategoryHierarchy.map(category => (
                <CategoryItem 
                  key={category.name} 
                  category={category} 
                  isHovered={hoveredCategory === category.name} 
                  isCategorySelected={selectedCategories.includes(category.name)} 
                  selectedTopicsInCategory={selectedTopics.filter(topic => category.topics.some(t => t.name === topic))} 
                  hasSelectedTopics={selectedTopics.filter(topic => category.topics.some(t => t.name === topic)).length > 0} 
                  allTopicsSelected={category.topics.every(t => selectedTopics.includes(t.name))} 
                  categoryVisualizationMode={categoryVisualizationMode} 
                  onCategoryMouseEnter={handleCategoryMouseEnter} 
                  onCategoryMouseLeave={handleCategoryMouseLeave} 
                  onToggleCategoryWithTopics={toggleCategoryWithTopics} 
                  onTopicToggle={handleTopicToggle} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Validator Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Validator</h3>
            {searchTerm && (
              <div className="text-sm text-gray-700 bg-blue-100 px-2 py-1 rounded-md flex items-center gap-2">
                <span className="font-medium truncate max-w-32">{searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="text-blue-600 hover:text-blue-800">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="mb-4" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Type validator name..." 
                value={inputValue} 
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md text-gray-800 placeholder-gray-500" 
              />
              {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((validator, index) => (
                    <button
                      key={`${validator.operator_address}-${index}`}
                      onClick={() => handleSuggestionClick(validator.moniker || '')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {validator.moniker}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mb-4">
            <VotingPowerSlider />
          </div>
        </div>
      </div>
    </div>
  )
}