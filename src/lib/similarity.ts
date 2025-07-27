import type { Proposal, Vote } from './dataLoader';

type Tally = { yes: number; no: number; veto: number; abstain: number };

/**
 * 1. 부분 일치 점수 (Ai)
 * Calculates a partial agreement score between two votes, including nuanced handling of abstentions and non-votes.
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
 * 2. 대립 지표 (Ci)
 * Calculates the Conflict Index for a proposal, measuring how balanced the conflict is between 'For' and 'Against' camps.
 * Ignores abstain votes for this calculation.
 */
function calculateConflictIndex(tally: Tally): number {
  const yesPower = tally.yes;
  const noPower = tally.no + tally.veto;
  const totalPower = yesPower + noPower;

  if (totalPower === 0) return 0;

  const pY = yesPower / totalPower;
  // const pN = noPower / totalPower; // pN is just 1 - pY
  
  // Ci = 1 - |pY - pN| = 1 - |pY - (1 - pY)| = 1 - |2pY - 1|
  const conflictIndex = 1 - Math.abs(2 * pY - 1);
  
  return conflictIndex;
}

/**
 * 3. 소수 의견 보정 가중치 (Wi)
 * Calculates a weight based on whether the agreement was on a minority opinion.
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

  // Wi = 0.75 + 0.5 * (1 - ri)
  // This formula maps a ratio `ri` from [0, 1] to a weight `Wi` in [0.75, 1.25]
  // If you're in a 10% minority (ri=0.1), weight is 0.75 + 0.5 * 0.9 = 1.2
  // If you're in a 90% majority (ri=0.9), weight is 0.75 + 0.5 * 0.1 = 0.8
  const weight = 0.75 + 0.5 * (1 - groupRatio);
  return weight;
}

/**
 * 4. 최신성 점수 (Ri)
 * Calculates a recency weight for a proposal.
 * Adjusted to scale from 0.75 (oldest) to 1.25 (newest) for balanced influence.
 */
function calculateRecencyWeight(proposalIndex: number, totalProposals: number): number {
  if (totalProposals <= 1) return 1.0; // Neutral weight if only one proposal
  // Ri = 0.75 + 0.5 * ( (pi - 1) / (n - 1) )
  // This scales the weight from 0.75 to 1.25
  return 0.75 + 0.5 * ((proposalIndex - 1) / (totalProposals - 1));
}


/**
 * Calculates similarity between two validators based on the new Conflict Index model.
 */
export function calculateSimilarity(
  baseValidatorVotes: Vote[],
  targetValidatorVotes: Vote[],
  proposals: Proposal[],
  powerTallies: Map<string, Tally>,
  matchAbstainInSimilarity: boolean,
  // Assuming participation rates are passed in. This needs to be connected in the calling component.
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

  comparisonUniverseProposals.forEach(proposal => {
    const proposalId = proposal.proposal_id;
    const voteA = baseVotesMap.get(proposalId) || 'NOT_VOTED';
    const voteB = targetVotesMap.get(proposalId) || 'NOT_VOTED';

    const tally = powerTallies.get(proposalId) || { yes: 0, no: 0, veto: 0, abstain: 0 };
    
    // 1. 부분 일치 점수 (Ai)
    const Ai = getAgreementScore(voteA, voteB, matchAbstainInSimilarity, baseValidatorParticipation, targetValidatorParticipation);

    // 2. 대립 지표 (Ci) - Scaled from 1.0 to 2.0
    const Ci_raw = calculateConflictIndex(tally);
    const Ci_scaled = 1.0 + Ci_raw; // Scale to [1, 2]

    // 3. 소수 의견 보정 가중치 (Wi)
    // Only calculate if there was some form of agreement
    const Wi = (Ai > 0 && voteA !== 'NOT_VOTED') ? calculateMinorityWeight(voteA, tally) : 1.0;

    // 4. 최신성 점수 (Ri)
    const proposalIndex = sortedProposals.findIndex(p => p.proposal_id === proposal.proposal_id) + 1;
    const Ri = calculateRecencyWeight(proposalIndex, n);

    // Final score for this single proposal
    const proposalScore = Ai * Ci_scaled * Wi * Ri;
    proposalScores.push(proposalScore);
  });

  if (proposalScores.length === 0) return 0;

  // Return the average of all proposal scores
  const totalScore = proposalScores.reduce((sum, score) => sum + score, 0);
  return totalScore / proposalScores.length;
}