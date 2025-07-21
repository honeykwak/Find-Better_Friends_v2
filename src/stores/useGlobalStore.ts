import { create } from 'zustand'
import { loadChainData, type Proposal, type Vote, type Validator } from '@/lib/dataLoader'

export type { Validator };

// Validator type with added optional properties for derived data
export interface ValidatorWithDerivedData extends Validator {
  avgPower?: number;
  participationRate?: number;
}

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

export type ValidatorSortKey = 'voteCount' | 'name' | 'votingPower' | 'similarity_common' | 'similarity_base';

// 전역 상태 인터페이스
interface GlobalStore {
  proposals: Proposal[]
  validators: Validator[] // Raw validator data
  validatorsWithDerivedData: ValidatorWithDerivedData[] // Validators with calculated metrics
  votes: Vote[]
  
  selectedChain: string
  selectedCategories: string[]
  selectedTopics: string[]
  searchTerm: string
  approvalRateRange: [number, number]
  participationRateRange: [number, number]
  votingPowerFilterMode: 'ratio' | 'rank'
  votingPowerRange: [number, number]
  votingPowerDynamicRange: [number, number]
  validatorSortKey: ValidatorSortKey;
  countNoVoteAsParticipation: boolean;
  
  categoryVisualizationMode: 'voteCount' | 'votePower'
  
  loading: boolean
  error: string | null
  windowSize: { width: number; height: number }
  
  // Actions
  loadData: (chainName: string) => Promise<void>
  recalculateValidatorMetrics: () => void;
  setSelectedChain: (chain: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedTopics: (topics: string[]) => void
  toggleCategory: (category: string) => void
  toggleTopic: (topic: string) => void
  setSearchTerm: (term: string) => void
  setApprovalRateRange: (range: [number, number]) => void
  setVotingPowerFilterMode: (mode: 'ratio' | 'rank') => void
  setVotingPowerRange: (range: [number, number]) => void
  setVotingPowerDynamicRange: (range: [number, number]) => void
  setCategoryVisualizationMode: (mode: 'voteCount' | 'votePower') => void
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
  validatorsWithDerivedData: [],
  votes: [],
  selectedChain: 'cosmos',
  selectedCategories: [],
  selectedTopics: [],
  searchTerm: '',
  approvalRateRange: [0, 100],
  participationRateRange: [0, 100],
  votingPowerFilterMode: 'ratio',
  votingPowerRange: [0, 100],
  votingPowerDynamicRange: [0, 100],
  categoryVisualizationMode: 'voteCount',
  validatorSortKey: 'votingPower',
  countNoVoteAsParticipation: true,
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },

  // Actions
  loadData: async (chainName: string) => {
    try {
      set({ loading: true, error: null });
      const { proposals, validators, votes } = await loadChainData(chainName);
      
      set({
        proposals,
        validators,
        votes,
        loading: false,
      });
      get().recalculateValidatorMetrics(); // Calculate metrics after data is loaded
    } catch (err: any) {
      set({ error: `Failed to load data: ${err?.message || 'Unknown error'}`, loading: false });
    }
  },

  recalculateValidatorMetrics: () => {
    const { proposals, validators, votes, getFilteredProposals, countNoVoteAsParticipation } = get();
    if (!proposals.length || !validators.length) {
      set({ validatorsWithDerivedData: [] });
      return;
    }

    const filteredProposals = getFilteredProposals();
    const proposalSet = new Set(filteredProposals.map(p => p.proposal_id));
    const validatorPowerSum = new Map<string, number>();
    const validatorVoteCount = new Map<string, number>();

    for (const vote of votes) {
      if (proposalSet.has(vote.proposal_id)) {
        if (!countNoVoteAsParticipation && vote.vote_option === 'NO_VOTE') {
          continue;
        }
        const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
        if (power && !isNaN(power)) {
          const address = vote.validator_address;
          validatorVoteCount.set(address, (validatorVoteCount.get(address) || 0) + 1);
          validatorPowerSum.set(address, (validatorPowerSum.get(address) || 0) + power);
        }
      }
    }

    const getAveragePower = (address: string) => {
      const sum = validatorPowerSum.get(address) || 0;
      const count = validatorVoteCount.get(address) || 0;
      return count > 0 ? sum / count : 0;
    };

    const validatorParticipationCount = new Map<string, number>();
    let totalProposalsForParticipation = 0;

    for (const proposal of filteredProposals) {
      if (!countNoVoteAsParticipation) {
        const proposalVotes = votes.filter(v => v.proposal_id === proposal.proposal_id);
        const hasMeaningfulVoteOption = proposalVotes.some(v => v.vote_option !== 'NO_VOTE');
        if (!hasMeaningfulVoteOption) {
          continue;
        }
      }
      totalProposalsForParticipation++;
    }

    for (const vote of votes) {
      if (proposalSet.has(vote.proposal_id)) {
        if (!countNoVoteAsParticipation && vote.vote_option === 'NO_VOTE') {
          continue;
        }
        validatorParticipationCount.set(vote.validator_address, (validatorParticipationCount.get(vote.validator_address) || 0) + 1);
      }
    }

    const getParticipationRate = (address: string) => {
      const count = validatorParticipationCount.get(address) || 0;
      return totalProposalsForParticipation > 0 ? (count / totalProposalsForParticipation) * 100 : 0;
    };

    const newValidatorsWithDerivedData = validators.map(v => ({
      ...v,
      avgPower: getAveragePower(v.validator_address),
      participationRate: getParticipationRate(v.validator_address)
    }));

    set({ validatorsWithDerivedData: newValidatorsWithDerivedData });
  },

