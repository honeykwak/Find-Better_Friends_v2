import Papa from 'papaparse'

// 최적화된 데이터 구조 인터페이스
export interface OptimizedProposal {
  id: string // 짧은 ID (체인ID_원본ID)
  chain: string
  title: string
  type: string
  passed: boolean
  timestamp: number
  voting_start: number
  voting_end: number
  proposer: string
  category: string
  topic: string
}

export interface OptimizedValidator {
  id: string // 짧은 ID (체인ID_인덱스)
  chain: string
  address: string
  name: string
}

export interface OptimizedVote {
  proposal_short_id: number // 체인 내 상대 ID (실제 컬럼명)
  validator_short_id: number // 체인 내 상대 ID (실제 컬럼명)
  vote_code: number // 0: NO_VOTE, 1: YES, 2: NO, 3: ABSTAIN, 4: NO_WITH_VETO
  voting_power: number
  timestamp: number
  chain?: string // 선택적 체인 정보
}

export interface OptimizedData {
  proposals: OptimizedProposal[]
  validators: OptimizedValidator[]
  votes: OptimizedVote[]
  metadata: {
    chains: Record<string, number>
    vote_options: Record<number, string>
    structure_version: string
  }
}

// 메타데이터 로드
async function loadMetadata(): Promise<any> {
  try {
    const response = await fetch('/optimized_data/metadata.json')
    return await response.json()
  } catch (error) {
    console.error('Failed to load metadata:', error)
    throw error
  }
}

// JSON 파일 로드
async function loadJSON(url: string): Promise<any> {
  try {
    const response = await fetch(url)
    return await response.json()
  } catch (error) {
    console.error(`Failed to load JSON from ${url}:`, error)
    throw error
  }
}

// 최적화된 CSV 로드 (체인별)
async function loadOptimizedCSV<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url)
    const csvText = await response.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transform: (value, field) => {
          const fieldName = String(field || '')
          // 숫자 필드 변환 - 실제 컬럼명 사용
          if (['timestamp', 'voting_power', 'vote_code', 'proposal_short_id', 'validator_short_id'].includes(fieldName)) {
            return value === '' ? 0 : Number(value)
          }
          return value
        },
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors)
          }
          resolve(results.data as T[])
        },
        error: (error: any) => {
          reject(error)
        }
      })
    })
  } catch (error) {
    console.error(`Failed to load CSV from ${url}:`, error)
    throw error
  }
}

// 전체 데이터 로딩 함수 제거됨 - 개별 체인만 지원

// 특정 체인의 데이터만 로드 (성능 최적화)
export async function loadChainDataOnDemand(chainName: string): Promise<{
  proposals: OptimizedProposal[]
  validators: OptimizedValidator[]
  votes: OptimizedVote[]
}> {
  try {
    console.log(`optimizedDataLoader: Loading data for chain: ${chainName}`)
    
    const [metadata, validatorMapping, proposalMapping] = await Promise.all([
      loadMetadata(),
      loadJSON('/optimized_data/validators.json'),
      loadJSON('/optimized_data/proposals.json')
    ])

    // 체인별 votes 로드
    const fileName = chainName.toLowerCase().replace(' ', '_').replace('-', '_')
    const chainVotes = await loadOptimizedCSV<OptimizedVote>(
      `/optimized_data/votes/${fileName}_votes.csv`
    )
    
    // 해당 체인의 데이터만 필터링
    const chainProposals: OptimizedProposal[] = Object.entries(proposalMapping)
      .filter(([, data]: [string, any]) => data.chain.toLowerCase() === chainName.toLowerCase())
      .map(([id, data]: [string, any]) => ({
        id,
        chain: data.chain,
        title: data.title,
        type: data.type,
        passed: data.passed,
        timestamp: data.timestamp,
        voting_start: data.voting_start,
        voting_end: data.voting_end,
        proposer: data.proposer,
        category: data.category,
        topic: data.topic
      }))

    const chainValidators: OptimizedValidator[] = Object.entries(validatorMapping)
      .filter(([, data]: [string, any]) => data.chain.toLowerCase() === chainName.toLowerCase())
      .map(([id, data]: [string, any]) => ({
        id,
        chain: data.chain,
        address: data.address,
        name: data.name
      }))

    // 체인 정보를 votes에 추가
    chainVotes.forEach(vote => {
      vote.chain = chainName
    })

    console.log(`optimizedDataLoader: Loaded ${chainName} data:`, {
      proposals: chainProposals.length,
      validators: chainValidators.length,
      votes: chainVotes.length
    })

    return {
      proposals: chainProposals,
      validators: chainValidators,
      votes: chainVotes
    }
    
  } catch (error) {
    console.error(`optimizedDataLoader: Failed to load data for ${chainName}:`, error)
    throw error
  }
}

