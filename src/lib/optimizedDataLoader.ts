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

// 모든 최적화된 데이터 로드
export async function loadOptimizedData(): Promise<OptimizedData> {
  try {
    console.log('optimizedDataLoader: Loading optimized data...')
    
    // 메타데이터 로드
    console.log('optimizedDataLoader: Loading metadata...')
    const metadata = await loadMetadata()
    console.log('optimizedDataLoader: Metadata loaded:', metadata)
    
    // 매핑 데이터 로드
    console.log('optimizedDataLoader: Loading mapping data...')
    const [validatorMapping, proposalMapping] = await Promise.all([
      loadJSON('/optimized_data/validators.json'),
      loadJSON('/optimized_data/proposals.json')
    ])
    console.log('optimizedDataLoader: Mapping data loaded:', {
      validators: Object.keys(validatorMapping).length,
      proposals: Object.keys(proposalMapping).length
    })
    
    // 체인별 votes 로드
    const chainNames = Object.keys(metadata.chains)
    console.log('optimizedDataLoader: Loading votes for chains:', chainNames)
    const allVotes: OptimizedVote[] = []
    
    for (const chainName of chainNames) {
      try {
        // 체인명을 파일명에 맞게 변환
        const fileName = chainName.toLowerCase().replace(' ', '_').replace('-', '_')
        console.log(`optimizedDataLoader: Loading votes for ${chainName} (${fileName})...`)
        const chainVotes = await loadOptimizedCSV<OptimizedVote>(
          `/optimized_data/votes/${fileName}_votes.csv`
        )
        
        // 체인 정보를 votes에 추가 (필요시)
        chainVotes.forEach(vote => {
          vote.chain = chainName
        })
        
        allVotes.push(...chainVotes)
        console.log(`optimizedDataLoader: Loaded ${chainVotes.length} votes for ${chainName}`)
      } catch (error) {
        console.warn(`optimizedDataLoader: Failed to load votes for ${chainName}:`, error)
      }
    }
    
    console.log('optimizedDataLoader: Converting mapping data to arrays...')
    // 매핑 데이터를 배열로 변환
    const proposals: OptimizedProposal[] = Object.entries(proposalMapping).map(([id, data]: [string, any]) => ({
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
    
    const validators: OptimizedValidator[] = Object.entries(validatorMapping).map(([id, data]: [string, any]) => ({
      id,
      chain: data.chain,
      address: data.address,
      name: data.name
    }))
    
    console.log('optimizedDataLoader: Optimized data loaded:', {
      proposals: proposals.length,
      validators: validators.length,
      votes: allVotes.length,
      chains: chainNames.length
    })
    
    return {
      proposals,
      validators,
      votes: allVotes,
      metadata
    }
    
  } catch (error) {
    console.error('optimizedDataLoader: Failed to load optimized data:', error)
    throw error
  }
}

// 특정 체인의 데이터만 로드 (성능 최적화)
export async function loadChainData(chainName: string): Promise<{
  proposals: OptimizedProposal[]
  validators: OptimizedValidator[]
  votes: OptimizedVote[]
}> {
  try {
    const [metadata, validatorMapping, proposalMapping] = await Promise.all([
      loadMetadata(),
      loadJSON('/optimized_data/validators.json'),
      loadJSON('/optimized_data/proposals.json')
    ])
    
    // 해당 체인의 votes만 로드
    const fileName = chainName.toLowerCase().replace(' ', '_').replace('-', '_')
    const chainVotes = await loadOptimizedCSV<OptimizedVote>(
      `/optimized_data/votes/${fileName}_votes.csv`
    )
    
    // 해당 체인의 proposals와 validators 필터링
    const chainProposals = Object.entries(proposalMapping)
      .filter(([_, data]: [string, any]) => data.chain === chainName)
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
    
    const chainValidators = Object.entries(validatorMapping)
      .filter(([_, data]: [string, any]) => data.chain === chainName)
      .map(([id, data]: [string, any]) => ({
        id,
        chain: data.chain,
        address: data.address,
        name: data.name
      }))
    
    return {
      proposals: chainProposals,
      validators: chainValidators,
      votes: chainVotes
    }
    
  } catch (error) {
    console.error(`Failed to load data for chain ${chainName}:`, error)
    throw error
  }
}

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
export function convertToLegacyFormat(optimizedData: OptimizedData) {
  console.log('convertToLegacyFormat: Starting conversion...')
  
  // 체인명을 체인 ID로 매핑
  const chainToId = optimizedData.metadata.chains
  
  return {
    proposals: optimizedData.proposals.map(p => ({
      proposal_id: p.id,
      chain: p.chain,
      original_id: p.id.split('_')[1],
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
    })),
    validators: optimizedData.validators.map(v => ({
      validator_id: v.id,
      chain: v.chain,
      validator_address: v.address,
      voter_name: v.name
    })),
    votes: optimizedData.votes.map(v => {
      // 체인 정보가 없으면 스킵
      if (!v.chain) {
        return null
      }
      
      // 체인 ID 가져오기
      const chainId = chainToId[v.chain]
      if (chainId === undefined) {
        console.warn(`Unknown chain: ${v.chain}`)
        return null
      }
      
      // 전역 ID 생성: chainId_shortId 형식
      const globalValidatorId = `${chainId}_${v.validator_short_id}`
      const globalProposalId = `${chainId}_${v.proposal_short_id}`
      
      return {
        proposal_id: globalProposalId,
        validator_id: globalValidatorId,
        vote_option: decodeVoteOption(v.vote_code, optimizedData.metadata),
        voting_power: v.voting_power,
        timestamp: v.timestamp,
        tx_hash: ''
      }
    }).filter(v => v !== null) // null 값 제거
  }
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