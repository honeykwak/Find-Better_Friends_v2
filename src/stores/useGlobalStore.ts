import { create } from 'zustand'
import { loadAllData, processProposalData, processValidatorData, type Proposal, type Vote, type Validator } from '@/lib/dataLoader'

// 카테고리 계층 구조 타입
interface CategoryHierarchy {
  name: string
  count: number
  passRate: number
  topics: { name: string; count: number; passRate: number }[]
}

// 프로포절 관련 데이터 타입
interface ProposalData {
  categories: { name: string; passRate: number; count: number }[]
  categoryHierarchy: CategoryHierarchy[]
  chains: { name: string; proposals: number; passRate: number }[]
  trends: { year: number; count: number; passRate: number }[]
}

// 검증인 관련 데이터 타입
interface ProcessedValidator {
  validator_id: string
  chain: string
  validator_address: string
  voter_name: string
  votingPower: number
  similarity: number
  priority: number
  recentVotes: { proposal: string; vote: string }[]
  // 활동 및 영향력 통계
  totalVotes: number
  firstVoteDate?: string
  lastVoteDate?: string
  activePeriodDays?: number
  influenceRate: number // 의도대로 결과가 나온 비율
  participationRate: number // 전체 제안 대비 참여율
  votingPowerTrend: Array<{ date: string; power: number }> // 투표력 변화 추이
}

interface ValidatorData {
  validators: ProcessedValidator[]
  selectedValidator: ProcessedValidator | null
  similarValidators: ProcessedValidator[]
}

// 전역 상태 인터페이스
interface GlobalStore {
  // 원본 데이터
  rawProposals: Proposal[]
  rawValidators: Validator[]
  rawVotes: Vote[]
  
  // 처리된 데이터
  proposalData: ProposalData | null
  validatorData: ValidatorData
  
  // 공통 필터 상태
  selectedChain: string
  selectedCategories: string[] // 다중 카테고리 선택
  selectedTopics: string[] // 다중 상세 카테고리 선택
  searchTerm: string
  
  // UI 상태
  loading: boolean
  error: string | null
  windowSize: { width: number; height: number }
  showInfo: boolean
  splitRatio: number // 프로포절:검증인 분할 비율 (0.3 = 30%:70%)
  
  // 검증인 특화 상태
  selectedValidator: ProcessedValidator | null
  
  // 액션들
  loadData: () => Promise<void>
  setSelectedChain: (chain: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedTopics: (topics: string[]) => void
  toggleCategory: (category: string) => void
  toggleTopic: (topic: string) => void
  setSearchTerm: (term: string) => void
  setWindowSize: (size: { width: number; height: number }) => void
  setShowInfo: (show: boolean) => void
  setSelectedValidator: (validator: ProcessedValidator | null) => void
  setSplitRatio: (ratio: number) => void
  
  // 필터링된 데이터 가져오기
  getFilteredProposals: () => Proposal[]
  getFilteredValidators: () => ProcessedValidator[]
  getChains: () => string[]
  getCategories: () => string[]
  getFilteredCategoryHierarchy: () => CategoryHierarchy[]
  
  // 동적 검증인 통계 계산
  calculateValidatorStats: (validatorId: string) => {
    totalVotes: number
    firstVoteDate?: string
    lastVoteDate?: string
    activePeriodDays?: number
    influenceRate: number
    participationRate: number
    votingPowerTrend: Array<{ timestamp: number; power: number; proposal_id: string; relativePosition: number }>
    filteredProposalMarkers: Array<{ 
      timestamp: number; 
      proposal_id: string; 
      relativePosition: number; 
      category: string; 
      topic: string; 
      passed: boolean 
    }>
    eligibleProposalsCount: number
    chainTimespan: {
      firstTimestamp: number
      lastTimestamp: number
      firstDate: string
      lastDate: string
    }
  } | null
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  // 초기 상태
  rawProposals: [],
  rawValidators: [],
  rawVotes: [],
  proposalData: null,
  validatorData: {
    validators: [],
    selectedValidator: null,
    similarValidators: []
  },
  selectedChain: 'all',
  selectedCategories: [],
  selectedTopics: [],
  searchTerm: '',
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },
  showInfo: false,
  selectedValidator: null,
  splitRatio: 0.3, // 기본값: 30%:70%