// 다중 체인 데이터 로딩 함수 제거됨 - 단일 체인만 지원

// 투표 옵션 디코딩
export function decodeVoteOption(voteCode: number, metadata: any): string {
  return metadata.vote_options[voteCode] || 'UNKNOWN'
}

// 체인 이름 디코딩
export function decodeChainName(chainId: number, metadata: any): string {
  const chainEntry = Object.entries(metadata.chains).find(([_, id]) => id === chainId)
  return chainEntry ? chainEntry[0] : 'UNKNOWN'
}

// 기존 dataLoader와 호환성을 위한 변환 함수
export function convertToLegacyFormat(optimizedData: OptimizedData): {
  proposals: any[];
  validators: any[];
  votes: any[];
} {
  console.log('convertToLegacyFormat: Starting conversion...');

  const { proposals, validators, votes, metadata } = optimizedData;
  const chainToId = metadata.chains;

  const legacyProposals = proposals.map(p => {
    const chainId = chainToId[p.chain];
    const shortId = p.id.includes('_') ? p.id.split('_')[1] : p.id;
    return {
      proposal_id: `${chainId}_${shortId}`,
      chain: p.chain,
      original_id: p.id,
      title: p.title,
      type: p.type,
      status: p.passed ? 'PASSED' : 'FAILED',
      timestamp: p.timestamp,
      voting_start: p.voting_start,
      voting_end: p.voting_end,
      tx_hash: '',
      proposer: p.proposer,
      high_level_category: p.category,
      topic_subject: p.topic,
      passed: p.passed
    };
  });

  const legacyValidators = validators.map(v => {
    const chainId = chainToId[v.chain];
    const shortId = v.id.includes('_') ? v.id.split('_')[1] : v.id;
    return {
      validator_id: `${chainId}_${shortId}`,
      chain: v.chain,
      validator_address: v.address,
      voter_name: v.name
    };
  });

  const legacyVotes = votes.map(v => {
    if (!v.chain) return null;
    const chainId = chainToId[v.chain];
    if (chainId === undefined) return null;

    const globalValidatorId = `${chainId}_${v.validator_short_id}`;
    const globalProposalId = `${chainId}_${v.proposal_short_id}`;

    return {
      proposal_id: globalProposalId,
      validator_id: globalValidatorId,
      vote_code: v.vote_code,
      voting_power: v.voting_power,
      timestamp: v.timestamp,
      tx_hash: ''
    };
  }).filter(v => v !== null);

  return { proposals: legacyProposals, validators: legacyValidators, votes: legacyVotes };
}

// 성능 통계
export function getOptimizationStats() {
  return {
    originalSize: '52.04 MB',
    optimizedSize: '11.6 MB',
    savings: '40.5 MB (77.8%)',
    features: [
      '체인별 파일 분할로 중복 제거',
      'ID 단축으로 용량 절약',
      '투표 옵션 숫자 코드화',
      '불필요한 컬럼 제거',
      'JSON 메타데이터 활용'
    ]
  }
} 