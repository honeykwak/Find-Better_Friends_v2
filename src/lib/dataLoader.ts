// This file is now a simplified data loader that fetches data from our new, optimized APIs.

export interface Proposal {
  proposal_id: string;
  chain_id: string;
  title: string;
  type: string;
  topic: string;
  type_v2: string;
  topic_v2: string; // This will be the display name now
  topic_v2_display: string;
  topic_v2_unique: string;
  status: string;
  submit_time: string;
  final_tally_result: Record<string, number>;
  conflictIndex?: number;
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

export interface ProcessedData {
  proposals: Proposal[];
  validators: Validator[];
  votes: Vote[];
}

/**
 * Constructs an absolute URL for a given path, handling server-side and client-side environments.
 * @param {string} path - The relative path (e.g., /api/data).
 * @returns {string} The full URL.
 */
function getAbsoluteUrl(path: string): string {
  // If we're on the client, relative paths are fine
  if (typeof window !== 'undefined') {
    return path;
  }
  // If we're on the server, we need to build the full URL
  // Vercel provides the VERCEL_URL environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}${path}`;
  }
  // For local development, we assume localhost
  return `http://localhost:3000${path}`;
}

/**
 * Loads all necessary data for a given chain from the new, optimized API endpoints.
 * @param {string} chainName - The name of the chain to load data for.
 * @returns {Promise<ProcessedData>}
 */
export async function loadChainData(chainName: string): Promise<ProcessedData> {
  try {
    console.log(`dataLoader: Loading data for chain: ${chainName} from optimized APIs`);

    const proposalsPromise = fetch(getAbsoluteUrl(`/data/${chainName}/proposals_v2.json`)).then(res => res.json());
    const validatorsPromise = fetch(getAbsoluteUrl(`/data/${chainName}/validators.json`)).then(res => res.json());
    const votesPromise = fetch(getAbsoluteUrl(`/data/${chainName}/votes.json`)).then(res => res.json());

    const [proposals, validators, votes] = await Promise.all([
      proposalsPromise,
      validatorsPromise,
      votesPromise,
    ]);

    // Handle cases where an API might fail gracefully
    if (!proposals || proposals.message) throw new Error(`Failed to load proposals: ${proposals.message || 'Unknown error'}`);
    if (!validators || validators.message) throw new Error(`Failed to load validators: ${validators.message || 'Unknown error'}`);
    if (!votes || votes.message) throw new Error(`Failed to load votes: ${votes.message || 'Unknown error'}`);

    console.log(`dataLoader: Chain data loaded for ${chainName} from API:`, {
      proposals: proposals.length,
      validators: validators.length,
      votes: votes.length,
    });

    return { proposals, validators, votes };
  } catch (error) {
    console.error(`dataLoader: Failed to load data for chain ${chainName} from API:`, error);
    // Return empty data structure on failure to prevent app crash
    return {
      proposals: [],
      validators: [],
      votes: [],
    };
  }
}