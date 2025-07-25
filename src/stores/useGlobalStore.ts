import { create } from 'zustand'
import { loadChainData, type Proposal, type Vote, type Validator } from '@/lib/dataLoader'
import { calculateSimilarity } from '@/lib/similarity'
import { createSelector } from 'reselect'

export type { Validator };

// Validator type with added optional properties for derived data
export interface ValidatorWithDerivedData extends Validator {
  avgPower?: number;
  participationRate?: number;
  similarity?: number;
  recentVotingPower?: number;
  voteCount?: number;
  isPinnedAndFilteredOut?: boolean;
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

export type ValidatorSortKey = 'voteCount' | 'name' | 'votingPower' | 'recentVotingPower' | 'similarity';
export type ComparisonScope = 'common' | 'base' | 'comprehensive';

// 전역 상태 인터페이스
interface GlobalStore {
  proposals: Proposal[]
  validators: Validator[] // Raw validator data
  validatorsWithDerivedData: ValidatorWithDerivedData[] // Validators with calculated metrics
  filteredValidators: ValidatorWithDerivedData[] // Validators after filtering, for display
  votes: Vote[]
  similarityScores: Map<string, number>;
  
  selectedChain: string
  selectedCategories: string[]
  selectedTopics: string[]
  searchTerm: string;
  polarizationScoreRange: [number, number];
  submitTimeRange: [number, number];
  submitTimeDynamicRange: [number, number];
  
  // Validator filters
  participationRateRange: [number, number];
  participationRateDynamicRange: [number, number];
  votingPowerDisplayMode: 'percentile' | 'rank';
  votingPowerRange: [number, number];
  avgVotingPowerDynamicRange: [number, number];
  considerActivePeriodOnly: boolean;

  // Similarity options
  applyRecencyWeight: boolean;
  matchAbstainInSimilarity: boolean;
  comparisonScope: ComparisonScope;

  validatorSortKey: ValidatorSortKey;
  countNoVoteAsParticipation: boolean;
  categoryVisualizationMode: 'voteCount' | 'votePower'
  
  loading: boolean
  error: string | null
  windowSize: { width: number; height: number }
  highlightedValidator: string | null;
  
  // Actions
  _recalculateFilteredValidators: () => void; // Internal action
  setInitialData: (data: { proposals: Proposal[], validators: Validator[], votes: Vote[] }) => void;
  loadData: (chainName: string) => Promise<void>
  recalculateValidatorMetrics: () => void;
  setSelectedChain: (chain: string) => void
  setSelectedCategories: (categories: string[]) => void
  setSelectedTopics: (topics: string[]) => void
  toggleCategory: (category: string) => void
  toggleTopic: (topic: string) => void
  setSearchTerm: (term: string) => void
  setPolarizationScoreRange: (range: [number, number]) => void;
  setSubmitTimeRange: (range: [number, number]) => void;
  setParticipationRateRange: (range: [number, number]) => void;
  setVotingPowerDisplayMode: (mode: 'percentile' | 'rank') => void;
  setVotingPowerRange: (range: [number, number]) => void;
  setCategoryVisualizationMode: (mode: 'voteCount' | 'votePower') => void;
  setWindowSize: (size: { width: number; height: number }) => void;
  setHighlightedValidator: (moniker: string | null) => void;
  setValidatorSortKey: (key: ValidatorSortKey) => void;
  setCountNoVoteAsParticipation: (count: boolean) => void;
  setConsiderActivePeriodOnly: (activeOnly: boolean) => void;
  setApplyRecencyWeight: (value: boolean) => void;
  setMatchAbstainInSimilarity: (value: boolean) => void;
  setComparisonScope: (scope: ComparisonScope) => void;
  getFilteredProposals: () => (Proposal & { voteDistribution?: { [key: string]: number } })[];
}

const calculatePolarizationFromCounts = (yes: number, no: number, veto: number): number => {
  const total = yes + no + veto;
  if (total === 0) return 0;
  const yesRatio = yes / total;
  const otherRatio = (no + veto) / total;
  return 1 - Math.abs(yesRatio - otherRatio);
};

// Helper function for percentile calculation using linear interpolation
const getPercentilePower = (percentile: number, sortedValidators: { avgPower?: any }[]): number => {
  const sortedPowers = sortedValidators.map(v => {
    const power = Number(v.avgPower || 0);
    return isFinite(power) ? power : 0;
  });

  const count = sortedPowers.length;
  if (count === 0) return 0;

  if (percentile <= 0) return sortedPowers[0];
  if (percentile >= 100) return sortedPowers[count - 1];

  const index = (percentile / 100) * (count - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedPowers[lowerIndex];
  }

  const lowerValue = sortedPowers[lowerIndex];
  const upperValue = sortedPowers[upperIndex];
  const fraction = index - lowerIndex;

  return lowerValue + fraction * (upperValue - lowerValue);
};

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  // Initial State
  proposals: [],
  validators: [],
  validatorsWithDerivedData: [],
  filteredValidators: [],
  votes: [],
  similarityScores: new Map(),
  selectedChain: 'cosmos',
  selectedCategories: [],
  selectedTopics: [],
  searchTerm: '',
  polarizationScoreRange: [0, 1],
  submitTimeRange: [0, 0],
  submitTimeDynamicRange: [0, 0],
  participationRateRange: [0, 100],
  participationRateDynamicRange: [0, 100],
  votingPowerDisplayMode: 'percentile',
  votingPowerRange: [0, 100],
  avgVotingPowerDynamicRange: [0, 1],
  considerActivePeriodOnly: false,
  applyRecencyWeight: false,
  matchAbstainInSimilarity: false,
  comparisonScope: 'comprehensive',
  categoryVisualizationMode: 'votePower',
  validatorSortKey: 'votingPower',
  countNoVoteAsParticipation: true,
  loading: true,
  error: null,
  windowSize: { width: 0, height: 0 },
  highlightedValidator: null,

