'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, RotateCcw, ChevronDown } from 'lucide-react'
import { 
  useGlobalStore, 
  getConflictIndexDistribution, 
  getSubmitTimeDistribution,
  getAvgVotingPowerDistribution,
  type CategoryHierarchyNode, 
  type TopicNode, 
  type Validator 
} from '@/stores/useGlobalStore'
import { VOTE_COLORS, VOTE_ORDER } from '@/constants/voteColors'
import { CATEGORY_COLORS } from '@/constants/categoryColors'
import Image from 'next/image'
import React from 'react'
import DistributionSlider from './ui/DistributionSlider'
import SimpleRangeSlider from './ui/SimpleRangeSlider'
import ToggleButtonGroup from './ui/ToggleButtonGroup'

const getChainLogo = (chainName: string) => {
  const logoName = chainName.toLowerCase().replace(/\s+/g, '-')
  return `/chain-logos/${logoName}.png`
}

const MiniVoteBar = React.memo(({ voteDistribution }: { voteDistribution: { [key: string]: number } }) => {
  const segments = useMemo(() => {
    if (!voteDistribution || typeof voteDistribution !== 'object') return []
    const totalVotes = Object.values(voteDistribution).reduce((sum, count) => sum + count, 0)
    if (totalVotes === 0) return []

    return VOTE_ORDER.map(voteType => {
      const count = voteDistribution[voteType] || 0
      const percentage = (count / totalVotes) * 100
      return { voteType, percentage, color: VOTE_COLORS[voteType] }
    }).filter(segment => segment.percentage > 0)
  }, [voteDistribution])

  if (segments.length === 0) return <div className="h-1.5 bg-gray-200 rounded-full" />;
  
  return (
    <div className="w-full flex h-1.5 rounded-full overflow-hidden bg-gray-200">
      {segments.map((s, i) => (
        <div 
          key={`${s.voteType}-${i}`} 
          className="h-full"
          style={{ 
            width: `${s.percentage}%`, 
            backgroundColor: s.color 
          }} 
        />
      ))}
    </div>
  )
})

