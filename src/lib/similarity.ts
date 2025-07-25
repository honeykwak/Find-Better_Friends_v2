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
 */
function getAgreementScore(voteA: string, voteB: string, matchAbstainInSimilarity: boolean): number {
  if (voteA === voteB) {
    if (voteA === 'ABSTAIN' && !matchAbstainInSimilarity) return 0.0;
    return 1.0;
  }
  if (voteA === 'ABSTAIN' || voteB === 'ABSTAIN') return 0.25;
  return 0.0;
}

/**
 * Calculates a "Contrarian Bonus" if an agreement was on a minority opinion.
 */
function calculateContrarianBonus(voteOption: string, tally: { yes: number; no: number; veto: number; abstain: number }): number {
  const MINORITY_THRESHOLD = 0.3; // Vote share must be below 30% to be a minority

  const totalPower = tally.yes + tally.no + tally.veto + tally.abstain;
  if (totalPower === 0) return 0;

  let votePower = 0;
  switch (voteOption) {
    case 'YES': votePower = tally.yes; break;
    case 'NO': votePower = tally.no; break;
    case 'NO_WITH_VETO': votePower = tally.veto; break;
    case 'ABSTAIN': votePower = tally.abstain; break;
    default: return 0;
  }

  const voteShare = votePower / totalPower;

  if (voteShare < MINORITY_THRESHOLD) {
    // The rarer the vote, the higher the bonus
    return (1 - voteShare);
  }

  return 0;
}


/**
 * Calculates similarity between two validators, with nuanced scoring and contrarian bonus.
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

  if (comparisonUniverseProposals.length === 0) return 0;

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

    if (voteA === 'NOT_VOTED' && voteB === 'NOT_VOTED') return;

    const tally = powerTallies.get(proposalId) || { yes: 0, no: 0, veto: 0, abstain: 0 };

    // 1. Opinion Dispersion Index (ODi)
    const ODi = calculateOpinionDispersion(tally.yes, tally.no, tally.veto, tally.abstain);

    // 2. Recency Weight (Ti)
    const Ti = applyRecencyWeight ? ri / n : 1;

    // 3. Partial Agreement Score (Ai)
    const Ai = getAgreementScore(voteA, voteB, matchAbstainInSimilarity);

    // 4. Contrarian Bonus (Ci)
    let Ci = 0;
    if (Ai === 1.0) { // Bonus only applies on perfect agreement
        Ci = calculateContrarianBonus(voteA, tally);
    }

    // 5. Final Weight Calculation
    const weight = (ODi + Ci) * Ti;
    weightedAgreementSum += Ai * weight;
    totalWeightSum += weight;
  });

  return totalWeightSum > 0 ? weightedAgreementSum / totalWeightSum : 0;
}