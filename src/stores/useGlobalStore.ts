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
  topics: TopicNode[]
}

export interface TopicNode {
  name: string
  count: number
  passRate: number
  voteDistribution: Record<string, number>
}

export type ValidatorSortKey = 'voteCount' | 'name' | 'votingPower' | 'recentVotingPower' | 'similarity_common' | 'similarity_base' | 'similarity_comprehensive';

// 전역 상태 인터페이스
interface GlobalStore {
  proposals: Proposal[]
  validators: Validator[] // Raw validator data
  validatorsWithDerivedData: ValidatorWithDerivedData[] // Validators with calculated metrics
  votes: Vote[]
  
  selectedChain: string
  selectedCategories: string[]
  selectedTopics: string[]
  searchTerm: string;
  approvalRateRange: [number, number];
  submitTimeRange: [number, number];
  submitTimeDynamicRange: [number, number];
  
  // Validator filters
  participationRateRange: [number, number];
  participationRateDynamicRange: [number, number];
  votingPowerDisplayMode: 'percentile' | 'rank';
  votingPowerRange: [number, number];
  avgVotingPowerDynamicRange: [number, number];
  excludeAbstainNoVote: boolean;
  considerActivePeriodOnly: boolean;

  validatorSortKey: ValidatorSortKey;
  countNoVoteAsParticipation: boolean;
  categoryVisualizationMode: 'voteCount' | 'votePower'
  
  loading: boolean
  error: string | null
  windowSize: { width: number; height: number }
  
  // Actions
  setInitialData: (data: { proposals: Proposal[], validators: Validator[], votes: Vote[] }) => void;
  loadData: (chainName: string) => Promise<void>
  recalculateValidatorMetrics: () => void;
  setSelectedChain: (chain: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedTopics: (topics: string[]) => void
  toggleCategory: (category: string) => void
  toggleTopic: (topic: string) => void
  setSearchTerm: (term: string) => void
  setApprovalRateRange: (range: [number, number]) => void;
  setSubmitTimeRange: (range: [number, number]) => void;
  setParticipationRateRange: (range: [number, number]) => void;
  setVotingPowerDisplayMode: (mode: 'percentile' | 'rank') => void;
  setVotingPowerRange: (range: [number, number]) => void;
  setCategoryVisualizationMode: (mode: 'voteCount' | 'votePower') => void;
  setWindowSize: (size: { width: number; height: number }) => void;
  setValidatorSortKey: (key: ValidatorSortKey) => void;
  setCountNoVoteAsParticipation: (count: boolean) => void;
  setExcludeAbstainNoVote: (exclude: boolean) => void;
  setConsiderActivePeriodOnly: (activeOnly: boolean) => void;
  getFilteredProposals: () => (Proposal & { voteDistribution?: { [key: string]: number } })[];
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
  submitTimeRange: [0, 0],
  submitTimeDynamicRange: [0, 0],
  participationRateRange: [0, 100],
  participationRateDynamicRange: [0, 100],
  votingPowerDisplayMode: 'percentile',
  votingPowerRange: [0, 100],
  avgVotingPowerDynamicRange: [0, 1],
  excludeAbstainNoVote: false,
  considerActivePeriodOnly: false,
  categoryVisualizationMode: 'votePower',
  validatorSortKey: 'votingPower',
  countNoVoteAsParticipation: true,
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },

  // Actions
  setInitialData: ({ proposals, validators, votes }) => {
    let minTime = Infinity;
    let maxTime = -Infinity;
    if (proposals.length > 0) {
      proposals.forEach(p => {
        if (p.submit_time) {
          const time = new Date(Number(p.submit_time)).getTime();
          if (time < minTime) minTime = time;
          if (time > maxTime) maxTime = time;
        }
      });
    }
    const dynamicRange: [number, number] = [
        minTime === Infinity ? 0 : minTime,
        maxTime === -Infinity ? 0 : maxTime
    ];

    set({
      proposals,
      validators,
      votes,
      loading: false,
      submitTimeRange: dynamicRange,
      submitTimeDynamicRange: dynamicRange,
    });
    get().recalculateValidatorMetrics();
  },
  loadData: async (chainName: string) => {
    try {
      set({ loading: true, error: null });
      const { proposals, validators, votes } = await loadChainData(chainName);
      
      let minTime = Infinity;
      let maxTime = -Infinity;
      if (proposals.length > 0) {
        proposals.forEach(p => {
          if (p.submit_time) {
            const time = new Date(Number(p.submit_time)).getTime();
            if (time < minTime) minTime = time;
            if (time > maxTime) maxTime = time;
          }
        });
      }
      const dynamicRange: [number, number] = [
          minTime === Infinity ? 0 : minTime,
          maxTime === -Infinity ? 0 : maxTime
      ];
      
      set({
        proposals,
        validators,
        votes,
        loading: false,
        selectedCategories: [],
        selectedTopics: [],
        searchTerm: '',
        approvalRateRange: [0, 100],
        submitTimeRange: dynamicRange,
        submitTimeDynamicRange: dynamicRange,
        participationRateRange: [0, 100],
        votingPowerDisplayMode: 'percentile',
        votingPowerRange: [0, 100],
        validatorSortKey: 'votingPower',
        considerActivePeriodOnly: false,
      });
      get().recalculateValidatorMetrics();
    } catch (err: any) {
      set({ error: `Failed to load data: ${err?.message || 'Unknown error'}`, loading: false });
    }
  },