  // 데이터 로딩
  loadData: async () => {
    try {
      set({ loading: true, error: null })
      console.log('GlobalStore: Starting data load...')
      
      const { proposals, validators, votes } = await loadAllData()
      console.log('GlobalStore: Data loaded successfully:', {
        proposals: proposals.length,
        validators: validators.length,
        votes: votes.length
      })
      
      // 프로포절 데이터 처리
      const processedProposalData = processProposalData(proposals)
      
      // 검증인 데이터 처리
      console.log('GlobalStore: Processing validator data...')
      const processedValidators = processValidatorData(validators, votes, proposals)
      console.log('GlobalStore: Processed validators count:', processedValidators.length)
      
      const filteredValidators = processedValidators.filter(v => v !== null) as ProcessedValidator[]
      console.log('GlobalStore: Filtered validators count:', filteredValidators.length)
      
      // 체인별 검증인 수 확인
      const validatorsByChain = filteredValidators.reduce((acc, v) => {
        acc[v.chain] = (acc[v.chain] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('GlobalStore: Validators by chain:', validatorsByChain)
      
      set({
        rawProposals: proposals,
        rawValidators: validators,
        rawVotes: votes,
        proposalData: processedProposalData,
        validatorData: {
          validators: filteredValidators,
          selectedValidator: null,
          similarValidators: []
        },
        loading: false
      })
      
      console.log('GlobalStore: Data processing complete')
    } catch (err: any) {
      console.error('GlobalStore: Failed to load data:', err)
      set({ 
        error: `Failed to load data: ${err?.message || 'Unknown error'}`,
        loading: false 
      })
    }
  },

  // 필터 액션들
  setSelectedChain: (chain: string) => {
    // 체인 변경 시 카테고리와 토픽 선택 초기화 (계층적 필터링)
    set({ 
      selectedChain: chain,
      selectedCategories: [],
      selectedTopics: []
    })
    console.log('GlobalStore: Chain filter changed to:', chain, '- Categories and topics reset')
  },

  setSelectedCategories: (categories: string[]) => {
    set({ selectedCategories: categories })
    console.log('GlobalStore: Categories filter changed to:', categories)
  },

  setSelectedTopics: (topics: string[]) => {
    set({ selectedTopics: topics })
    console.log('GlobalStore: Topics filter changed to:', topics)
  },

  toggleCategory: (category: string) => {
    const { selectedCategories } = get()
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category]
    set({ selectedCategories: newCategories })
  },

  toggleTopic: (topic: string) => {
    const { selectedTopics } = get()
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter(t => t !== topic)
      : [...selectedTopics, topic]
    set({ selectedTopics: newTopics })
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term })
  },

  // UI 상태 액션들
  setWindowSize: (size: { width: number; height: number }) => {
    set({ windowSize: size })
  },

  setShowInfo: (show: boolean) => {
    set({ showInfo: show })
  },

  setSelectedValidator: (validator: ProcessedValidator | null) => {
    set({ selectedValidator: validator })
    
    if (validator) {
      // 유사한 검증인들 계산 (기존 로직 활용)
      const { validatorData } = get()
      const similarValidators = validatorData.validators
        .filter(v => v.validator_id !== validator.validator_id)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
      
      set({
        validatorData: {
          ...validatorData,
          selectedValidator: validator,
          similarValidators
        }
      })
    }
  },

  setSplitRatio: (ratio: number) => {
    // 비율을 0.1 ~ 0.9 사이로 제한
    const clampedRatio = Math.max(0.1, Math.min(0.9, ratio))
    set({ splitRatio: clampedRatio })
  },

  // 필터링된 데이터 가져오기 (계층적 필터링)
  getFilteredProposals: () => {
    const { rawProposals, selectedChain, selectedCategories, selectedTopics } = get()
    let filtered = rawProposals

    // 1단계: 체인 필터링 (최우선)
    if (selectedChain !== 'all') {
      filtered = filtered.filter(p => p.chain === selectedChain)
    }

    // 2단계: 카테고리 필터링 (체인 필터링 후)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => selectedCategories.includes(p.high_level_category))
    }