const CategoryItem = React.memo(({ category, isOpen, onCategoryClick, isCategorySelected, selectedTopicsInCategory, hasSelectedTopics, allTopicsSelected, onToggleCategoryWithTopics, onTopicToggle }: { category: CategoryHierarchyNode; isOpen: boolean; onCategoryClick: (name: string) => void; isCategorySelected: boolean; selectedTopicsInCategory: string[]; hasSelectedTopics: boolean; allTopicsSelected: boolean; onToggleCategoryWithTopics: (categoryName: string, topicNames: string[]) => void; onTopicToggle: (topicName: string, categoryName: string) => void; }) => {
  const checkboxState = allTopicsSelected && isCategorySelected ? 'checked' : hasSelectedTopics ? 'indeterminate' : 'unchecked'
  const categoryColor = CATEGORY_COLORS[category.name] || '#6B7280'

  return (
    <div className="relative border-b border-gray-200 last:border-b-0">
      {/* Color Band */}
      <div 
        className="absolute top-0 left-0 h-full w-1 transition-colors duration-200"
        style={{ backgroundColor: categoryColor }} 
      />
      
      {/* Header */}
      <div 
        className="flex items-center h-7 px-3 cursor-pointer hover:bg-gray-100"
        onClick={() => onCategoryClick(category.name)}
      >
        <div className="flex items-center flex-1 gap-3">
          <input 
            type="checkbox" 
            checked={checkboxState === 'checked'} 
            ref={el => el && (el.indeterminate = checkboxState === 'indeterminate')} 
            onChange={(e) => {
              e.stopPropagation();
              onToggleCategoryWithTopics(category.name, category.topics.map(t => t.name));
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="h3-small-title text-gray-800 flex-1">{`${category.name} (${category.count})`}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>

      {/* Expandable Topics */}
      <div className={`bg-gray-50 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="py-2 space-y-1 border-t border-gray-200">
          {category.topics.map(topic => <TopicItem key={topic.name} topic={topic} isSelected={selectedTopicsInCategory.includes(topic.name)} categoryName={category.name} onToggle={onTopicToggle} />)}
        </div>
      </div>
    </div>
  )
})

const TopicItem = React.memo(({ topic, isSelected, categoryName, onToggle }: { topic: TopicNode & { displayName?: string }; isSelected: boolean; categoryName: string; onToggle: (topicName: string, categoryName: string) => void; }) => {
  return (
    <label className="flex items-center gap-3 h-7 px-3 hover:bg-white rounded cursor-pointer">
      <input type="checkbox" checked={isSelected} onChange={() => onToggle(topic.name, categoryName)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="h3-small-title text-gray-600">{`${topic.displayName || topic.name} (${topic.count})`}</span>
        </div>
        <MiniVoteBar voteDistribution={topic.voteDistribution} />
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
    conflictIndexRange,
    proposalAbstainRateRange,
    categoryVisualizationMode,
    validators,
    votingPowerDisplayMode,
    votingPowerRange,
    avgVotingPowerDynamicRange,
    participationRateRange,
    participationRateDistribution,
    recentVotingPowerValidatorCount,
    setSelectedCategories,
    setSelectedTopics,
    setConflictIndexRange,
    setProposalAbstainRateRange,
    setVotingPowerDisplayMode,
    setVotingPowerRange,
    setSelectedChain,
    setSearchTerm,
    setCategoryVisualizationMode,
    getChains,
    getFilteredCategoryHierarchy,
    proposals,
    setParticipationRateRange,
  } = store;

  const [openCategories, setOpenCategories] = useState<string[]>([])
  const [showChainDropdown, setShowChainDropdown] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Validator[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [localAbstainRateRange, setLocalAbstainRateRange] = useState(proposalAbstainRateRange)
  const [localRecentVotingPowerRange, setLocalRecentVotingPowerRange] = useState(store.recentVotingPowerRange)

  useEffect(() => {
    setLocalAbstainRateRange(proposalAbstainRateRange)
  }, [proposalAbstainRateRange])

  useEffect(() => {
    setLocalRecentVotingPowerRange(store.recentVotingPowerRange)
  }, [store.recentVotingPowerRange])

  const conflictIndexDistribution = useMemo(() => getConflictIndexDistribution(store), [store.proposals, store.submitTimeRange, categoryVisualizationMode, store.votes]);
  const submitTimeDistribution = useMemo(() => getSubmitTimeDistribution(store), [store.proposals]);
  const avgVotingPowerDistribution = useMemo(() => getAvgVotingPowerDistribution(store), [store.validatorsWithDerivedData]);

  const resetFilters = useCallback(() => {
    store.resetFilters();
    setInputValue('');
  }, [store])

  const chains = useMemo(() => getChains(), [getChains])
  const filteredCategoryHierarchy = useMemo(() => getFilteredCategoryHierarchy(), [proposals, conflictIndexRange, proposalAbstainRateRange, categoryVisualizationMode, getFilteredCategoryHierarchy, store.submitTimeRange, store.votes]);

  const handleCategoryClick = useCallback((categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(cn => cn !== categoryName) 
        : [...prev, categoryName]
    )
  }, [])

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
    const lowercasedValue = value.toLowerCase()
    setInputValue(value)

    if (value) {
      const filteredSuggestions = validators
        .filter(v => v.moniker?.toLowerCase().startsWith(lowercasedValue))
        .sort((a, b) => {
          const aName = a.moniker?.toLowerCase() || ''
          const bName = b.moniker?.toLowerCase() || ''
          if (aName < bName) return -1
          if (aName > bName) return 1
          return 0
        })
      
      setSuggestions(filteredSuggestions)
      setIsDropdownOpen(true)
    } else {
      setSuggestions([])
      setIsDropdownOpen(false)
    }
  }

  const handleSearchFocus = () => {
    if (!inputValue) {
      setSuggestions(validators);
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
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">

        {/* Chain Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="h2-subtitle text-gray-900">Chain</h3>
            <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1 content-text text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"><RotateCcw className="w-3 h-3" />Reset</button>
          </div>
          <div className="relative" ref={chainDropdownRef}>
            <div className="w-full bg-white border border-gray-300 rounded-md overflow-hidden transition-all duration-150">
              <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full flex items-center justify-between px-3 h-7 focus:outline-none hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-center gap-2">
                  {selectedChain !== 'all' && <Image src={getChainLogo(selectedChain)} alt={selectedChain} width={16} height={16} className="rounded-full" />}
                  <span className="capitalize h3-small-title text-gray-800">{selectedChain}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showChainDropdown ? 'transform rotate-180' : ''}`} />
              </button>
              <div className={`max-h-0 overflow-y-auto transition-all duration-300 ease-in-out border-t ${showChainDropdown ? 'max-h-48 border-gray-200' : 'border-transparent'}`}>
                {chains.map(chain => (
                  <button 
                    key={chain} 
                    onClick={() => { setSelectedChain(chain); setShowChainDropdown(false); }} 
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <Image src={getChainLogo(chain)} alt={chain} width={16} height={16} className="rounded-full" />
                    <span className="capitalize h3-small-title text-gray-800">{chain}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Proposal Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="h2-subtitle text-gray-900">Proposal</h3>
            <ToggleButtonGroup
              options={[{value: 'votePower', label: 'Voting Power'}, {value: 'voteCount', label: 'Vote Count'}]}
              selectedValue={categoryVisualizationMode}
              onChange={(v) => setCategoryVisualizationMode(v as 'voteCount' | 'votePower')}
            />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="h3-small-title text-gray-900">Proposal Type</h3>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {filteredCategoryHierarchy.map(category => (
                <CategoryItem 
                  key={category.name} 
                  category={category}
                  isOpen={openCategories.includes(category.name)}
                  onCategoryClick={handleCategoryClick}
                  isCategorySelected={selectedCategories.includes(category.name)} 
                  selectedTopicsInCategory={selectedTopics.filter(topic => category.topics.some(t => t.name === topic))} 
                  hasSelectedTopics={selectedTopics.filter(topic => category.topics.some(t => t.name === topic)).length > 0} 
                  allTopicsSelected={category.topics.every(t => selectedTopics.includes(t.name))} 
                  onToggleCategoryWithTopics={toggleCategoryWithTopics} 
                  onTopicToggle={handleTopicToggle} 
                />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block h3-small-title text-gray-900 mb-2">Submission Time</label>
            <DistributionSlider
              min={store.submitTimeDynamicRange[0]}
              max={store.submitTimeDynamicRange[1]}
              values={store.submitTimeRange}
              onChange={store.setSubmitTimeRange}
              formatValue={(v) => new Date(v).toISOString().split('T')[0]}
              step={86400000} // 1 day in milliseconds
              distributionData={submitTimeDistribution}
            />
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block h3-small-title text-gray-900">Conflict Index</label>
            </div>
            <DistributionSlider
              min={0}
              max={1}
              values={conflictIndexRange}
              onChange={setConflictIndexRange}
              formatValue={(v) => v.toFixed(2)}
              step={0.01}
              distributionData={conflictIndexDistribution}
            />
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block h3-small-title text-gray-900">Abstain Rate</label>
            </div>
            <div className="px-1">
              <SimpleRangeSlider
                min={0}
                max={100}
                values={localAbstainRateRange}
                onValuesChange={setLocalAbstainRateRange}
                onChange={setProposalAbstainRateRange}
                step={1}
              />
            </div>
            <div className="flex justify-between items-end text-xs text-gray-600 mt-1">
              <span className="content-text">{localAbstainRateRange[0].toFixed(0)}%</span>
              <span className="content-text">{localAbstainRateRange[1].toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Validator Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="h2-subtitle text-gray-900">Validator</h3>
            <ToggleButtonGroup
              options={[
                { value: 'recent', label: 'Recent VP' },
                { value: 'average', label: 'Avg. VP' },
              ]}
              selectedValue={store.votingPowerSortType}
              onChange={(v) => store.setVotingPowerSortType(v as 'average' | 'recent')}
            />
          </div>
          <div className="relative mb-4" ref={searchRef}>
            <div className="w-full bg-white border border-gray-300 rounded-md overflow-hidden transition-all duration-150">
              <div className="relative hover:bg-gray-50 transition-colors duration-150">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Type validator name..." 
                  value={inputValue} 
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  className="w-full pl-10 pr-4 h-7 h3-small-title bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none" 
                />
              </div>
              <div className={`max-h-0 overflow-y-auto transition-all duration-300 ease-in-out border-t ${isDropdownOpen && suggestions.length > 0 ? 'max-h-60 border-gray-200' : 'border-transparent'}`}>
                {suggestions.map((validator, index) => (
                  <button
                    key={`${validator.operator_address}-${index}`}
                    onClick={() => handleSuggestionClick(validator.moniker || '')}
                    className="w-full text-left px-4 py-2 h3-small-title text-gray-700 hover:bg-gray-50"
                  >
                    {validator.moniker}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="h3-small-title text-gray-900">Voting Power</label>
              <ToggleButtonGroup
                options={[{value: 'percentile', label: 'Percentile'}, {value: 'rank', label: 'Rank'}]}
                selectedValue={votingPowerDisplayMode}
                onChange={(v) => setVotingPowerDisplayMode(v as 'percentile' | 'rank')}
              />
            </div>
            {store.votingPowerSortType === 'recent' ? (
              <div className="px-1">
                <SimpleRangeSlider
                  min={votingPowerDisplayMode === 'rank' ? 1 : 0}
                  max={votingPowerDisplayMode === 'rank' ? recentVotingPowerValidatorCount || 1 : 100}
                  values={localRecentVotingPowerRange}
                  onValuesChange={setLocalRecentVotingPowerRange}
                  onChange={store.setRecentVotingPowerRange}
                  step={1}
                />
                <div className="flex justify-between items-end text-xs text-gray-600 mt-1">
                  <span className="content-text">{votingPowerDisplayMode === 'rank' ? `${recentVotingPowerValidatorCount - localRecentVotingPowerRange[0] + 1}` : `${(100 - localRecentVotingPowerRange[0]).toFixed(0)}%`}</span>
                  <span className="content-text">{votingPowerDisplayMode === 'rank' ? `${recentVotingPowerValidatorCount - localRecentVotingPowerRange[1] + 1}` : `${(100 - localRecentVotingPowerRange[1]).toFixed(0)}%`}</span>
                </div>
              </div>
            ) : (
              <DistributionSlider
                min={votingPowerDisplayMode === 'rank' ? 1 : 0}
                max={votingPowerDisplayMode === 'rank' ? validators.length || 1 : 100}
                values={votingPowerRange}
                onChange={setVotingPowerRange}
                formatValue={(v) => {
                  if (votingPowerDisplayMode === 'rank') {
                    const totalValidators = validators.length || 1;
                    const displayRank = totalValidators - v + 1;
                    return `${displayRank}`;
                  }
                  return `${100 - v}%`;
                }}
                step={1}
                distributionData={avgVotingPowerDistribution}
              />
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block h3-small-title text-gray-900">Participation Rate</label>
            </div>
            <DistributionSlider
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
