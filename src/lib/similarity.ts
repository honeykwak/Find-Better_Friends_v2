import type { Proposal, Vote } from './dataLoader';

/**
 * Calculates the similarity between two validators based on their voting history,
 * with options for applying recency and polarization weighting.
 *
 * @param validatorAVotes - An array of votes from the first (base) validator.
 * @param validatorBVotes - An array of votes from the second validator.
 * @param proposals - An array of all relevant proposals for calculating weights.
 * @param proposalIds - A set of proposal IDs to consider for the calculation.
 * @param powerTallies - A map of proposal_id to its power-based tally for polarization scores.
 * @param countNoVoteAsParticipation - Whether to count 'NO_VOTE' as participation.
 * @param applyRecencyWeight - Whether to apply a time-based weight to recent proposals.
 * @param matchAbstainInSimilarity - Whether to count matching 'ABSTAIN' votes as an agreement.
 * @param mode - The calculation mode: 'common', 'base', or 'comprehensive'.
 * @returns A similarity score from 0 to 1.
 */
export function calculateSimilarity(
  validatorAVotes: Vote[],
  validatorBVotes: Vote[],
  proposals: Proposal[],
  proposalIds: Set<string>,
  powerTallies: Map<string, { yes: number; no: number; veto: number }>,
  countNoVoteAsParticipation: boolean,
  applyRecencyWeight: boolean,
  matchAbstainInSimilarity: boolean,
  mode: 'common' | 'base' | 'comprehensive' = 'common'
): number {
  if (proposalIds.size === 0) {
    return 0;
  }

  const votesAByProposal = new Map(validatorAVotes.map(v => [v.proposal_id, v.vote_option]));
  const votesBByProposal = new Map(validatorBVotes.map(v => [v.proposal_id, v.vote_option]));

  // Comprehensive mode with advanced weighting
  if (mode === 'comprehensive') {
    const sortedProposals = [...proposals]
      .filter(p => proposalIds.has(p.proposal_id))
      .sort((a, b) => new Date(Number(a.submit_time)).getTime() - new Date(Number(b.submit_time)).getTime());
    
    const n = sortedProposals.length;
    if (n === 0) return 0;

    let weightedAgreementSum = 0;
    let totalWeightSum = 0;

    sortedProposals.forEach((proposal, index) => {
      const ri = index + 1; // Rank (1-based)
      const proposalId = proposal.proposal_id;

      // 1. Polarization Score (Pi)
      const tally = powerTallies.get(proposalId);
      const yes = tally?.yes ?? 0;
      const no = tally?.no ?? 0;
      const veto = tally?.veto ?? 0;
      const totalVotes = yes + no + veto;
      const Pi = totalVotes > 0 ? 1 - Math.abs((yes / totalVotes) - ((no + veto) / totalVotes)) : 0;

      // 2. Recency Weight (Ti)
      const Ti = applyRecencyWeight ? ri / n : 1;

      // 3. Agreement (Ai)
      const voteA = votesAByProposal.get(proposalId) || 'NOT_VOTED';
      const voteB = votesBByProposal.get(proposalId) || 'NOT_VOTED';
      
      let Ai = 0;
      if (voteA === voteB) {
        if (voteA === 'ABSTAIN' && !matchAbstainInSimilarity) {
          Ai = 0; // Don't count matching abstains if option is off
        } else {
          Ai = 1; // Count all other matches
        }
      }

      const weight = Pi * Ti;
      weightedAgreementSum += Ai * weight;
      totalWeightSum += weight;
    });

    return totalWeightSum > 0 ? weightedAgreementSum / totalWeightSum : 0;
  }

  // --- Legacy modes: 'common' and 'base' ---
  let matchCount = 0;
  let comparableProposalsCount = 0;

  for (const proposalId of proposalIds) {
    const voteA = votesAByProposal.get(proposalId);
    const voteB = votesBByProposal.get(proposalId);

    const isAVoting = voteA && (countNoVoteAsParticipation || voteA !== 'NO_VOTE');
    const isBVoting = voteB && (countNoVoteAsParticipation || voteB !== 'NO_VOTE');

    let shouldCompare = false;
    if (mode === 'common') {
      shouldCompare = isAVoting && isBVoting;
    } else { // mode === 'base'
      shouldCompare = isAVoting;
    }

    if (shouldCompare) {
      comparableProposalsCount++;
      const finalVoteA = voteA || 'NO_VOTE';
      const finalVoteB = voteB || 'NO_VOTE';
      if (finalVoteA === finalVoteB) {
        if (finalVoteA === 'ABSTAIN' && !matchAbstainInSimilarity) {
          // In legacy modes, we don't count matching abstains as a match
          // but it's still part of the comparable set.
        } else {
          matchCount++;
        }
      }
    }
  }

  return comparableProposalsCount > 0 ? matchCount / comparableProposalsCount : 0;
}