import type { Proposal, Vote } from './dataLoader';

/**
 * Calculates the Opinion Dispersion Index (ODi) for a proposal.
 * A score of 1 indicates maximum dispersion, 0 indicates perfect consensus.
 */
function calculateOpinionDispersion(yes: number, no: number, veto: number, abstain: number): number {
  const totalPower = yes + no + veto + abstain;
  if (totalPower === 0) return 0;

  const k = 4; // YES, NO, VETO, ABSTAIN
  const shares = [yes / totalPower, no / totalPower, veto / totalPower, abstain / totalPower];
  const hhi = shares.reduce((sum, share) => sum + share ** 2, 0);
  const odi = (1 - hhi) / (1 - 1 / k);
  
  return odi;
}

/**
 * Calculates similarity between two validators, with special handling for 'ABSTAIN' votes.
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

  // Define the set of proposals to compare based on the mode
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

    // --- Abstain Exception Rule ---
    // If the "match abstain" option is OFF, exclude any proposal where at least one validator abstained.
    if (!matchAbstainInSimilarity && (voteA === 'ABSTAIN' || voteB === 'ABSTAIN')) {
      return; // Skip this proposal entirely
    }
    // If the "match abstain" option is ON, but votes don't match and one is ABSTAIN, exclude.
    if (matchAbstainInSimilarity && voteA !== voteB && (voteA === 'ABSTAIN' || voteB === 'ABSTAIN')) {
      return; // Skip this proposal
    }

    // 1. Opinion Dispersion Index (ODi)
    const tally = powerTallies.get(proposalId) || { yes: 0, no: 0, veto: 0, abstain: 0 };
    const ODi = calculateOpinionDispersion(tally.yes, tally.no, tally.veto, tally.abstain);

    // 2. Recency Weight (Ti)
    const Ti = applyRecencyWeight ? ri / n : 1;

    // 3. Agreement (Ai)
    let Ai = 0;
    if (voteA === voteB && voteA !== 'NOT_VOTED') {
      Ai = 1;
    }

    const weight = ODi * Ti;
    weightedAgreementSum += Ai * weight;
    totalWeightSum += weight;
  });

  return totalWeightSum > 0 ? weightedAgreementSum / totalWeightSum : 0;
}