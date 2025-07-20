'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, RotateCcw, X } from 'lucide-react'
import { 
  useGlobalStore, 
  getYesRateDistribution, 
  getVotingPowerDistribution, 
  getParticipationRateDistribution,
  type CategoryHierarchyNode, 
  type TopicNode, 
  type Validator 
} from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import Image from 'next/image'
import React from 'react'
import RangeSlider from './ui/RangeSlider'
import ToggleButtonGroup from './ui/ToggleButtonGroup'

const getChainLogo = (chainName: string) => {
  const logoName = chainName.toLowerCase().replace(/\s+/g, '-')
  return `/chain-logos/${logoName}.png`
}

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
  return <div className="absolute left-0 top-0 h-full w-full rounded-lg overflow-hidden">{segments.map((s, i) => <div key={`${s.voteType}-${i}`} className="absolute h-full" style={{ left: `${s.startPosition}%`, width: `${s.percentage}%`, backgroundColor: s.color }} />)}</div>
})

const PassRateBackground = React.memo(({ passRate }: { passRate: number }) => {
  const backgroundClass = useMemo(() => {
    if (passRate >= 80) return 'bg-gradient-to-r from-green-100 to-green-50'
    if (passRate >= 60) return 'bg-gradient-to-r from-yellow-100 to-yellow-50'
    return 'bg-gradient-to-r from-red-100 to-red-50'
  }, [passRate])
  return <div className={`absolute left-0 top-0 h-full rounded-l-lg ${backgroundClass}`} style={{ width: `${passRate}%` }} />
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
          <span className="text-sm font-medium text-gray-700">{`${category.name} (${category.count})`}</span>
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
        <span className="text-xs text-gray-600">{`${topic.name} (${topic.count})`}</span>
      </div>
    </label>
  )
})

export default function FilterPanel() {
  const store = useGlobalStore();
  const {
    selectedCategories,
    selectedTopics,
    selectedChain,
    searchTerm,
    approvalRateRange,
    categoryVisualizationMode,
    validators,
    votingPowerFilterMode,
    votingPowerRange,
    votingPowerDynamicRange,
    setSelectedCategories,
    setSelectedTopics,
    setApprovalRateRange,
    setVotingPowerFilterMode,
    setVotingPowerRange,
    setSelectedChain,
    setSearchTerm,
    setCategoryVisualizationMode,
    getChains,
    getFilteredCategoryHierarchy,
    proposals,
    participationRateRange,
    setParticipationRateRange,
    countNoVoteAsParticipation,
    setCountNoVoteAsParticipation,
  } = store;

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [showChainDropdown, setShowChainDropdown] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Validator[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const yesRateDistribution = useMemo(() => getYesRateDistribution(store), [store.proposals]);
  const votingPowerDistribution = useMemo(() => getVotingPowerDistribution(store), [store.validators]);
  const participationRateDistribution = useMemo(() => getParticipationRateDistribution(store), [store.validators]);

  const resetFilters = useCallback(() => {
    setSelectedCategories([])
    setSelectedTopics([])
    setInputValue('')
    setSearchTerm('')
    setApprovalRateRange([0, 100])
    setVotingPowerFilterMode('ratio');
  }, [setSelectedCategories, setSelectedTopics, setSearchTerm, setApprovalRateRange, setVotingPowerFilterMode])

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
        .slice(0, 10)
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
    setSearchTerm(searchTerm === moniker ? '' : moniker)
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
            <RangeSlider
              label="Yes Rate"
              min={0}
              max={100}
              values={approvalRateRange}
              onChange={setApprovalRateRange}
              formatValue={(v) => `${v}%`}
              step={1}
              color={VOTE_COLORS.YES}
              distributionData={yesRateDistribution}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Categories</h3>
              <ToggleButtonGroup
                options={[{value: 'voteCount', label: 'Vote Count'}, {value: 'passRate', label: 'Pass Rate'}]}
                selectedValue={categoryVisualizationMode}
                onChange={(v) => setCategoryVisualizationMode(v as 'passRate' | 'voteCount')}
              />
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
            <RangeSlider
              label="Avg. Voting Power"
              min={votingPowerDynamicRange[0]}
              max={votingPowerDynamicRange[1]}
              values={votingPowerRange}
              onChange={setVotingPowerRange}
              formatValue={(v) => votingPowerFilterMode === 'ratio' ? `${v.toFixed(2)}%` : `${Math.round(v)}`}
              step={votingPowerFilterMode === 'ratio' ? 0.01 : 1}
              distributionData={votingPowerDistribution}
            >
              <ToggleButtonGroup
                options={[{value: 'ratio', label: 'Ratio'}, {value: 'rank', label: 'Rank'}]}
                selectedValue={votingPowerFilterMode}
                onChange={(v) => setVotingPowerFilterMode(v as 'ratio' | 'rank')}
              />
            </RangeSlider>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-900">Participation Rate</label>
              <label className="flex items-center space-x-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={countNoVoteAsParticipation}
                  onChange={(e) => setCountNoVoteAsParticipation(e.target.checked)}
                  className="form-checkbox h-3 w-3 text-blue-600 rounded"
                />
                <span>Include 'NO_VOTE'</span>
              </label>
            </div>
            <RangeSlider
              label=""
              min={0}
              max={100}
              values={participationRateRange}
              onChange={setParticipationRateRange}
              formatValue={(v) => `${v.toFixed(0)}%`}
              step={1}
              distributionData={participationRateDistribution}
            />
          </div>
        </div>
      </div>
    </div>
  )
}