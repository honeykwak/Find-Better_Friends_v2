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
  validatorAVotes: Vote[], // Base validator for 'base' mode
  validatorBVotes: Vote[],
  proposalIds: Set<string>,
  countNoVoteAsParticipation: boolean,
  mode: 'common' | 'base' = 'common'
): number {
  if (proposalIds.size === 0) {
    return 0;
  }

  const votesAByProposal = new Map(validatorAVotes.map(v => [v.proposal_id, v.vote_option]));
  const votesBByProposal = new Map(validatorBVotes.map(v => [v.proposal_id, v.vote_option]));

  let matchCount = 0;
  let comparableProposalsCount = 0;

  for (const proposalId of proposalIds) {
    const voteA = votesAByProposal.get(proposalId);
    const voteB = votesBByProposal.get(proposalId);

    const isAVoting = voteA && (countNoVoteAsParticipation || voteA !== 'NO_VOTE');
    const isBVoting = voteB && (countNoVoteAsParticipation || voteB !== 'NO_VOTE');

    let shouldCompare = false;
    if (mode === 'common') {
      // Compare only when both have voted (considering countNoVoteAsParticipation)
      shouldCompare = isAVoting && isBVoting;
    } else { // mode === 'base'
      // Compare whenever the base validator (A) has voted
      shouldCompare = isAVoting;
    }

    if (shouldCompare) {
      comparableProposalsCount++;
      // Use 'NO_VOTE' for comparison if countNoVoteAsParticipation is true and a vote is missing
      const finalVoteA = voteA || 'NO_VOTE';
      const finalVoteB = voteB || 'NO_VOTE';
      if (finalVoteA === finalVoteB) {
        matchCount++;
      }
    }
  }

  return comparableProposalsCount > 0 ? matchCount / comparableProposalsCount : 0;
}