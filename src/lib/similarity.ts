import type { Vote } from './dataLoader';

/**
 * Calculates the similarity between two validators based on the exact match percentage of their votes.
 * All vote options are treated as equal, and the score is based on how often they match.
 * 
 * @param validatorAVotes - An array of votes from the first validator.
 * @param validatorBVotes - An array of votes from the second validator.
 * @param proposalIds - A set of proposal IDs to consider for the calculation.
 * @returns A similarity score from 0 (no matches) to 1 (all matches).
 */
export function calculateSimilarity(
  validatorAVotes: Vote[],
  validatorBVotes: Vote[],
  proposalIds: Set<string>
): number {
  if (proposalIds.size === 0) {
    return 0; // No proposals to compare
  }

  const votesAByProposal = new Map(validatorAVotes.map(v => [v.proposal_id, v.vote_option]));
  const votesBByProposal = new Map(validatorBVotes.map(v => [v.proposal_id, v.vote_option]));

  let matchCount = 0;

  for (const proposalId of proposalIds) {
    // Use 'NO_VOTE' as the default if a validator did not participate in a proposal
    const voteA = votesAByProposal.get(proposalId) || 'NO_VOTE';
    const voteB = votesBByProposal.get(proposalId) || 'NO_VOTE';

    if (voteA === voteB) {
      matchCount++;
    }
  }

  return matchCount / proposalIds.size;
}