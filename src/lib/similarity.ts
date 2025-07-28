import type { Proposal, Vote } from './dataLoader';

type Tally = { yes: number; no: number; veto: number; abstain: number };

/**
 * 1. Partial Alignment Score (Ai)
 * Calculates a partial agreement score between two votes.
 */
function getAgreementScore(
  voteA: string,
  voteB: string,
  matchAbstainInSimilarity: boolean,
  participationA: number,
  participationB: number
): number {
  // Handle NO VOTE cases first
  if (voteA === 'NOT_VOTED' && voteB === 'NOT_VOTED') {
    const pA = participationA;
    const pB = participationB;
    if (pA >= 0.7 && pB >= 0.7) return 1.0;
    if (pA >= 0.7 && pB >= 0.4) return 0.75;
    if (pA >= 0.4 && pB >= 0.7) return 0.75;
    if (pA >= 0.4 && pB >= 0.4) return 0.5;
    return 0.0;
  }
  if (voteA === 'NOT_VOTED' || voteB === 'NOT_VOTED') {
    return 0.0;
  }

  // Standard vote comparisons
  if (voteA === voteB) {
    if (voteA === 'ABSTAIN') {
      return matchAbstainInSimilarity ? 1.0 : 0.0;
    }
    return 1.0;
  }

  if ((voteA === 'NO' && voteB === 'NO_WITH_VETO') || (voteA === 'NO_WITH_VETO' && voteB === 'NO')) {
    return 0.5; // Weak agreement
  }

  if (voteA === 'ABSTAIN' || voteB === 'ABSTAIN') {
    return 0.25; // Weak disagreement
  }

  return 0.0; // Complete disagreement
}

/**
 * 2.1. Conflict Weight (Ci)
 * Calculates the Conflict Weight for a proposal.
 * Ci = 2 - |2 * pY - 1|, where pY is the ratio of 'Yes' votes.
 * Range: [1, 2]
 */
function calculateConflictWeight(tally: Tally): number {
  const yesPower = tally.yes;
  const noPower = tally.no + tally.veto;
  const totalPower = yesPower + noPower;

  if (totalPower === 0) return 1.0; // No conflict, neutral weight

  const pY = yesPower / totalPower;
  const conflictWeight = 2 - Math.abs(2 * pY - 1);
  
  return conflictWeight;
}

/**
 * 2.2. Minority Weight (Mi)
 * Calculates a weight based on whether the agreement was on a minority opinion.
 * Mi = 0.7 + 1.2 * (0.5 - ri), where ri is the minority ratio.
 * Range: [0.7, 1.3]
 */
function calculateMinorityWeight(voteOption: string, tally: Tally): number {
  const yesPower = tally.yes;
  const noPower = tally.no + tally.veto;
  const totalPower = yesPower + noPower;

  if (totalPower === 0) return 1.0; // Neutral weight if no conflict

  let groupRatio: number;
  if (voteOption === 'YES') {
    groupRatio = yesPower / totalPower;
  } else if (voteOption === 'NO' || voteOption === 'NO_WITH_VETO') {
    groupRatio = noPower / totalPower;
  } else {
    return 1.0; // Neutral weight for non-conflict votes (Abstain, Not Voted)
  }

  const minorityRatio = Math.min(groupRatio, 1 - groupRatio);
  const weight = 0.7 + 1.2 * (0.5 - minorityRatio);
  return weight;
}

/**
 * 2.3. Recency Weight (Ri)
 * Calculates a recency weight for a proposal.
 * Ri = 0.9 + 0.2 * ( (pi - 1) / (n - 1) )
 * Range: [0.9, 1.1]
 */
function calculateRecencyWeight(proposalIndex: number, totalProposals: number): number {
  if (totalProposals <= 1) return 1.0; // Neutral weight if only one proposal
  return 0.9 + 0.2 * ((proposalIndex - 1) / (totalProposals - 1));
}

/**
 * Calculates the Contextual Alliance Index between two validators.
 */
export function calculateSimilarity(
  baseValidatorVotes: Vote[],
  targetValidatorVotes: Vote[],
  proposals: Proposal[],
  powerTallies: Map<string, Tally>,
  matchAbstainInSimilarity: boolean,
  baseValidatorParticipation: number,
  targetValidatorParticipation: number
): number {
  const baseVotesMap = new Map(baseValidatorVotes.map(v => [v.proposal_id, v.vote_option]));
  const targetVotesMap = new Map(targetValidatorVotes.map(v => [v.proposal_id, v.vote_option]));

  const comparisonUniverseProposals = proposals.filter(p => 
    baseVotesMap.has(p.proposal_id) || targetVotesMap.has(p.proposal_id)
  );

  if (comparisonUniverseProposals.length === 0) return 0;

  const sortedProposals = [...proposals].sort(
    (a, b) => new Date(Number(a.submit_time)).getTime() - new Date(Number(b.submit_time)).getTime()
  );
  const n = sortedProposals.length;

  const proposalScores: number[] = [];
  const contextualWeights: number[] = [];

  comparisonUniverseProposals.forEach(proposal => {
    const proposalId = proposal.proposal_id;
    const voteA = baseVotesMap.get(proposalId) || 'NOT_VOTED';
    const voteB = targetVotesMap.get(proposalId) || 'NOT_VOTED';

    const tally = powerTallies.get(proposalId) || { yes: 0, no: 0, veto: 0, abstain: 0 };
    
    // 1. Partial Alignment Score (Ai)
    const Ai = getAgreementScore(voteA, voteB, matchAbstainInSimilarity, baseValidatorParticipation, targetValidatorParticipation);

    // 2. Contextual Weights
    const Ci = calculateConflictWeight(tally);
    const Mi = calculateMinorityWeight(voteA, tally);
    const proposalIndex = sortedProposals.findIndex(p => p.proposal_id === proposal.proposal_id) + 1;
    const Ri = calculateRecencyWeight(proposalIndex, n);

    const Wi = (Ci + Mi + Ri) / 3;
    contextualWeights.push(Wi);

    // Final score for this single proposal
    const proposalScore = Ai * Wi;
    proposalScores.push(proposalScore);
  });

  if (proposalScores.length === 0) return 0;

  // 3. Scaling Factor (alpha)
  const totalContextualWeight = contextualWeights.reduce((sum, weight) => sum + weight, 0);
  const avgContextualWeight = totalContextualWeight / contextualWeights.length;
  const alpha = avgContextualWeight > 0 ? 1 / avgContextualWeight : 1;

  // Final Index Calculation
  const totalScore = proposalScores.reduce((sum, score) => sum + score, 0);
  const avgScore = totalScore / proposalScores.length;
  
  return alpha * avgScore;
}
