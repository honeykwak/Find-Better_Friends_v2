import { create } from 'zustand'
import { loadChainData, type Proposal, type Vote, type Validator } from '@/lib/dataLoader'

export type { Validator };

// Validator type with added optional properties for derived data
export interface ValidatorWithDerivedData extends Validator {
  avgPower?: number;
  totalPower?: number;
  participationRate?: number;
}

// 카테고리 계층 구조 타입 (FilterPanel에서 사용)
export interface CategoryHierarchyNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
  topics: TopicNode[]
}

export interface TopicNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
}

export type ValidatorSortKey = 'voteCount' | 'name' | 'votingPower' | 'totalVotingPower' | 'similarity_common' | 'similarity_base' | 'similarity_comprehensive';

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
  
  // Validator filters
  participationRateRange: [number, number]
  participationRateDynamicRange: [number, number]
  votingPowerMetric: 'avg' | 'total'
  votingPowerDisplayMode: 'ratio' | 'rank'
  votingPowerRange: [number, number]
  avgVotingPowerDynamicRange: [number, number]
  totalVotingPowerDynamicRange: [number, number]
  excludeAbstainNoVote: boolean // <--- This is the new state

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
  setParticipationRateRange: (range: [number, number]) => void
  setVotingPowerMetric: (metric: 'avg' | 'total') => void
  setVotingPowerDisplayMode: (mode: 'ratio' | 'rank') => void
  setVotingPowerRange: (range: [number, number]) => void
  setCategoryVisualizationMode: (mode: 'voteCount' | 'votePower') => void
  setWindowSize: (size: { width: number; height: number }) => void
  setValidatorSortKey: (key: ValidatorSortKey) => void;
  setCountNoVoteAsParticipation: (count: boolean) => void;
  setExcludeAbstainNoVote: (exclude: boolean) => void; // <--- This is the new action
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
  participationRateDynamicRange: [0, 100],
  votingPowerMetric: 'total',
  votingPowerDisplayMode: 'ratio',
  votingPowerRange: [0, 100],
  avgVotingPowerDynamicRange: [0, 100],
  totalVotingPowerDynamicRange: [0, 100],
  excludeAbstainNoVote: false, // <--- Initial value for the new state
  categoryVisualizationMode: 'votePower',
  validatorSortKey: 'totalVotingPower',
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
        // Reset filters on new chain load
        selectedCategories: [],
        selectedTopics: [],
        searchTerm: '',
        approvalRateRange: [0, 100],
        participationRateRange: [0, 100],
        votingPowerMetric: 'total',
        votingPowerDisplayMode: 'ratio',
        validatorSortKey: 'totalVotingPower',
      });
      get().recalculateValidatorMetrics();
    } catch (err: any) {
      set({ error: `Failed to load data: ${err?.message || 'Unknown error'}`, loading: false });
    }
  },

  recalculateValidatorMetrics: () => {
    const { proposals, validators, votes, getFilteredProposals, countNoVoteAsParticipation } = get();
    if (!proposals.length || !validators.length) {
      set({ 
        validatorsWithDerivedData: [], 
        participationRateDynamicRange: [0, 100], 
        avgVotingPowerDynamicRange: [0, 100],
        totalVotingPowerDynamicRange: [0, 100],
      });
      return;
    }

    const filteredProposals = getFilteredProposals();
    const relevantProposalIds = new Set(filteredProposals.map(p => p.proposal_id));
    
    const validatorPowerSum = new Map<string, number>();
    const validatorVoteCount = new Map<string, number>();

    for (const vote of votes) {
      if (relevantProposalIds.has(vote.proposal_id)) {
        const address = vote.validator_address;
        const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
        if (power && !isNaN(power)) {
          validatorVoteCount.set(address, (validatorVoteCount.get(address) || 0) + 1);
          validatorPowerSum.set(address, (validatorPowerSum.get(address) || 0) + power);
        }
      }
    }

    const newValidatorsWithDerivedData = validators.map(v => {
      const sum = validatorPowerSum.get(v.validator_address) || 0;
      const count = validatorVoteCount.get(v.validator_address) || 0;
      const participationCount = new Set(votes.filter(vote => vote.validator_address === v.validator_address && relevantProposalIds.has(vote.proposal_id)).map(vote => vote.proposal_id)).size;
      
      return {
        ...v,
        avgPower: count > 0 ? sum / count : 0,
        totalPower: sum,
        participationRate: filteredProposals.length > 0 ? (participationCount / filteredProposals.length) * 100 : 0,
      }
    });

    let minRate = 100, maxRate = 0;
    let minAvgPower = Infinity, maxAvgPower = -Infinity;
    let minTotalPower = Infinity, maxTotalPower = -Infinity;

    newValidatorsWithDerivedData.forEach(v => {
      minRate = Math.min(minRate, v.participationRate || 100);
      maxRate = Math.max(maxRate, v.participationRate || 0);
      minAvgPower = Math.min(minAvgPower, v.avgPower || Infinity);
      maxAvgPower = Math.max(maxAvgPower, v.avgPower || -Infinity);
      minTotalPower = Math.min(minTotalPower, v.totalPower || Infinity);
      maxTotalPower = Math.max(maxTotalPower, v.totalPower || -Infinity);
    });

    const newAvgPowerDynamicRange: [number, number] = [minAvgPower === Infinity ? 0 : minAvgPower, maxAvgPower === -Infinity ? 0 : maxAvgPower];
    const newTotalPowerDynamicRange: [number, number] = [minTotalPower === Infinity ? 0 : minTotalPower, maxTotalPower === -Infinity ? 0 : maxTotalPower];
    
    const { votingPowerMetric, votingPowerDisplayMode } = get();
    let newVotingPowerRange: [number, number];

    if (votingPowerDisplayMode === 'rank') {
      newVotingPowerRange = [1, newValidatorsWithDerivedData.length];
    } else { // ratio
      if (votingPowerMetric === 'avg') {
        newVotingPowerRange = newAvgPowerDynamicRange;
      } else { // total
        newVotingPowerRange = newTotalPowerDynamicRange;
      }
    }

    set({ 
      validatorsWithDerivedData: newValidatorsWithDerivedData,
      participationRateDynamicRange: [Math.floor(minRate), Math.ceil(maxRate)],
      avgVotingPowerDynamicRange: newAvgPowerDynamicRange,
      totalVotingPowerDynamicRange: newTotalPowerDynamicRange,
      votingPowerRange: newVotingPowerRange,
    });
  },

  setSelectedChain: (chain: string) => {
    if (get().selectedChain === chain) return
    
    set({ 
      selectedChain: chain, 
    })
    get().loadData(chain).catch(console.error)
  },

  setSelectedCategories: (categories: string[]) => {
    set({ selectedCategories: categories, selectedTopics: [] });
    get().recalculateValidatorMetrics();
  },
  setSelectedTopics: (topics: string[]) => {
    set({ selectedTopics: topics });
    get().recalculateValidatorMetrics();
  },
  toggleCategory: (category: string) => {
    const { selectedCategories, getFilteredCategoryHierarchy, selectedTopics } = get();
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    const categoryNode = getFilteredCategoryHierarchy().find(c => c.name === category);
    if (categoryNode && !selectedCategories.includes(category)) {
      const topicNames = categoryNode.topics.map(t => t.name);
      const newTopics = [...new Set([...selectedTopics, ...topicNames])];
      set({ selectedTopics: newTopics });
    } else if (!newCategories.includes(category)) {
        const topicNames = categoryNode?.topics.map(t => t.name) || [];
        const newTopics = selectedTopics.filter(t => !topicNames.includes(t));
        set({ selectedTopics: newTopics });
    }

    set({ selectedCategories: newCategories });
    get().recalculateValidatorMetrics();
  },
  toggleTopic: (topic: string) => {
    const { selectedTopics } = get()
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter(t => t !== topic)
      : [...selectedTopics, topic]
    set({ selectedTopics: newTopics })
    get().recalculateValidatorMetrics();
  },
  setSearchTerm: (term: string) => {
    if (term) {
      set({ searchTerm: term, validatorSortKey: 'similarity_comprehensive' });
    } else {
      set({ searchTerm: term, validatorSortKey: 'votingPower' });
    }
  },
  setApprovalRateRange: (range: [number, number]) => {
    set({ approvalRateRange: range });
    get().recalculateValidatorMetrics();
  },
  setParticipationRateRange: (range: [number, number]) => set({ participationRateRange: range }),
  setVotingPowerMetric: (metric) => {
    const { votingPowerMetric, avgVotingPowerDynamicRange, totalVotingPowerDynamicRange, validatorsWithDerivedData, votingPowerDisplayMode } = get();
    if (metric === votingPowerMetric) return;

    let newVotingPowerRange: [number, number];
    if (votingPowerDisplayMode === 'rank') {
      newVotingPowerRange = [1, validatorsWithDerivedData.length];
    } else {
      newVotingPowerRange = metric === 'avg' ? avgVotingPowerDynamicRange : totalVotingPowerDynamicRange;
    }
    set({ votingPowerMetric: metric, votingPowerRange: newVotingPowerRange });
  },
  setVotingPowerDisplayMode: (mode) => {
    const { validatorsWithDerivedData, votingPowerDisplayMode, votingPowerRange, votingPowerMetric, avgVotingPowerDynamicRange, totalVotingPowerDynamicRange } = get();
    if (mode === votingPowerDisplayMode) return;

    const rankedValidators = [...validatorsWithDerivedData].sort((a, b) => {
      const powerA = votingPowerMetric === 'avg' ? (a.avgPower || 0) : (a.totalPower || 0);
      const powerB = votingPowerMetric === 'avg' ? (b.avgPower || 0) : (b.totalPower || 0);
      return powerB - powerA;
    });
    const totalValidators = rankedValidators.length;
    if (totalValidators === 0) {
      set({ votingPowerDisplayMode: mode });
      return;
    }

    let newVotingPowerRange: [number, number];

    if (mode === 'rank') { // Convert from Ratio to Rank
      const [minPower, maxPower] = votingPowerRange;
      const findClosestRank = (power: number) => {
        let closestRank = 1;
        let minDiff = Infinity;
        rankedValidators.forEach((v, i) => {
          const currentPower = votingPowerMetric === 'avg' ? (v.avgPower || 0) : (v.totalPower || 0);
          const diff = Math.abs(currentPower - power);
          if (diff < minDiff) {
            minDiff = diff;
            closestRank = i + 1;
          }
        });
        return closestRank;
      };
      const startRank = findClosestRank(maxPower);
      const endRank = findClosestRank(minPower);
      newVotingPowerRange = [Math.min(startRank, endRank), Math.max(startRank, endRank)];
    } else { // Convert from Rank to Ratio
      const [minRank, maxRank] = votingPowerRange;
      const topValidator = rankedValidators[Math.max(0, Math.min(totalValidators - 1, minRank - 1))];
      const bottomValidator = rankedValidators[Math.max(0, Math.min(totalValidators - 1, maxRank - 1))];
      
      const minPower = votingPowerMetric === 'avg' ? (bottomValidator?.avgPower || 0) : (bottomValidator?.totalPower || 0);
      const maxPower = votingPowerMetric === 'avg' ? (topValidator?.avgPower || 0) : (topValidator?.totalPower || 0);
      newVotingPowerRange = [minPower, maxPower];
    }
    
    set({ 
      votingPowerDisplayMode: mode,
      votingPowerRange: newVotingPowerRange
    });
  },
  setVotingPowerRange: (range) => set({ votingPowerRange: range }),
  setCategoryVisualizationMode: (mode) => set({ categoryVisualizationMode: mode }),
  setWindowSize: (size) => set({ windowSize: size }),
  setValidatorSortKey: (key: ValidatorSortKey) => set({ validatorSortKey: key }),
  setCountNoVoteAsParticipation: (count: boolean) => {
    set({ countNoVoteAsParticipation: count });
    get().recalculateValidatorMetrics();
  },
  setExcludeAbstainNoVote: (exclude: boolean) => {
    set({ excludeAbstainNoVote: exclude });
    get().recalculateValidatorMetrics(); // Recalculate metrics when this changes
  },

  // Selectors
  getProposalsFilteredByRate: () => {
    const { proposals, approvalRateRange, votes, categoryVisualizationMode, excludeAbstainNoVote } = get();
    const [minRate, maxRate] = approvalRateRange;

    if (categoryVisualizationMode === 'votePower') {
      const votesByProposal = new Map<string, { yes: number; total: number }>();
      for (const vote of votes) {
        if (!votesByProposal.has(vote.proposal_id)) {
          votesByProposal.set(vote.proposal_id, { yes: 0, total: 0 });
        }
        const proposalVotes = votesByProposal.get(vote.proposal_id)!;
        const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
        
        if (!isNaN(power)) {
          if (vote.vote_option === 'YES') {
            proposalVotes.yes += power;
          }
          
          const isNonVoting = vote.vote_option === 'NO_VOTE' || vote.vote_option === 'ABSTAIN';
          if (!excludeAbstainNoVote || !isNonVoting) {
            proposalVotes.total += power;
          }
        }
      }

      return proposals.filter(p => {
        const powerVotes = votesByProposal.get(p.proposal_id);
        if (!powerVotes || powerVotes.total === 0) return minRate === 0;
        const approvalRate = (powerVotes.yes / powerVotes.total) * 100;
        return approvalRate >= minRate && approvalRate <= maxRate;
      });
    }

    // Default to 'voteCount'
    return proposals.filter(p => {
      const { yes_count = 0, no_count = 0, abstain_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
      
      let totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
      if (excludeAbstainNoVote) {
        totalVotes -= abstain_count;
        // 'NO_VOTE' is not part of final_tally_result, so no need to subtract
      }

      if (totalVotes === 0) return minRate === 0;
      const approvalRate = (yes_count / totalVotes) * 100;
      return approvalRate >= minRate && approvalRate <= maxRate;
    });
  },

  getFilteredProposals: () => {
    const { getProposalsFilteredByRate, selectedTopics, votes, categoryVisualizationMode } = get();
    const proposalsFilteredByRate = getProposalsFilteredByRate();

    const proposalsWithDistribution = proposalsFilteredByRate.map(p => {
      let voteDistribution: { [key: string]: number } = {};
      if (categoryVisualizationMode === 'votePower') {
        const proposalVotes = votes.filter(v => v.proposal_id === p.proposal_id);
        for (const vote of proposalVotes) {
          const upperVoteOption = vote.vote_option.toUpperCase();
          let key: string;
          if (upperVoteOption.includes('YES')) {
            key = 'YES';
          } else if (upperVoteOption.includes('NO_WITH_VETO')) {
            key = 'NO_WITH_VETO';
          } else if (upperVoteOption.includes('NO_VOTE')) {
            key = 'NO_VOTE';
          } else if (upperVoteOption.includes('NO')) {
            key = 'NO';
          } else if (upperVoteOption.includes('ABSTAIN')) {
            key = 'ABSTAIN';
          } else {
            continue; // Skip unknown vote options
          }
          
          const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
          if (!isNaN(power)) {
            voteDistribution[key] = (voteDistribution[key] || 0) + power;
          }
        }
      } else { // 'voteCount'
        const tally = p.final_tally_result || {};
        for (const voteOption in tally) {
          const key = voteOption.replace('_count', '').toUpperCase();
          voteDistribution[key] = tally[voteOption as keyof typeof tally] || 0;
        }
      }
      return { ...p, voteDistribution };
    });

    if (selectedTopics.length === 0) return proposalsWithDistribution;
    // Use the new unique topic field for filtering
    return proposalsWithDistribution.filter(p => selectedTopics.includes(p.topic_v2_unique));
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
        count: number; passed: number; voteDistribution: { [key: string]: number };
        topics: { [name: string]: { count: number; passed: number; voteDistribution: { [key: string]: number }; original_topic: string } };
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
        const categoryName = p.type_v2; // Use new category
        const topicName = p.topic_v2_unique; // Use new unique topic for identification
        const topicDisplayName = p.topic_v2_display; // Use new simple topic for display

        if (!categoryStats[categoryName]) categoryStats[categoryName] = { count: 0, passed: 0, voteDistribution: {}, topics: {} };
        if (!categoryStats[categoryName].topics[topicName]) {
            categoryStats[categoryName].topics[topicName] = { count: 0, passed: 0, voteDistribution: {}, original_topic: topicDisplayName };
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
            name: topicName, // Use unique name for ID
            displayName: topicData.original_topic, // Use simple name for display
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
  const { proposals, votes, categoryVisualizationMode, excludeAbstainNoVote } = state;

  if (categoryVisualizationMode === 'votePower') {
    const votesByProposal = new Map<string, { yes: number; total: number }>();
    for (const vote of votes) {
      if (!votesByProposal.has(vote.proposal_id)) {
        votesByProposal.set(vote.proposal_id, { yes: 0, total: 0 });
      }
      const proposalVotes = votesByProposal.get(vote.proposal_id)!;
      const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
      
      if (!isNaN(power)) {
        if (vote.vote_option === 'YES') {
          proposalVotes.yes += power;
        }
        
        const isNonVoting = vote.vote_option === 'NO_VOTE' || vote.vote_option === 'ABSTAIN';
        if (!excludeAbstainNoVote || !isNonVoting) {
          proposalVotes.total += power;
        }
      }
    }
    return proposals.map(p => {
      const powerVotes = votesByProposal.get(p.proposal_id);
      if (!powerVotes || powerVotes.total === 0) return 0;
      return (powerVotes.yes / powerVotes.total) * 100;
    });
  }

  // Default to 'voteCount'
  return state.proposals.map(p => {
    const { yes_count = 0, no_count = 0, abstain_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
    
    let totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
    if (excludeAbstainNoVote) {
      totalVotes -= abstain_count;
      // 'NO_VOTE' is not part of final_tally_result
    }

    return totalVotes === 0 ? 0 : (yes_count / totalVotes) * 100;
  });
};

export const getAvgVotingPowerDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.avgPower || 0);
};

export const getTotalVotingPowerDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.totalPower || 0);
};

export const getParticipationRateDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.participationRate || 0);
};
