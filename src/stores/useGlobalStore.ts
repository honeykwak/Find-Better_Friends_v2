import { create } from 'zustand'
import { loadChainData, type Proposal, type Vote, type Validator } from '@/lib/dataLoader'

export type { Validator };

// 카테고리 계층 구조 타입 (FilterPanel에서 사용)
export interface CategoryHierarchyNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
  // votingPowerDistribution is removed as it cannot be calculated dynamically
  topics: TopicNode[]
}

export interface TopicNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
}

export type ValidatorSortKey = 'voteCount' | 'name' | 'votingPower' | 'similarity';

// 전역 상태 인터페이스
interface GlobalStore {
  proposals: Proposal[]
  validators: Validator[]
  votes: Vote[]
  
  selectedChain: string
  selectedCategories: string[]
  selectedTopics: string[]
  searchTerm: string
  approvalRateRange: [number, number]
  validatorSortKey: ValidatorSortKey;
  
  categoryVisualizationMode: 'passRate' | 'voteCount'
  
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
  setApprovalRateRange: (range: [number, number]) => void
  setCategoryVisualizationMode: (mode: 'passRate' | 'voteCount') => void
  setWindowSize: (size: { width: number; height: number }) => void
  setValidatorSortKey: (key: ValidatorSortKey) => void;
  
  // Selectors
  getProposalsFilteredByRate: () => Proposal[]
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
  selectedChain: 'cosmos',
  selectedCategories: [],
  selectedTopics: [],
  searchTerm: '',
  approvalRateRange: [0, 100],
  categoryVisualizationMode: 'passRate',
  validatorSortKey: 'voteCount',
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },

  // Actions
  loadData: async (chainName: string) => {
    try {
      set({ loading: true, error: null });
      // dataLoader will be modified to not return categorySummary
      const { proposals, validators, votes } = await loadChainData(chainName);
      
      set({
        proposals,
        validators,
        votes,
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
      approvalRateRange: [0, 100],
      validatorSortKey: 'voteCount',
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
  setApprovalRateRange: (range: [number, number]) => set({ approvalRateRange: range }),
  setCategoryVisualizationMode: (mode) => set({ categoryVisualizationMode: mode }),
  setWindowSize: (size) => set({ windowSize: size }),
  setValidatorSortKey: (key: ValidatorSortKey) => set({ validatorSortKey: key }),

  // Selectors
  getProposalsFilteredByRate: () => {
    const { proposals, approvalRateRange } = get();
    const [minRate, maxRate] = approvalRateRange;

    return proposals.filter(p => {
      const {
        yes_count = 0,
        no_count = 0,
        abstain_count = 0,
        no_with_veto_count = 0,
      } = p.final_tally_result || {};
      
      const totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
      
      if (totalVotes === 0) {
        return minRate === 0;
      }
      
      const approvalRate = (yes_count / totalVotes) * 100;
      
      return approvalRate >= minRate && approvalRate <= maxRate;
    });
  },

  getFilteredProposals: () => {
    const { getProposalsFilteredByRate, selectedTopics } = get();
    const proposalsFilteredByRate = getProposalsFilteredByRate();

    if (selectedTopics.length === 0) {
      return proposalsFilteredByRate;
    }
    return proposalsFilteredByRate.filter(p => selectedTopics.includes(p.topic));
  },

  getFilteredValidators: () => {
    const { validators } = get()
    return validators
  },

  getChains: () => [
    'akash', 'axelar', 'cosmos', 'dydx', 'evmos', 'finschia', 
    'gravity-bridge', 'injective', 'iris', 'juno', 'kava', 'kyve', 
    'osmosis', 'secret', 'sentinel', 'stargaze', 'terra'
  ],

  getFilteredCategoryHierarchy: () => {
    const { getProposalsFilteredByRate } = get();
    const proposalsFilteredByRate = getProposalsFilteredByRate();

    const categoryStats: { [name: string]: {
        count: number;
        passed: number;
        voteDistribution: { [key: string]: number };
        topics: { [name: string]: {
            count: number;
            passed: number;
            voteDistribution: { [key: string]: number };
        } };
    } } = {};

    for (const p of proposalsFilteredByRate) {
        const categoryName = p.type;
        const topicName = p.topic;

        if (!categoryStats[categoryName]) {
            categoryStats[categoryName] = { count: 0, passed: 0, voteDistribution: {}, topics: {} };
        }
        if (!categoryStats[categoryName].topics[topicName]) {
            categoryStats[categoryName].topics[topicName] = { count: 0, passed: 0, voteDistribution: {} };
        }

        categoryStats[categoryName].count++;
        categoryStats[categoryName].topics[topicName].count++;
        if (p.status === 'PASSED') {
            categoryStats[categoryName].passed++;
            categoryStats[categoryName].topics[topicName].passed++;
        }

        const tally = p.final_tally_result || {};
        for (const voteOption in tally) {
            const key = voteOption.replace('_count', '').toUpperCase();
            const voteCount = tally[voteOption as keyof typeof tally] || 0;
            
            categoryStats[categoryName].voteDistribution[key] = (categoryStats[categoryName].voteDistribution[key] || 0) + voteCount;
            categoryStats[categoryName].topics[topicName].voteDistribution[key] = (categoryStats[categoryName].topics[topicName].voteDistribution[key] || 0) + voteCount;
        }
    }

    const hierarchy: CategoryHierarchyNode[] = Object.entries(categoryStats).map(([name, data]) => {
        const topicsForCategory: TopicNode[] = Object.entries(data.topics).map(([topicName, topicData]) => ({
            name: topicName,
            count: topicData.count,
            passRate: topicData.count > 0 ? (topicData.passed / topicData.count) * 100 : 0,
            voteDistribution: topicData.voteDistribution,
        }));

        return {
            name,
            count: data.count,
            passRate: data.count > 0 ? (data.passed / data.count) * 100 : 0,
            voteDistribution: data.voteDistribution,
            topics: topicsForCategory.sort((a, b) => b.count - a.count),
        };
    }).sort((a, b) => b.count - a.count);

    return hierarchy;
  },
}));
