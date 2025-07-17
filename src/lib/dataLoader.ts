// This file is now a simplified data loader that fetches data from our new, optimized APIs.

export interface Proposal {
  proposal_id: string;
  chain_id: string;
  title: string;
  type: string;
  topic: string;
  status: string;
  submit_time: string;
  final_tally_result: Record<string, number>;
}

export interface Validator {
  validator_address: string;
  moniker: string;
  chain_id: string;
}

export interface Vote {
  proposal_id: string;
  validator_address: string;
  vote_option: string;
}

export interface CategorySummary {
  categories: Record<string, {
    count: number;
    passCount: number;
    passRate: number;
    voteDistribution: Record<string, number>;
    votingPowerDistribution: Record<string, number>;
  }>;
  topics: Record<string, {
    category: string;
    count: number;
    passCount: number;
    passRate: number;
    voteDistribution: Record<string, number>;
    votingPowerDistribution: Record<string, number>;
  }>;
}

export interface ProcessedData {
  proposals: Proposal[];
  validators: Validator[];
  votes: Vote[];
  categorySummary: CategorySummary;
}

const API_BASE_URL = '/api';

/**
 * Loads all necessary data for a given chain from the new, optimized API endpoints.
 * @param {string} chainName - The name of the chain to load data for.
 * @returns {Promise<ProcessedData>}
 */
export async function loadChainData(chainName: string): Promise<ProcessedData> {
  try {
    console.log(`dataLoader: Loading data for chain: ${chainName} from optimized APIs`);

    const proposalsPromise = fetch(`${API_BASE_URL}/proposals?chain=${chainName}`).then(res => res.json());
    const validatorsPromise = fetch(`${API_BASE_URL}/validators?chain=${chainName}`).then(res => res.json());
    const votesPromise = fetch(`${API_BASE_URL}/votes?chain=${chainName}`).then(res => res.json());
    const categorySummaryPromise = fetch(`${API_BASE_URL}/category-summary?chain=${chainName}`).then(res => res.json());

    const [proposals, validators, votes, categorySummary] = await Promise.all([
      proposalsPromise,
      validatorsPromise,
      votesPromise,
      categorySummaryPromise,
    ]);

    // Handle cases where an API might fail gracefully
    if (!proposals || proposals.message) throw new Error(`Failed to load proposals: ${proposals.message || 'Unknown error'}`);
    if (!validators || validators.message) throw new Error(`Failed to load validators: ${validators.message || 'Unknown error'}`);
    if (!votes || votes.message) throw new Error(`Failed to load votes: ${votes.message || 'Unknown error'}`);
    if (!categorySummary || categorySummary.message) throw new Error(`Failed to load category summary: ${categorySummary.message || 'Unknown error'}`);


    console.log(`dataLoader: Chain data loaded for ${chainName} from API:`, {
      proposals: proposals.length,
      validators: validators.length,
      votes: votes.length,
      categorySummary: categorySummary ? 'Loaded' : 'Failed',
    });

    return { proposals, validators, votes, categorySummary };
  } catch (error) {
    console.error(`dataLoader: Failed to load data for chain ${chainName} from API:`, error);
    // Return empty data structure on failure to prevent app crash
    return {
      proposals: [],
      validators: [],
      votes: [],
      categorySummary: { categories: {}, topics: {} },
    };
  }
}