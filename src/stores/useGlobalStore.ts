import { create } from 'zustand'
import { loadChainData, type Proposal, type Vote, type Validator, type CategorySummary } from '@/lib/dataLoader'

// 카테고리 계층 구조 타입 (FilterPanel에서 사용)
export interface CategoryHierarchyNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
  votingPowerDistribution: Record<string, number>
  topics: TopicNode[]
}

export interface TopicNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
  votingPowerDistribution: Record<string, number>
}

// 전역 상태 인터페이스
interface GlobalStore {
  proposals: Proposal[]
  validators: Validator[]
  votes: Vote[]
  categorySummary: CategorySummary | null
  
  selectedChain: string
  selectedCategories: string[]
  selectedTopics: string[]
  searchTerm: string
  approvalRateRange: [number, number] // 찬성 비율 범위 상태 추가
  
  categoryVisualizationMode: 'passRate' | 'voteCount' | 'votingPower'
  
  loading: boolean
  error: string | null
  windowSize: { width: number; height: number }
  
  // Actions
  loadData: (chainName: string) => Promise<void>
  setSelectedChain: (chain: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedTopics: (topics: string[]) => void
  toggleCategory: (category: string) => void
  toggleTopic: (topic: string) => void
  setSearchTerm: (term: string) => void
  setApprovalRateRange: (range: [number, number]) => void // 액션 추가
  setCategoryVisualizationMode: (mode: 'passRate' | 'voteCount' | 'votingPower') => void
  setWindowSize: (size: { width: number; height: number }) => void
  
  // Selectors
  getFilteredProposals: () => Proposal[]
  getFilteredValidators: () => Validator[]
  getChains: () => string[]
  getFilteredCategoryHierarchy: () => CategoryHierarchyNode[]
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  // Initial State
  proposals: [],
  validators: [],
  votes: [],
  categorySummary: null,
  selectedChain: 'cosmos',
  selectedCategories: [],
  selectedTopics: [],
  searchTerm: '',
  approvalRateRange: [0, 100], // 초기값 설정
  categoryVisualizationMode: 'passRate',
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },

  // Actions
  loadData: async (chainName: string) => {
    try {
      set({ loading: true, error: null });
      const { proposals, validators, votes, categorySummary } = await loadChainData(chainName);
      
      set({
        proposals,
        validators,
        votes,
        categorySummary,
        loading: false,
      });
    } catch (err: any) {
      set({ error: `Failed to load data: ${err?.message || 'Unknown error'}`, loading: false });
    }
  },

  setSelectedChain: (chain: string) => {
    if (get().selectedChain === chain) return
    
    set({ 
      selectedChain: chain, 
      selectedCategories: [], 
      selectedTopics: [],
      approvalRateRange: [0, 100] // 체인 변경 시 필터 초기화
    })
    get().loadData(chain).catch(console.error)
  },

  setSelectedCategories: (categories: string[]) => set({ selectedCategories: categories }),
  setSelectedTopics: (topics: string[]) => set({ selectedTopics: topics }),
  toggleCategory: (category: string) => {
    const { selectedCategories, getFilteredCategoryHierarchy } = get();
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    // When a category is selected, ensure all its topics are also selected for filter logic
    const categoryNode = getFilteredCategoryHierarchy().find(c => c.name === category);
    if (categoryNode && !selectedCategories.includes(category)) {
      const topicNames = categoryNode.topics.map(t => t.name);
      const newTopics = [...new Set([...get().selectedTopics, ...topicNames])];
      set({ selectedTopics: newTopics });
    }

    set({ selectedCategories: newCategories });
  },
  toggleTopic: (topic: string) => {
    const { selectedTopics } = get()
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter(t => t !== topic)
      : [...selectedTopics, topic]
    set({ selectedTopics: newTopics })
  },
  setSearchTerm: (term: string) => set({ searchTerm: term }),
  setApprovalRateRange: (range: [number, number]) => set({ approvalRateRange: range }), // 액션 구현
  setCategoryVisualizationMode: (mode) => set({ categoryVisualizationMode: mode }),
  setWindowSize: (size) => set({ windowSize: size }),

  // Selectors
  getFilteredProposals: () => {
    const { proposals, selectedTopics, approvalRateRange } = get();
    
    const [minRate, maxRate] = approvalRateRange;

    const filteredByTopic = selectedTopics.length === 0
      ? proposals
      : proposals.filter(p => selectedTopics.includes(p.topic));

    return filteredByTopic.filter(p => {
      const {
        yes_count = 0,
        no_count = 0,
        abstain_count = 0,
        no_with_veto_count = 0,
      } = p.final_tally_result || {};
      
      const totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
      
      if (totalVotes === 0) {
        // Handle proposals with no votes. Include them if the range is 0-100, or based on specific requirements.
        // Here, we'll include them if minRate is 0.
        return minRate === 0;
      }
      
      const approvalRate = (yes_count / totalVotes) * 100;
      
      return approvalRate >= minRate && approvalRate <= maxRate;
    });
  },

  getFilteredValidators: () => {
    const { validators, searchTerm } = get()
    if (!searchTerm) return validators

    const term = searchTerm.toLowerCase()
    return validators.filter(v => v.moniker?.toLowerCase().includes(term))
  },

  getChains: () => [
    'akash', 'axelar', 'cosmos', 'dydx', 'evmos', 'finschia', 
    'gravity-bridge', 'injective', 'iris', 'juno', 'kava', 'kyve', 
    'osmosis', 'secret', 'sentinel', 'stargaze', 'terra'
  ],

  getFilteredCategoryHierarchy: () => {
    const summary = get().categorySummary;
    if (!summary) return [];

    const hierarchy: CategoryHierarchyNode[] = Object.entries(summary.categories).map(([name, data]) => {
      const topicsForCategory = Object.entries(summary.topics)
        .filter(([, topicData]) => topicData.category === name)
        .map(([topicName, topicData]) => ({
          name: topicName,
          count: topicData.count,
          passRate: topicData.passRate,
          voteDistribution: topicData.voteDistribution,
          votingPowerDistribution: topicData.votingPowerDistribution,
        }))
        .sort((a, b) => b.count - a.count);
      
      return {
        name,
        count: data.count,
        passRate: data.passRate,
        voteDistribution: data.voteDistribution,
        votingPowerDistribution: data.votingPowerDistribution,
        topics: topicsForCategory,
      };
    }).sort((a, b) => b.count - a.count);

    return hierarchy;
  },
}));
