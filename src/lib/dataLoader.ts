import { loadOptimizedData, convertToLegacyFormat } from './optimizedDataLoader'

export interface Proposal {
  proposal_id: string
  chain: string
  original_id: string
  title: string
  type: string
  status: string
  timestamp: number
  voting_start: number
  voting_end: number
  tx_hash: string
  proposer: string
  high_level_category: string
  topic_subject: string
  passed: boolean
}

export interface Validator {
  validator_id: string
  chain: string
  validator_address: string
  voter_name: string
}

export interface Vote {
  proposal_id: string
  validator_id: string
  vote_option: string
  voting_power: number
  timestamp: number
  tx_hash: string
}

export interface ProcessedData {
  proposals: Proposal[]
  validators: Validator[]
  votes: Vote[]
}

// 모든 데이터 로드 (최적화된 구조만 사용)
export async function loadAllData(): Promise<ProcessedData> {
  try {
    console.log('dataLoader: Loading optimized data...')
    
    // 최적화된 데이터 로드
    const optimizedData = await loadOptimizedData()
    console.log('dataLoader: Optimized data loaded successfully')
    
    // 기존 형식으로 변환하여 호환성 유지
    console.log('dataLoader: Converting to legacy format...')
    const legacyData = convertToLegacyFormat(optimizedData)
    
    console.log('dataLoader: Optimized data loaded and converted:', {
      proposals: legacyData.proposals.length,
      validators: legacyData.validators.length,
      votes: legacyData.votes.length,
      savings: '79% smaller files'
    })

    return legacyData
  } catch (error) {
    console.error('dataLoader: Failed to load optimized data:', error)
    throw error
  }
}

// 프로포절 분석용 데이터 처리
export function processProposalData(proposals: Proposal[]) {
  // 카테고리별 통과율 계산
  const categoryStats = proposals.reduce((acc, proposal) => {
    const category = proposal.high_level_category || 'Unknown'
    if (!acc[category]) {
      acc[category] = { total: 0, passed: 0 }
    }
    acc[category].total++
    if (proposal.passed) {
      acc[category].passed++
    }
    return acc
  }, {} as Record<string, { total: number; passed: number }>)

  const categories = Object.entries(categoryStats)
    .map(([name, stats]) => ({
      name,
      passRate: (stats.passed / stats.total) * 100,
      count: stats.total
    }))
    .sort((a, b) => b.passRate - a.passRate)

  // 체인별 통과율 계산
  const chainStats = proposals.reduce((acc, proposal) => {
    const chain = proposal.chain
    if (!acc[chain]) {
      acc[chain] = { total: 0, passed: 0 }
    }
    acc[chain].total++
    if (proposal.passed) {
      acc[chain].passed++
    }
    return acc
  }, {} as Record<string, { total: number; passed: number }>)

  const chains = Object.entries(chainStats)
    .map(([name, stats]) => ({
      name,
      proposals: stats.total,
      passRate: (stats.passed / stats.total) * 100
    }))
    .sort((a, b) => b.proposals - a.proposals)

  // 연도별 트렌드 계산
  const yearStats = proposals.reduce((acc, proposal) => {
    const year = new Date(proposal.timestamp).getFullYear()
    if (!acc[year]) {
      acc[year] = { total: 0, passed: 0 }
    }
    acc[year].total++
    if (proposal.passed) {
      acc[year].passed++
    }
    return acc
  }, {} as Record<number, { total: number; passed: number }>)

  const trends = Object.entries(yearStats)
    .map(([year, stats]) => ({
      year: Number(year),
      count: stats.total,
      passRate: (stats.passed / stats.total) * 100
    }))
    .sort((a, b) => a.year - b.year)

  // 카테고리 계층 구조 생성 (기본 카테고리 -> 상세 카테고리)
  const categoryHierarchy = Object.entries(categoryStats).map(([categoryName, categoryStats]) => {
    // 해당 카테고리의 모든 토픽 수집
    const topicStats = proposals
      .filter(p => p.high_level_category === categoryName)
      .reduce((acc, proposal) => {
        const topic = proposal.topic_subject || 'Unknown'
        if (!acc[topic]) {
          acc[topic] = { total: 0, passed: 0 }
        }
        acc[topic].total++
        if (proposal.passed) {
          acc[topic].passed++
        }
        return acc
      }, {} as Record<string, { total: number; passed: number }>)

    const topics = Object.entries(topicStats)
      .map(([name, stats]) => ({
        name,
        count: stats.total,
        passRate: (stats.passed / stats.total) * 100
      }))
      .sort((a, b) => b.count - a.count)

    return {
      name: categoryName,
      count: categoryStats.total,
      passRate: (categoryStats.passed / categoryStats.total) * 100,
      topics
    }
  }).sort((a, b) => b.count - a.count)

  return { categories, categoryHierarchy, chains, trends }
}

