import type { Proposal, Vote } from './dataLoader';

const EPSILON = 0.01; // Minimum weight to prevent division by zero and ignore disagreements

/**
 * Calculates the Opinion Dispersion Index (ODi) for a proposal.
 * A minimum weight (EPSILON) is added to ensure no proposal has zero weight.
 */
function calculateOpinionDispersion(yes: number, no: number, veto: number, abstain: number): number {
  const totalPower = yes + no + veto + abstain;
  if (totalPower === 0) return EPSILON;

  const k = 4; // YES, NO, VETO, ABSTAIN
  const shares = [yes / totalPower, no / totalPower, veto / totalPower, abstain / totalPower];
  const hhi = shares.reduce((sum, share) => sum + share ** 2, 0);
  const odi = (1 - hhi) / (1 - 1 / k);
  
  return odi + EPSILON;
}

/**
 * Calculates a partial agreement score (Ai) between two votes.
 * This allows for nuanced scoring beyond simple match/mismatch.
 */
function getAgreementScore(voteA: string, voteB: string, matchAbstainInSimilarity: boolean): number {
  if (voteA === voteB) {
    // Matching votes are a full agreement, unless it's an uncounted abstain match
    if (voteA === 'ABSTAIN' && !matchAbstainInSimilarity) {
      return 0; // Explicitly not counting matching abstains
    }
    return 1.0; // Perfect match
  }

  // Handle cases involving Abstain as partial disagreement
  if (voteA === 'ABSTAIN' || voteB === 'ABSTAIN') {
    return 0.25; // Partial disagreement score for any non-matching abstain case
  }

  // All other non-matching votes are a full disagreement
  return 0.0;
}


/**
 * Calculates similarity between two validators, with nuanced scoring and bug fixes.
 *
 * @param baseValidatorVotes - Votes from the base validator.
 * @param targetValidatorVotes - Votes from the target validator.
 * @param proposals - All relevant proposals.
 * @param powerTallies - A map of proposal_id to its power-based tally.
 * @param applyRecencyWeight - Whether to apply time-based weight.
 * @param matchAbstainInSimilarity - Whether to count matching 'ABSTAIN' as agreement.
 * @param mode - The calculation mode: 'common', 'base', or 'comprehensive'.
 * @returns A similarity score from 0 to 1.
 */
export function calculateSimilarity(
  baseValidatorVotes: Vote[],
  targetValidatorVotes: Vote[],
  proposals: Proposal[],
  powerTallies: Map<string, { yes: number; no: number; veto: number; abstain: number }>,
  applyRecencyWeight: boolean,
  matchAbstainInSimilarity: boolean,
  mode: 'common' | 'base' | 'comprehensive' = 'comprehensive'
): number {
  const baseVotesMap = new Map(baseValidatorVotes.map(v => [v.proposal_id, v.vote_option]));
  const targetVotesMap = new Map(targetValidatorVotes.map(v => [v.proposal_id, v.vote_option]));

  let comparisonUniverseProposals: Proposal[];

  if (mode === 'common') {
    comparisonUniverseProposals = proposals.filter(p => 
      baseVotesMap.has(p.proposal_id) && targetVotesMap.has(p.proposal_id)
    );
  } else if (mode === 'base') {
    comparisonUniverseProposals = proposals.filter(p => 
      baseVotesMap.has(p.proposal_id)
    );
  } else { // 'comprehensive'
    comparisonUniverseProposals = proposals.filter(p => 
      baseVotesMap.has(p.proposal_id) || targetVotesMap.has(p.proposal_id)
    );
  }

  if (comparisonUniverseProposals.length === 0) {
    return 0;
  }

  const sortedProposals = [...proposals].sort(
    (a, b) => new Date(Number(a.submit_time)).getTime() - new Date(Number(b.submit_time)).getTime()
  );
  const n = sortedProposals.length;

  let weightedAgreementSum = 0;
  let totalWeightSum = 0;

  comparisonUniverseProposals.forEach(proposal => {
    const ri = sortedProposals.findIndex(p => p.proposal_id === proposal.proposal_id) + 1;
    const proposalId = proposal.proposal_id;
    
    const voteA = baseVotesMap.get(proposalId) || 'NOT_VOTED';
    const voteB = targetVotesMap.get(proposalId) || 'NOT_VOTED';

    // Skip proposals where neither voted
    if (voteA === 'NOT_VOTED' && voteB === 'NOT_VOTED') {
      return;
    }

    // 1. Opinion Dispersion Index (ODi) with Epsilon
    const tally = powerTallies.get(proposalId) || { yes: 0, no: 0, veto: 0, abstain: 0 };
    const ODi = calculateOpinionDispersion(tally.yes, tally.no, tally.veto, tally.abstain);

    // 2. Recency Weight (Ti)
    const Ti = applyRecencyWeight ? ri / n : 1;

    // 3. Partial Agreement Score (Ai)
    const Ai = getAgreementScore(voteA, voteB, matchAbstainInSimilarity);

    const weight = ODi * Ti;
    weightedAgreementSum += Ai * weight;
    totalWeightSum += weight;
  });

  return totalWeightSum > 0 ? weightedAgreementSum / totalWeightSum : 0;
}