    // 3단계: 상세 카테고리(토픽) 필터링 (카테고리 필터링 후)
    if (selectedTopics.length > 0) {
      filtered = filtered.filter(p => selectedTopics.includes(p.topic_subject))
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp)
  },

  getFilteredValidators: () => {
    const { validatorData, selectedChain, searchTerm } = get()
    let filtered = validatorData.validators

    console.log('getFilteredValidators: Total validators:', filtered.length)
    console.log('getFilteredValidators: Selected chain:', selectedChain)
    console.log('getFilteredValidators: Search term:', searchTerm)

    if (selectedChain !== 'all') {
      const beforeFilter = filtered.length
      filtered = filtered.filter(v => v.chain === selectedChain)
      console.log(`getFilteredValidators: Chain filter - before: ${beforeFilter}, after: ${filtered.length}`)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const beforeFilter = filtered.length
      filtered = filtered.filter(v => 
        v.voter_name?.toLowerCase().includes(term)
      )
      console.log(`getFilteredValidators: Search filter - before: ${beforeFilter}, after: ${filtered.length}`)
    }

    console.log('getFilteredValidators: Final filtered count:', filtered.length)
    if (filtered.length > 0) {
      console.log('getFilteredValidators: Sample validators:', filtered.slice(0, 3).map(v => ({
        name: v.voter_name,
        chain: v.chain,
        votingPower: v.votingPower
      })))
    }

    return filtered
  },

  getChains: () => {
    const { rawProposals } = get()
    return ['all', ...Array.from(new Set(rawProposals.map(p => p.chain)))]
  },

  getCategories: () => {
    const { proposalData } = get()
    return proposalData ? proposalData.categories.map(c => c.name) : []
  },

  // 선택된 체인에 따른 필터링된 카테고리 계층 구조
  getFilteredCategoryHierarchy: () => {
    const { rawProposals, selectedChain } = get()
    
    // 체인 필터링
    let filteredProposals = rawProposals
    if (selectedChain !== 'all') {
      filteredProposals = filteredProposals.filter(p => p.chain === selectedChain)
    }

    // 카테고리별 통계 계산
    const categoryStats = filteredProposals.reduce((acc, proposal) => {
      const category = proposal.high_level_category || 'Unknown'
      if (!acc[category]) {
        acc[category] = { total: 0, passed: 0 }
      }
      acc[category].total++
      if (proposal.passed) {
        acc[category].passed++
      }
      return acc
    }, {} as Record<string, { total: number; passed: number }>)

    // 카테고리 계층 구조 생성
    const categoryHierarchy = Object.entries(categoryStats).map(([categoryName, categoryStats]) => {
      // 해당 카테고리의 모든 토픽 수집
      const topicStats = filteredProposals
        .filter(p => p.high_level_category === categoryName)
        .reduce((acc, proposal) => {
          const topic = proposal.topic_subject || 'Unknown'
          if (!acc[topic]) {
            acc[topic] = { total: 0, passed: 0 }
          }
          acc[topic].total++
          if (proposal.passed) {
            acc[topic].passed++
          }
          return acc
        }, {} as Record<string, { total: number; passed: number }>)

      const topics = Object.entries(topicStats)
        .map(([name, stats]) => ({
          name,
          count: stats.total,
          passRate: (stats.passed / stats.total) * 100
        }))
        .sort((a, b) => b.count - a.count)

      return {
        name: categoryName,
        count: categoryStats.total,
        passRate: (categoryStats.passed / categoryStats.total) * 100,
        topics
      }
    }).sort((a, b) => b.count - a.count)

    return categoryHierarchy
  },

  // 동적 검증인 통계 계산 (참여율/영향력은 필터 기준, 투표력 트렌드는 체인 전체 기준)
  calculateValidatorStats: (validatorId: string) => {
    const { rawVotes, getFilteredProposals, rawValidators, rawProposals, selectedChain } = get()
    
    // 현재 필터에 맞는 프로포절들 (참여율/영향력 계산용)
    const filteredProposals = getFilteredProposals()
    const filteredProposalIds = new Set(filteredProposals.map(p => p.proposal_id))
    
    // 체인 전체 프로포절들 (투표력 트렌드용)
    const chainProposals = selectedChain === 'all' ? rawProposals : 
      rawProposals.filter(p => p.chain === selectedChain)
    const chainProposalIds = new Set(chainProposals.map(p => p.proposal_id))
    
    // 검증인 정보 가져오기
    const validator = rawValidators.find(v => v.validator_id === validatorId)
    if (!validator) return null
    
    // 필터된 프로포절에 대한 검증인 투표 (참여율/영향력 계산용)
    const filteredValidatorVotes = rawVotes.filter(v => 
      v.validator_id === validatorId && filteredProposalIds.has(v.proposal_id)
    )
    
    // 체인 전체에 대한 검증인 투표 (투표력 트렌드용)
    const allChainValidatorVotes = rawVotes.filter(v => 
      v.validator_id === validatorId && chainProposalIds.has(v.proposal_id)
    )
    
    // 투표 권한이 있었던 프로포절들 (필터 기준)
    const proposalsWithValidatorVotes = new Set(filteredValidatorVotes.map(v => v.proposal_id))
    
    const eligibleProposals = filteredProposals.filter(p => 
      proposalsWithValidatorVotes.has(p.proposal_id)
    )
    
    if (eligibleProposals.length === 0 && allChainValidatorVotes.length === 0) {
      return null
    }
    
    // 실제 투표한 기록들 (NO_VOTE 제외) - 필터 기준, 프로포절별로 중복 제거
    const actualVotes = filteredValidatorVotes.filter(v => v.vote_option !== 'NO_VOTE')
    const uniqueProposalVotes = new Set(actualVotes.map(v => v.proposal_id))
    
    // 기본 통계 (필터 기준) - 프로포절 단위로 계산
    const totalVotes = uniqueProposalVotes.size
    const timestamps = actualVotes.map(v => v.timestamp).sort((a, b) => a - b)
    const firstTimestamp = timestamps.length > 0 ? timestamps[0] : undefined
    const lastTimestamp = timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined
    
    const firstVoteDate = firstTimestamp ? new Date(firstTimestamp).toLocaleDateString('en-US') : undefined
    const lastVoteDate = lastTimestamp ? new Date(lastTimestamp).toLocaleDateString('en-US') : undefined
    const activePeriodDays = firstTimestamp && lastTimestamp ? 
      Math.ceil((lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24)) : undefined
    
    // 영향력 계산 (필터 기준)
    const proposalResults = filteredProposals.reduce((acc, proposal) => {
      acc[proposal.proposal_id] = proposal.passed
      return acc
    }, {} as Record<string, boolean>)
    
    let influenceMatches = 0
    actualVotes.forEach(vote => {
      const proposalPassed = proposalResults[vote.proposal_id]
      if (proposalPassed !== undefined) {
        const validatorIntention = vote.vote_option === 'YES' ? true : 
                                 vote.vote_option === 'NO' || vote.vote_option === 'NO_WITH_VETO' ? false : 
                                 null // ABSTAIN은 중립
        
        if (validatorIntention !== null && validatorIntention === proposalPassed) {
          influenceMatches++
        }
      }
    })
    
    const influenceRate = totalVotes > 0 ? (influenceMatches / totalVotes) * 100 : 0
    
    // 참여율 계산 (필터 기준)
    const participationRate = eligibleProposals.length > 0 ? 
      (totalVotes / eligibleProposals.length) * 100 : 0
    
    // 디버깅 로그
    console.log(`Validator ${validatorId} participation calculation:`, {
      filteredProposals: filteredProposals.length,
      filteredValidatorVotes: filteredValidatorVotes.length,
      actualVotes: actualVotes.length,
      uniqueProposalVotes: uniqueProposalVotes.size,
      eligibleProposals: eligibleProposals.length,
      totalVotes,
      participationRate: participationRate.toFixed(1) + '%'
    })
    
    // 체인의 전체 시간축 정보
    const chainProposalTimestamps = chainProposals.map(p => p.timestamp).sort((a, b) => a - b)
    const chainFirstTimestamp = chainProposalTimestamps[0]
    const chainLastTimestamp = chainProposalTimestamps[chainProposalTimestamps.length - 1]
    
    // 투표력 변화 추이 (체인 전체 기준, 필터와 무관)
    const allChainActualVotes = allChainValidatorVotes.filter(v => v.vote_option !== 'NO_VOTE')
    const votingPowerTrend = allChainActualVotes
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(vote => ({
        timestamp: vote.timestamp,
        power: vote.voting_power,
        proposal_id: vote.proposal_id,
        // 체인 전체 시간축에서의 상대적 위치 (0-1)
        relativePosition: chainLastTimestamp > chainFirstTimestamp ? 
          (vote.timestamp - chainFirstTimestamp) / (chainLastTimestamp - chainFirstTimestamp) : 0
      }))
    
    // 필터된 프로포절들의 시간축 위치 (강조선 표시용)
    const filteredProposalMarkers = filteredProposals.map(proposal => ({
      timestamp: proposal.timestamp,
      proposal_id: proposal.proposal_id,
      relativePosition: chainLastTimestamp > chainFirstTimestamp ? 
        (proposal.timestamp - chainFirstTimestamp) / (chainLastTimestamp - chainFirstTimestamp) : 0,
      category: proposal.high_level_category,
      topic: proposal.topic_subject,
      passed: proposal.passed
    }))
    
    return {
      totalVotes,
      firstVoteDate,
      lastVoteDate,
      activePeriodDays,
      influenceRate,
      participationRate,
      votingPowerTrend,
      filteredProposalMarkers, // 필터된 프로포절 마커
      // 추가 정보
      eligibleProposalsCount: eligibleProposals.length,
      chainTimespan: {
        firstTimestamp: chainFirstTimestamp,
        lastTimestamp: chainLastTimestamp,
        firstDate: new Date(chainFirstTimestamp).toLocaleDateString('en-US'),
        lastDate: new Date(chainLastTimestamp).toLocaleDateString('en-US')
      }
    }
  }
})) 