  // Internal action to update filteredValidators
  _recalculateFilteredValidators: () => {
    const { 
      validatorsWithDerivedData, 
      votingPowerDisplayMode, 
      votingPowerRange, 
      participationRateRange,
      searchTerm 
    } = get();

    if (!validatorsWithDerivedData.length) {
      set({ filteredValidators: [] });
      return;
    }

    let currentValidators = [...validatorsWithDerivedData];
    let pinnedValidator: ValidatorWithDerivedData | null = null;

    if (searchTerm) {
      const foundIndex = currentValidators.findIndex(v => v.moniker === searchTerm);
      if (foundIndex !== -1) {
        pinnedValidator = { ...currentValidators[foundIndex] };
        currentValidators.splice(foundIndex, 1);
      }
    }

    let filteredByVotingPower: ValidatorWithDerivedData[];
    if (votingPowerDisplayMode === 'percentile') {
      const [minPercentile, maxPercentile] = votingPowerRange;
      const sortedForPercentile = [...currentValidators].sort((a, b) => (a.avgPower || 0) - (b.avgPower || 0));
      const minPower = getPercentilePower(minPercentile, sortedForPercentile);
      const maxPower = getPercentilePower(maxPercentile, sortedForPercentile);
      filteredByVotingPower = currentValidators.filter(v => (v.avgPower || 0) >= minPower && (v.avgPower || 0) <= maxPower);
    } else { // 'rank'
      const ranked = [...currentValidators].sort((a, b) => (b.avgPower || 0) - (a.avgPower || 0));
      const [minRank, maxRank] = votingPowerRange;
      const safeMinRank = Math.max(1, minRank);
      const safeMaxRank = Math.min(ranked.length, maxRank);
      filteredByVotingPower = ranked.slice(safeMinRank - 1, safeMaxRank);
    }

    const [minParticipation, maxParticipation] = participationRateRange;
    let finalValidators = filteredByVotingPower.filter(v => 
      (v.participationRate || 0) >= minParticipation && 
      (v.participationRate || 0) <= maxParticipation
    );

    if (pinnedValidator) {
      const isPinnedFilteredOut = !finalValidators.some(v => v.moniker === pinnedValidator!.moniker);
      pinnedValidator.isPinnedAndFilteredOut = isPinnedFilteredOut;
      finalValidators.unshift(pinnedValidator);
    }
    
    set({ filteredValidators: finalValidators });
  },

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
        polarizationScoreRange: [0, 1],
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
    const { proposals, validators, votes, getFilteredProposals, countNoVoteAsParticipation, considerActivePeriodOnly, searchTerm, validatorSortKey, applyRecencyWeight, matchAbstainInSimilarity, comparisonScope } = get();
    if (!proposals.length || !validators.length) {
      set({ 
        validatorsWithDerivedData: [], 
        filteredValidators: [],
        participationRateDynamicRange: [0, 100], 
        avgVotingPowerDynamicRange: [0, 1],
        similarityScores: new Map(),
      });
      return;
    }

    const filteredProposals = getFilteredProposals();
    
    const proposalIdToTimeMap = new Map<string, number>();
    filteredProposals.forEach(p => {
      if (p.submit_time) {
        proposalIdToTimeMap.set(p.proposal_id, new Date(Number(p.submit_time)).getTime());
      }
    });