  setSelectedChain: (chain: string) => {
    if (get().selectedChain === chain) return
    
    set({ 
      selectedChain: chain, 
      selectedCategories: [], 
      selectedTopics: [],
      searchTerm: '', // Reset search term on chain change
      approvalRateRange: [0, 100],
      participationRateRange: [0, 100], // Reset participation rate filter
      votingPowerFilterMode: 'ratio',
      votingPowerRange: [0, 100],
      votingPowerDynamicRange: [0, 100],
      validatorSortKey: 'votingPower', // Set to new default on chain change
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
  setSearchTerm: (term: string) => {
    if (term) {
      set({ searchTerm: term, validatorSortKey: 'similarity_common' });
    } else {
      set({ searchTerm: term, validatorSortKey: 'votingPower' }); // Revert to new default
    }
  },
  setApprovalRateRange: (range: [number, number]) => {
    set({ approvalRateRange: range });
    get().recalculateValidatorMetrics();
  },
  setParticipationRateRange: (range: [number, number]) => set({ participationRateRange: range }),
  setVotingPowerFilterMode: (mode) => set({ votingPowerFilterMode: mode }),
  setVotingPowerRange: (range) => set({ votingPowerRange: range }),
  setVotingPowerDynamicRange: (range) => {
    // To prevent infinite loops, only update if the range has actually changed.
    const currentRange = get().votingPowerDynamicRange;
    if (currentRange[0] !== range[0] || currentRange[1] !== range[1]) {
      set({ votingPowerDynamicRange: range });
    }
  },
  setCategoryVisualizationMode: (mode) => set({ categoryVisualizationMode: mode }),
  setWindowSize: (size) => set({ windowSize: size }),
  setValidatorSortKey: (key: ValidatorSortKey) => set({ validatorSortKey: key }),
  setCountNoVoteAsParticipation: (count: boolean) => {
    set({ countNoVoteAsParticipation: count });
    get().recalculateValidatorMetrics();
  },

  // Selectors
  getProposalsFilteredByRate: () => {
    const { proposals, approvalRateRange } = get();
    const [minRate, maxRate] = approvalRateRange;

    const filtered = proposals.filter(p => {
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
    return filtered;
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
    const { getProposalsFilteredByRate, votes, categoryVisualizationMode } = get();
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

    const votesByProposalId = new Map<string, Vote[]>();
    if (categoryVisualizationMode === 'votePower') {
        for (const vote of votes) {
            if (!votesByProposalId.has(vote.proposal_id)) {
                votesByProposalId.set(vote.proposal_id, []);
            }
            votesByProposalId.get(vote.proposal_id)!.push(vote);
        }
    }

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

        if (categoryVisualizationMode === 'votePower') {
            const proposalVotes = votesByProposalId.get(p.proposal_id) || [];
            for (const vote of proposalVotes) {
                let key = vote.vote_option.toUpperCase();
                if (key.includes('YES')) key = 'YES';
                else if (key.includes('NO_WITH_VETO')) key = 'NO_WITH_VETO';
                else if (key.includes('NO_VOTE')) key = 'NO_VOTE';
                else if (key.includes('NO')) key = 'NO';
                else if (key.includes('ABSTAIN')) key = 'ABSTAIN';
                else continue;

                const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
                if (!isNaN(power)) {
                    categoryStats[categoryName].voteDistribution[key] = (categoryStats[categoryName].voteDistribution[key] || 0) + power;
                    categoryStats[categoryName].topics[topicName].voteDistribution[key] = (categoryStats[categoryName].topics[topicName].voteDistribution[key] || 0) + power;
                }
            }
        } else { // 'voteCount' mode
            const tally = p.final_tally_result || {};
            for (const voteOption in tally) {
                const key = voteOption.replace('_count', '').toUpperCase();
                const voteCount = tally[voteOption as keyof typeof tally] || 0;
                
                categoryStats[categoryName].voteDistribution[key] = (categoryStats[categoryName].voteDistribution[key] || 0) + voteCount;
                categoryStats[categoryName].topics[topicName].voteDistribution[key] = (categoryStats[categoryName].topics[topicName].voteDistribution[key] || 0) + voteCount;
            }
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

// Standalone selectors for data distribution
export const getYesRateDistribution = (state: GlobalStore) => {
  return state.proposals.map(p => {
    const {
      yes_count = 0,
      no_count = 0,
      abstain_count = 0,
      no_with_veto_count = 0,
    } = p.final_tally_result || {};
    const totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
    return totalVotes === 0 ? 0 : (yes_count / totalVotes) * 100;
  });
};

export const getVotingPowerDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => (v.avgPower || 0) * 100);
};

export const getParticipationRateDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.participationRate || 0);
};