  recalculateValidatorMetrics: () => {
    const { proposals, validators, votes, getFilteredProposals, countNoVoteAsParticipation, considerActivePeriodOnly } = get();
    if (!proposals.length || !validators.length) {
      set({ 
        validatorsWithDerivedData: [], 
        participationRateDynamicRange: [0, 100], 
        avgVotingPowerDynamicRange: [0, 1],
      });
      return;
    }

    const filteredProposals = getFilteredProposals();
    const relevantProposalIds = new Set(filteredProposals.map(p => p.proposal_id));
    
    const proposalIdToTimeMap = new Map<string, number>();
    filteredProposals.forEach(p => {
      if (p.submit_time) {
        proposalIdToTimeMap.set(p.proposal_id, new Date(Number(p.submit_time)).getTime());
      }
    });

    const newValidatorsWithDerivedData = validators.map(v => {
      const validatorVotesInFilter = votes.filter(vote => 
        vote.validator_address === v.validator_address && 
        relevantProposalIds.has(vote.proposal_id)
      );

      let firstVoteTime = Infinity;
      validatorVotesInFilter.forEach(vote => {
        const time = proposalIdToTimeMap.get(vote.proposal_id);
        if (time && time < firstVoteTime) {
          firstVoteTime = time;
        }
      });

      const votesInActivePeriod = firstVoteTime === Infinity 
        ? [] 
        : validatorVotesInFilter.filter(vote => {
            const time = proposalIdToTimeMap.get(vote.proposal_id);
            return time && time >= firstVoteTime;
          });

      let sumOfPower = 0;
      let countOfVotes = 0;
      
      votesInActivePeriod.forEach(vote => {
        const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
        if (power && !isNaN(power)) {
          sumOfPower += power;
          countOfVotes++;
        }
      });

      let participationRate;
      if (considerActivePeriodOnly) {
        const proposalsWithTime = filteredProposals.filter(p => proposalIdToTimeMap.has(p.proposal_id));
        const timedParticipationCount = new Set(validatorVotesInFilter.map(v => v.proposal_id)).size;

        let relevantProposalCount = 0;
        if (firstVoteTime !== Infinity) {
          for (const p of proposalsWithTime) {
            const time = proposalIdToTimeMap.get(p.proposal_id)!;
            if (time >= firstVoteTime) {
              relevantProposalCount++;
            }
          }
        }
        participationRate = relevantProposalCount > 0 ? (timedParticipationCount / relevantProposalCount) * 100 : 0;
      } else {
        let proposalsForRate = [...filteredProposals];
        if (!countNoVoteAsParticipation) {
            const proposalsWithNoMeaningfulVotes = new Set<string>();
            const proposalVoteOptions = new Map<string, Set<string>>();
            for (const vote of votes) {
                if (relevantProposalIds.has(vote.proposal_id)) {
                    if (!proposalVoteOptions.has(vote.proposal_id)) proposalVoteOptions.set(vote.proposal_id, new Set());
                    proposalVoteOptions.get(vote.proposal_id)!.add(vote.vote_option);
                }
            }
            for (const proposal of proposalsForRate) {
                const options = proposalVoteOptions.get(proposal.proposal_id);
                if (!options || (options.size === 1 && options.has('NO_VOTE'))) proposalsWithNoMeaningfulVotes.add(proposal.proposal_id);
            }
            proposalsForRate = proposalsForRate.filter(p => !proposalsWithNoMeaningfulVotes.has(p.proposal_id));
        }
        const participationCount = new Set(validatorVotesInFilter.filter(v => v.vote_option !== 'NO_VOTE' || countNoVoteAsParticipation).map(v => v.proposal_id)).size;
        participationRate = proposalsForRate.length > 0 ? (participationCount / proposalsForRate.length) * 100 : 0;
      }
      
      return {
        ...v,
        avgPower: countOfVotes > 0 ? sumOfPower / countOfVotes : 0,
        participationRate: participationRate,
      }
    });

    let minRate = 100, maxRate = 0;
    let minAvgPower = Infinity, maxAvgPower = -Infinity;

    newValidatorsWithDerivedData.forEach(v => {
      minRate = Math.min(minRate, v.participationRate || 100);
      maxRate = Math.max(maxRate, v.participationRate || 0);
      minAvgPower = Math.min(minAvgPower, v.avgPower || Infinity);
      maxAvgPower = Math.max(maxAvgPower, v.avgPower || -Infinity);
    });

    const newAvgPowerDynamicRange: [number, number] = [minAvgPower === Infinity ? 0 : minAvgPower, maxAvgPower === -Infinity ? 0 : maxAvgPower];
    
    const { votingPowerDisplayMode } = get();
    if (votingPowerDisplayMode === 'rank') {
      set({ 
        validatorsWithDerivedData: newValidatorsWithDerivedData,
        participationRateDynamicRange: [Math.floor(minRate), Math.ceil(maxRate)],
        avgVotingPowerDynamicRange: newAvgPowerDynamicRange,
        votingPowerRange: [1, newValidatorsWithDerivedData.length || 1],
      });
    } else { // percentile
      set({ 
        validatorsWithDerivedData: newValidatorsWithDerivedData,
        participationRateDynamicRange: [Math.floor(minRate), Math.ceil(maxRate)],
        avgVotingPowerDynamicRange: newAvgPowerDynamicRange,
      });
    }
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
  setSubmitTimeRange: (range: [number, number]) => {
    set({ submitTimeRange: range });
    get().recalculateValidatorMetrics();
  },
  setParticipationRateRange: (range: [number, number]) => set({ participationRateRange: range }),
  setVotingPowerDisplayMode: (mode) => {
    const { validatorsWithDerivedData } = get();
    if (mode === 'rank') {
      set({
        votingPowerDisplayMode: 'rank',
        votingPowerRange: [1, validatorsWithDerivedData.length || 1]
      });
    } else { // percentile
      set({
        votingPowerDisplayMode: 'percentile',
        votingPowerRange: [0, 100]
      });
    }
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
    get().recalculateValidatorMetrics();
  },
  setConsiderActivePeriodOnly: (activeOnly: boolean) => {
    set({ considerActivePeriodOnly: activeOnly });
    get().recalculateValidatorMetrics();
  },

  // Selectors
  getProposalsFilteredByTime: () => {
    const { proposals, submitTimeRange } = get();
    const [minTime, maxTime] = submitTimeRange;
    if (!minTime || !maxTime) return proposals;

    return proposals.filter(p => {
        if (!p.submit_time) return false;
        const time = new Date(Number(p.submit_time)).getTime();
        return time >= minTime && time <= maxTime;
    });
  },

  getProposalsFilteredByRate: () => {
    const { getProposalsFilteredByTime, approvalRateRange, votes, categoryVisualizationMode, excludeAbstainNoVote } = get();
    const proposals = getProposalsFilteredByTime();
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

    return proposals.filter(p => {
      const { yes_count = 0, no_count = 0, abstain_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
      
      let totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
      if (excludeAbstainNoVote) {
        totalVotes -= abstain_count;
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
            continue;
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
        const categoryName = p.type_v2;
        const topicName = p.topic_v2_unique;
        const topicDisplayName = p.topic_v2_display;

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
        } else {
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
            displayName: topicData.original_topic,
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
  const { getProposalsFilteredByTime, votes, categoryVisualizationMode, excludeAbstainNoVote } = state;
  const proposals = getProposalsFilteredByTime();

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

  return proposals.map(p => {
    const { yes_count = 0, no_count = 0, abstain_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
    
    let totalVotes = yes_count + no_count + abstain_count + no_with_veto_count;
    if (excludeAbstainNoVote) {
      totalVotes -= abstain_count;
    }

    return totalVotes === 0 ? 0 : (yes_count / totalVotes) * 100;
  });
};

export const getSubmitTimeDistribution = (state: GlobalStore) => {
  return state.proposals.map(p => p.submit_time ? new Date(Number(p.submit_time)).getTime() : 0).filter(t => t > 0);
};

export const getAvgVotingPowerDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.avgPower || 0);
};

export const getParticipationRateDistribution = (state: GlobalStore) => {
  return state.validatorsWithDerivedData.map(v => v.participationRate || 0);
};