    let newValidatorsWithDerivedData = validators.map(v => {
      const validatorVotesInFilter = votes.filter(vote => 
        vote.validator_address === v.validator_address && 
        new Set(filteredProposals.map(p => p.proposal_id)).has(vote.proposal_id)
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

      const voteCount = new Set(validatorVotesInFilter.filter(v => v.vote_option !== 'NO_VOTE' || countNoVoteAsParticipation).map(v => v.proposal_id)).size;

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
                if (new Set(filteredProposals.map(p => p.proposal_id)).has(vote.proposal_id)) {
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
        voteCount: voteCount,
      }
    });

    // Calculate recent voting power based on the single most recent proposal
    const sortedProposalsByDate = [...filteredProposals].sort((a, b) => {
      const timeA = a.submit_time ? new Date(Number(a.submit_time)).getTime() : 0;
      const timeB = b.submit_time ? new Date(Number(b.submit_time)).getTime() : 0;
      return timeB - timeA;
    });

    const votesMap = new Map<string, number>();
    for (const vote of votes) {
      const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
      if (power && !isNaN(power)) {
        votesMap.set(`${vote.proposal_id}-${vote.validator_address}`, power);
      }
    }

    if (sortedProposalsByDate.length > 0) {
      const mostRecentProposalId = sortedProposalsByDate[0].proposal_id;
      newValidatorsWithDerivedData.forEach(v => {
        const power = votesMap.get(`${mostRecentProposalId}-${v.validator_address}`);
        v.recentVotingPower = power || 0;
      });
    } else {
      newValidatorsWithDerivedData.forEach(v => {
        v.recentVotingPower = 0;
      });
    }

    const newSimilarityScores = new Map<string, number>();
    if (searchTerm && validatorSortKey === 'similarity') {
      const baseValidator = newValidatorsWithDerivedData.find(v => v.moniker === searchTerm);
      if (baseValidator) {
        const baseValidatorVotes = votes.filter(v => v.validator_address === baseValidator.validator_address);
        
        newValidatorsWithDerivedData.forEach(v => {
          if (v.moniker === searchTerm) {
            v.similarity = 1;
            newSimilarityScores.set(v.moniker, 1);
          } else {
            const validatorVotes = votes.filter(vote => vote.validator_address === v.validator_address);
            const similarity = calculateSimilarity(
              baseValidatorVotes, 
              validatorVotes, 
              filteredProposals,
              getPowerBasedTally(get()),
              applyRecencyWeight,
              matchAbstainInSimilarity,
              comparisonScope
            );
            v.similarity = similarity;
            newSimilarityScores.set(v.moniker, similarity);
          }
        });
      }
    }

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
        similarityScores: newSimilarityScores,
        participationRateDynamicRange: [Math.floor(minRate), Math.ceil(maxRate)],
        avgVotingPowerDynamicRange: newAvgPowerDynamicRange,
        votingPowerRange: [1, newValidatorsWithDerivedData.length || 1],
      });
    } else {
      set({ 
        validatorsWithDerivedData: newValidatorsWithDerivedData,
        similarityScores: newSimilarityScores,
        participationRateDynamicRange: [Math.floor(minRate), Math.ceil(maxRate)],
        avgVotingPowerDynamicRange: newAvgPowerDynamicRange,
      });
    }
    get()._recalculateFilteredValidators();
  },

  setSelectedChain: (chain: string) => {
    if (get().selectedChain === chain) return
    set({ selectedChain: chain })
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
      set({ searchTerm: term, validatorSortKey: 'similarity' });
    } else {
      set({ searchTerm: term, validatorSortKey: 'votingPower' });
    }
    get().recalculateValidatorMetrics();
  },
  setPolarizationScoreRange: (range: [number, number]) => {
    set({ polarizationScoreRange: range });
    get().recalculateValidatorMetrics();
  },
  setSubmitTimeRange: (range: [number, number]) => {
    set({ submitTimeRange: range });
    get().recalculateValidatorMetrics();
  },
  setParticipationRateRange: (range: [number, number]) => {
    set({ participationRateRange: range });
    get()._recalculateFilteredValidators();
  },
  setVotingPowerDisplayMode: (mode) => {
    const { validatorsWithDerivedData } = get();
    if (mode === 'rank') {
      set({
        votingPowerDisplayMode: 'rank',
        votingPowerRange: [1, validatorsWithDerivedData.length || 1]
      });
    } else {
      set({
        votingPowerDisplayMode: 'percentile',
        votingPowerRange: [0, 100]
      });
    }
    get()._recalculateFilteredValidators();
  },
  setVotingPowerRange: (range) => {
    set({ votingPowerRange: range });
    get()._recalculateFilteredValidators();
  },
  setCategoryVisualizationMode: (mode) => set({ categoryVisualizationMode: mode }),
  setWindowSize: (size) => set({ windowSize: size }),
  setHighlightedValidator: (moniker) => set({ highlightedValidator: moniker }),
  setValidatorSortKey: (key: ValidatorSortKey) => {
    set({ validatorSortKey: key });
    get().recalculateValidatorMetrics();
  },
  setCountNoVoteAsParticipation: (count: boolean) => {
    set({ countNoVoteAsParticipation: count });
    get().recalculateValidatorMetrics();
  },
  setConsiderActivePeriodOnly: (activeOnly: boolean) => {
    set({ considerActivePeriodOnly: activeOnly });
    get().recalculateValidatorMetrics();
  },
  setApplyRecencyWeight: (value: boolean) => {
    set({ applyRecencyWeight: value });
    get().recalculateValidatorMetrics();
  },
  setMatchAbstainInSimilarity: (value: boolean) => {
    set({ matchAbstainInSimilarity: value });
    get().recalculateValidatorMetrics();
  },
  setComparisonScope: (scope: ComparisonScope) => {
    set({ comparisonScope: scope });
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

  getProposalsFilteredByPolarization: () => {
    const { polarizationScoreRange, votes, categoryVisualizationMode } = get();
    const proposals = get().getProposalsFilteredByTime();
    const [minScore, maxScore] = polarizationScoreRange;

    const powerTallies = getPowerBasedTally(get());

    return proposals.filter(p => {
      let score = 0;
      if (categoryVisualizationMode === 'voteCount') {
        const { yes_count = 0, no_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
        score = calculatePolarizationFromCounts(yes_count, no_count, no_with_veto_count);
      } else { // 'votePower'
        const tally = powerTallies.get(p.proposal_id);
        if (tally) {
          score = calculatePolarizationFromCounts(tally.yes, tally.no, tally.veto);
        }
      }
      return score >= minScore && score <= maxScore;
    });
  },

  getFilteredProposals: () => {
    const { selectedTopics, votes, categoryVisualizationMode } = get();
    const proposalsFilteredByScore = get().getProposalsFilteredByPolarization();

    const proposalsWithDistribution = proposalsFilteredByScore.map(p => {
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

  getChains: () => [
    'akash', 'axelar', 'cosmos', 'dydx', 'evmos', 'finschia', 
    'gravity-bridge', 'injective', 'iris', 'juno', 'kava', 'kyve', 
    'osmosis', 'secret', 'sentinel', 'stargaze', 'terra'
  ],

  getFilteredCategoryHierarchy: () => {
    const { votes, categoryVisualizationMode } = get();
    const proposalsFilteredByScore = get().getProposalsFilteredByPolarization();

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

    for (const p of proposalsFilteredByScore) {
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

const getPowerBasedTally = createSelector(
  (state: GlobalStore) => state.votes,
  (votes) => {
    const tallies = new Map<string, { yes: number; no: number; veto: number; abstain: number }>();
    for (const vote of votes) {
      if (!tallies.has(vote.proposal_id)) {
        tallies.set(vote.proposal_id, { yes: 0, no: 0, veto: 0, abstain: 0 });
      }
      const tally = tallies.get(vote.proposal_id)!;
      const power = typeof vote.voting_power === 'string' ? parseFloat(vote.voting_power) : vote.voting_power;
      if (isNaN(power)) continue;

      if (vote.vote_option === 'YES') tally.yes += power;
      else if (vote.vote_option === 'NO') tally.no += power;
      else if (vote.vote_option === 'NO_WITH_VETO') tally.veto += power;
      else if (vote.vote_option === 'ABSTAIN') tally.abstain += power;
    }
    return tallies;
  }
);

// Standalone selectors for data distribution
export const getPolarizationScoreDistribution = (state: GlobalStore) => {
  const { getProposalsFilteredByTime, categoryVisualizationMode } = state;
  const proposals = getProposalsFilteredByTime();
  const powerTallies = getPowerBasedTally(state);

  return proposals.map(p => {
    if (categoryVisualizationMode === 'voteCount') {
      const { yes_count = 0, no_count = 0, no_with_veto_count = 0 } = p.final_tally_result || {};
      return calculatePolarizationFromCounts(yes_count, no_count, no_with_veto_count);
    } else { // 'votePower'
      const tally = powerTallies.get(p.proposal_id);
      if (!tally) return 0;
      return calculatePolarizationFromCounts(tally.yes, tally.no, tally.veto);
    }
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

// Initialize data on first load
if (typeof window !== 'undefined') {
  useGlobalStore.getState().loadData('cosmos').catch(console.error);
}