// 프로포절별 투표 분포 계산
export function calculateProposalVoteDistribution(proposals: Proposal[], votes: Vote[]) {
  // 프로포절별 투표 그룹화
  const votesByProposal = votes.reduce((acc, vote) => {
    if (!acc[vote.proposal_id]) {
      acc[vote.proposal_id] = []
    }
    acc[vote.proposal_id].push(vote)
    return acc
  }, {} as Record<string, Vote[]>)

  return proposals.map(proposal => {
    const proposalVotes = votesByProposal[proposal.proposal_id] || []
    
    // 투표 옵션별 투표력 합계 계산
    const voteDistribution = proposalVotes.reduce((acc, vote) => {
      if (!acc[vote.vote_option]) {
        acc[vote.vote_option] = 0
      }
      acc[vote.vote_option] += vote.voting_power
      return acc
    }, {} as Record<string, number>)

    // 전체 투표력 계산
    const totalVotingPower = Object.values(voteDistribution).reduce((sum, power) => sum + power, 0)

    // 비율로 변환 (합이 1이 되도록)
    const normalizedDistribution = {
      'YES': (voteDistribution['YES'] || 0) / totalVotingPower || 0,
      'NO': (voteDistribution['NO'] || 0) / totalVotingPower || 0,
      'ABSTAIN': (voteDistribution['ABSTAIN'] || 0) / totalVotingPower || 0,
      'NO_WITH_VETO': (voteDistribution['NO_WITH_VETO'] || 0) / totalVotingPower || 0,
      'NO_VOTE': (voteDistribution['NO_VOTE'] || 0) / totalVotingPower || 0
    }

    // 투표가 없는 경우 기본값 설정
    if (totalVotingPower === 0) {
      normalizedDistribution.YES = 0.2
      normalizedDistribution.NO = 0.2
      normalizedDistribution.ABSTAIN = 0.2
      normalizedDistribution.NO_WITH_VETO = 0.2
      normalizedDistribution.NO_VOTE = 0.2
    }

    return {
      proposal,
      votes: normalizedDistribution,
      totalVotes: proposalVotes.length,
      totalVotingPower,
              date: new Date(proposal.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      title: proposal.title.length > 30 ? proposal.title.substring(0, 30) + '...' : proposal.title
    }
  })
}

// 검증인 분석용 데이터 처리
export function processValidatorData(validators: Validator[], votes: Vote[], proposals: Proposal[] = []) {
  console.log('processValidatorData: Starting processing...', {
    validators: validators.length,
    votes: votes.length
  })
  
  // 디버깅: 첫 번째 몇 개의 검증인과 투표 샘플 출력
  console.log('processValidatorData: Sample validators:', validators.slice(0, 3))
  console.log('processValidatorData: Sample votes:', votes.slice(0, 3))
  
  // 고유한 validator_id 확인
  const uniqueValidatorIds = new Set(validators.map(v => v.validator_id))
  const uniqueVoteValidatorIds = new Set(votes.map(v => v.validator_id))
  console.log('processValidatorData: Unique validator IDs in validators:', uniqueValidatorIds.size)
  console.log('processValidatorData: Unique validator IDs in votes:', uniqueVoteValidatorIds.size)
  
  // 교집합 확인
  const intersection = new Set([...uniqueValidatorIds].filter(id => uniqueVoteValidatorIds.has(id)))
  console.log('processValidatorData: Validator IDs with votes:', intersection.size)
  
  try {
    // 검증인별 투표 파워 계산
    console.log('processValidatorData: Calculating validator power...')
    const validatorPower = votes.reduce((acc, vote) => {
      if (!acc[vote.validator_id]) {
        acc[vote.validator_id] = { totalPower: 0, voteCount: 0 }
      }
      acc[vote.validator_id].totalPower += vote.voting_power
      acc[vote.validator_id].voteCount++
      return acc
    }, {} as Record<string, { totalPower: number; voteCount: number }>)
    
    console.log('processValidatorData: Validator power calculated for', Object.keys(validatorPower).length, 'validators')
    console.log('processValidatorData: Sample validator power:', Object.entries(validatorPower).slice(0, 3))

    // 검증인별 활동 및 영향력 통계 계산
    console.log('processValidatorData: Calculating activity and influence statistics...')
    
    // 제안별 결과 매핑
    const proposalResults = proposals.reduce((acc, proposal) => {
      acc[proposal.proposal_id] = proposal.passed
      return acc
    }, {} as Record<string, boolean>)
    
    const voteStats = votes.reduce((acc, vote) => {
      if (!acc[vote.validator_id]) {
        acc[vote.validator_id] = {
          totalVotes: 0,
          firstTimestamp: Infinity,
          lastTimestamp: 0,
          recentVotes: [],
          votingPowerHistory: [],
          influenceMatches: 0 // 의도대로 결과가 나온 횟수
        }
      }
      
      const stats = acc[vote.validator_id]
      stats.totalVotes++
      stats.firstTimestamp = Math.min(stats.firstTimestamp, vote.timestamp)
      stats.lastTimestamp = Math.max(stats.lastTimestamp, vote.timestamp)
      
      // 투표력 변화 기록
      stats.votingPowerHistory.push({
        timestamp: vote.timestamp,
        power: vote.voting_power
      })
      
      // 영향력 계산: 검증인의 의도와 실제 결과가 일치하는지 확인
      const proposalPassed = proposalResults[vote.proposal_id]
      if (proposalPassed !== undefined) {
        const validatorIntention = vote.vote_option === 'YES' ? true : 
                                 vote.vote_option === 'NO' || vote.vote_option === 'NO_WITH_VETO' ? false : 
                                 null // ABSTAIN이나 NO_VOTE는 중립
        
        if (validatorIntention !== null && validatorIntention === proposalPassed) {
          stats.influenceMatches++
        }
      }
      
      // 최근 투표 기록
      stats.recentVotes.push({
        proposal: vote.proposal_id,
        vote: vote.vote_option,
        timestamp: vote.timestamp
      })
      
      return acc
    }, {} as Record<string, {
      totalVotes: number
      firstTimestamp: number
      lastTimestamp: number
      recentVotes: Array<{ proposal: string; vote: string; timestamp: number }>
      votingPowerHistory: Array<{ timestamp: number; power: number }>
      influenceMatches: number
    }>)
    
    console.log('processValidatorData: Vote statistics calculated for', Object.keys(voteStats).length, 'validators')

    // 검증인 데이터 결합
    console.log('processValidatorData: Processing validator data...')
    const processedValidators = validators.map((validator, index) => {
      if (index % 1000 === 0) {
        console.log(`processValidatorData: Processing validator ${index}/${validators.length}`)
      }
      
      try {
        const power = validatorPower[validator.validator_id]
        const stats = voteStats[validator.validator_id]
        
        // 최근 투표력 사용 (가장 최근 투표의 투표력)
        const recentPower = stats?.votingPowerHistory && stats.votingPowerHistory.length > 0 ?
          stats.votingPowerHistory
            .sort((a, b) => b.timestamp - a.timestamp)[0].power : 0
        
        // 디버깅: 첫 번째 몇 개의 검증인에 대해 자세한 정보 출력
        if (index < 5) {
          console.log(`processValidatorData: Validator ${index}:`, {
            validator_id: validator.validator_id,
            voter_name: validator.voter_name,
            hasPower: !!power,
            recentPower,
            totalVotes: stats?.totalVotes || 0
          })
        }
        
        // 활동 기간 계산
        const firstVoteDate = stats?.firstTimestamp && stats.firstTimestamp !== Infinity ? 
          new Date(stats.firstTimestamp).toLocaleDateString('en-US') : undefined
        const lastVoteDate = stats?.lastTimestamp ? 
                      new Date(stats.lastTimestamp).toLocaleDateString('en-US') : undefined
        const activePeriodDays = stats?.firstTimestamp && stats?.lastTimestamp && stats.firstTimestamp !== Infinity ?
          Math.ceil((stats.lastTimestamp - stats.firstTimestamp) / (1000 * 60 * 60 * 24)) : undefined
        
        // 영향력 비율 계산 (의도대로 결과가 나온 비율)
        const influenceRate = stats?.totalVotes ? (stats.influenceMatches / stats.totalVotes) * 100 : 0
        
        // 참여율 계산 (해당 체인의 전체 제안 대비)
        const chainProposals = proposals.filter(p => p.chain === validator.chain)
        const participationRate = chainProposals.length > 0 ? 
          ((stats?.totalVotes || 0) / chainProposals.length) * 100 : 0
        
        // 투표력 변화 추이 (최대 10개 포인트로 샘플링)
        const votingPowerTrend = stats?.votingPowerHistory ? 
          stats.votingPowerHistory
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter((_, index, array) => index % Math.max(1, Math.floor(array.length / 10)) === 0)
            .slice(0, 10)
            .map(item => ({
              date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              power: item.power
            })) : []
        
        return {
          ...validator,
          voter_name: validator.voter_name || 'Unknown', // null 값 처리
          votingPower: recentPower, // 최근 투표력 사용 (이미 0-1 범위의 비율)
          similarity: 0,
          priority: 0,
          // 활동 및 영향력 통계
          totalVotes: stats?.totalVotes || 0,
          firstVoteDate,
          lastVoteDate,
          activePeriodDays,
          influenceRate,
          participationRate,
          votingPowerTrend,
          recentVotes: (stats?.recentVotes || [])
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map((v: any) => ({ proposal: v.proposal, vote: v.vote }))
        }
      } catch (validatorError) {
        console.warn(`processValidatorData: Error processing validator ${index}:`, validatorError)
        return null
      }
    }).filter((v: any) => v !== null) // null 값만 제거, 투표력이 0인 검증인도 포함

    console.log('processValidatorData: Processing complete. Filtered validators:', processedValidators.length)
    
    // 필터링된 검증인이 0개인 경우 추가 디버깅
    if (processedValidators.length === 0) {
      console.warn('processValidatorData: No validators with voting power found!')
      const validatorsWithPower = validators.filter(v => validatorPower[v.validator_id])
      console.log('processValidatorData: Validators with power before filtering:', validatorsWithPower.length)
      
      // 투표력이 0보다 큰 검증인 찾기
      const validatorsWithPositivePower = validators.map(v => {
        const power = validatorPower[v.validator_id]
        const avgPower = power ? power.totalPower / power.voteCount : 0
        return { ...v, avgPower }
      }).filter(v => v.avgPower > 0)
      
      console.log('processValidatorData: Validators with positive power:', validatorsWithPositivePower.length)
      console.log('processValidatorData: Sample validators with positive power:', validatorsWithPositivePower.slice(0, 3))
    }
    
    return processedValidators
  } catch (error) {
    console.error('processValidatorData: Critical error during processing:', error)
    throw error
  }
}

// 투표 패턴 유사도 계산
export function calculateSimilarity(baseValidator: string, targetValidator: string, votes: Vote[]): number {
  const baseVotes = votes.filter(v => v.validator_id === baseValidator)
  const targetVotes = votes.filter(v => v.validator_id === targetValidator)

  // 공통 프로포절에 대한 투표 찾기
  const commonProposals = new Set(baseVotes.map(v => v.proposal_id))
  const targetCommonVotes = targetVotes.filter(v => commonProposals.has(v.proposal_id))

  if (targetCommonVotes.length === 0) {
    return 0
  }

  // 동일한 투표 옵션 비율 계산
  let sameVotes = 0
  targetCommonVotes.forEach(targetVote => {
    const baseVote = baseVotes.find(v => v.proposal_id === targetVote.proposal_id)
    if (baseVote && baseVote.vote_option === targetVote.vote_option) {
      sameVotes++
    }
  })

  return sameVotes / targetCommonVotes.length
} 