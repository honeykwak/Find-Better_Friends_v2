/**
 * Validator Visualization Data Loader - Full Data Version
 * 전체 데이터를 위한 최적화된 검증인 시각화 데이터 로더
 * 
 * 특징:
 * 1. 모든 검증인, 모든 프로포절 데이터 포함
 * 2. 해시맵 기반 빠른 조회
 * 3. 인덱스 기반 필터링
 * 4. 메모리 효율적인 처리
 */

// 타입 정의 (전체 데이터)
export interface ValidatorVizProposalFull {
  id: string
  title: string
  chain: string
  date: string
  category: string
  topic: string
  passed: boolean
  voting_start: string
  voting_end: string
}

export interface ValidatorVizValidatorFull {
  id: string
  name: string
  chain: string
  total_power: number
  avg_power: number
  vote_count: number
}

export interface VoteInfoFull {
  option: string
  power: number
  value: number
  timestamp: string
}

export interface HeatmapDataFull {
  proposals: ValidatorVizProposalFull[]
  validators: ValidatorVizValidatorFull[]
  vote_lookup: { [key: string]: VoteInfoFull }  // "validator_id_proposal_id" -> vote_info
  metadata: {
    proposal_count: number
    validator_count: number
    total_votes: number
    coverage: number
    actual_votes: number
    possible_votes: number
    optimization_level: string
  }
}

export interface ChainIndex {
  [chainName: string]: {
    proposal_ids: string[]
    validator_ids: string[]
    proposal_count: number
    validator_count: number
    vote_count: number
    pass_rate: number
    date_range: {
      start: string
      end: string
    }
    categories: { [category: string]: number }
    topics: { [topic: string]: number }
  }
}

export interface CategoryIndex {
  [categoryName: string]: {
    proposal_ids: string[]
    proposal_count: number
    pass_rate: number
    chains: { [chain: string]: number }
    topics: { [topic: string]: number }
  }
}

export interface SimilarityMatrixFull {
  similarity_matrix: {
    [validatorId: string]: {
      [targetValidatorId: string]: {
        similarity: number
        common_votes: number
        total_votes_a: number
        total_votes_b: number
      }
    }
  }
  total_validators_analyzed: number
  min_common_votes: number
  optimization_level: string
}

export interface ValidatorVizMetadataFull {
  generated_at: string
  data_version: string
  optimization_level: string
  files: Record<string, string>
  data_coverage: {
    proposals: string
    validators: string
    votes: string
    similarity_analysis: string
  }
  statistics: {
    total_proposals: number
    total_validators: number
    total_votes: number
    chains: number
    categories: number
    topics: number
  }
  performance_optimizations: string[]
}

// 필터 옵션
export interface FilterOptions {
  chains?: string[]
  categories?: string[]
  topics?: string[]
  validators?: string[]
  searchTerm?: string
  dateRange?: {
    start: string
    end: string
  }
  passedOnly?: boolean
}

// 전체 데이터 로더 클래스
export class ValidatorVisualizationLoaderFull {
  private baseUrl: string
  private cache: Map<string, any> = new Map()
  private loadingStates: Map<string, Promise<any>> = new Map()

  constructor(baseUrl: string = '/data/validator_viz_full') {
    this.baseUrl = baseUrl
  }

  /**
   * JSON 파일 로드 (캐싱 + 중복 요청 방지)
   */
  private async loadJson<T>(filename: string): Promise<T> {
    // 캐시에서 확인
    if (this.cache.has(filename)) {
      return this.cache.get(filename)
    }

    // 이미 로딩 중인지 확인
    if (this.loadingStates.has(filename)) {
      return this.loadingStates.get(filename)
    }

    // 새로운 로딩 시작
    const loadingPromise = this._fetchJson<T>(filename)
    this.loadingStates.set(filename, loadingPromise)

    try {
      const data = await loadingPromise
      this.cache.set(filename, data)
      this.loadingStates.delete(filename)
      return data
    } catch (error) {
      this.loadingStates.delete(filename)
      throw error
    }
  }

  private async _fetchJson<T>(filename: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}/${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`Error loading ${filename}:`, error)
      throw error
    }
  }

  /**
   * 전체 히트맵 데이터 로드
   */
  async loadHeatmapData(): Promise<HeatmapDataFull> {
    return this.loadJson<HeatmapDataFull>('heatmap_data_full.json')
  }

  /**
   * 체인 인덱스 로드
   */
  async loadChainIndex(): Promise<ChainIndex> {
    return this.loadJson<ChainIndex>('chain_index.json')
  }

  /**
   * 카테고리 인덱스 로드
   */
  async loadCategoryIndex(): Promise<CategoryIndex> {
    return this.loadJson<CategoryIndex>('category_index.json')
  }

  /**
   * 유사도 매트릭스 로드
   */
  async loadSimilarityMatrix(): Promise<SimilarityMatrixFull> {
    return this.loadJson<SimilarityMatrixFull>('similarity_matrix_full.json')
  }

  /**
   * 메타데이터 로드
   */
  async loadMetadata(): Promise<ValidatorVizMetadataFull> {
    return this.loadJson<ValidatorVizMetadataFull>('metadata_full.json')
  }

  /**
   * 기본 데이터 로드 (히트맵 + 인덱스)
   */
  async loadBasicData() {
    const [heatmapData, chainIndex, categoryIndex, metadata] = await Promise.all([
      this.loadHeatmapData(),
      this.loadChainIndex(),
      this.loadCategoryIndex(),
      this.loadMetadata()
    ])

    return { heatmapData, chainIndex, categoryIndex, metadata }
  }

  /**
   * 모든 데이터 로드
   */
  async loadAllData() {
    const [heatmapData, chainIndex, categoryIndex, similarityMatrix, metadata] = await Promise.all([
      this.loadHeatmapData(),
      this.loadChainIndex(),
      this.loadCategoryIndex(),
      this.loadSimilarityMatrix(),
      this.loadMetadata()
    ])

    return {
      heatmapData,
      chainIndex,
      categoryIndex,
      similarityMatrix,
      metadata
    }
  }

  /**
   * 필터링된 히트맵 데이터 생성 (최적화된 처리)
   */
  filterHeatmapData(
    data: HeatmapDataFull,
    filters: FilterOptions,
    chainIndex?: ChainIndex,
    categoryIndex?: CategoryIndex
  ): {
    proposals: ValidatorVizProposalFull[]
    validators: ValidatorVizValidatorFull[]
    filteredVoteLookup: { [key: string]: VoteInfoFull }
    metadata: any
  } {
    let filteredProposalIds = new Set<string>()
    let filteredValidatorIds = new Set<string>()

    // 1. 체인 필터 (인덱스 사용)
    if (filters.chains && filters.chains.length > 0 && chainIndex) {
      for (const chain of filters.chains) {
        if (chainIndex[chain]) {
          chainIndex[chain].proposal_ids.forEach(id => filteredProposalIds.add(id))
          chainIndex[chain].validator_ids.forEach(id => filteredValidatorIds.add(id))
        }
      }
    } else {
      // 모든 프로포절/검증인
      data.proposals.forEach(p => filteredProposalIds.add(p.id))
      data.validators.forEach(v => filteredValidatorIds.add(v.id))
    }

    // 2. 카테고리 필터 (인덱스 사용)
    if (filters.categories && filters.categories.length > 0 && categoryIndex) {
      const categoryProposalIds = new Set<string>()
      for (const category of filters.categories) {
        if (categoryIndex[category]) {
          categoryIndex[category].proposal_ids.forEach(id => categoryProposalIds.add(id))
        }
      }
      // 교집합
      filteredProposalIds = new Set([...filteredProposalIds].filter(id => categoryProposalIds.has(id)))
    }

    // 3. 토픽 필터
    if (filters.topics && filters.topics.length > 0) {
      filteredProposalIds = new Set([...filteredProposalIds].filter(id => {
        const proposal = data.proposals.find(p => p.id === id)
        return proposal && filters.topics!.includes(proposal.topic)
      }))
    }

    // 4. 검색어 필터 (검증인 이름)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filteredValidatorIds = new Set([...filteredValidatorIds].filter(id => {
        const validator = data.validators.find(v => v.id === id)
        return validator && validator.name.toLowerCase().includes(searchLower)
      }))
    }

    // 5. 날짜 범위 필터
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      
      filteredProposalIds = new Set([...filteredProposalIds].filter(id => {
        const proposal = data.proposals.find(p => p.id === id)
        if (!proposal) return false
        const proposalDate = new Date(proposal.date)
        return proposalDate >= startDate && proposalDate <= endDate
      }))
    }

    // 6. 통과 여부 필터
    if (filters.passedOnly) {
      filteredProposalIds = new Set([...filteredProposalIds].filter(id => {
        const proposal = data.proposals.find(p => p.id === id)
        return proposal && proposal.passed
      }))
    }

    // 필터링된 데이터 생성
    const filteredProposals = data.proposals.filter(p => filteredProposalIds.has(p.id))
    const filteredValidators = data.validators.filter(v => filteredValidatorIds.has(v.id))

    // 필터링된 투표 조회 테이블 생성
    const filteredVoteLookup: { [key: string]: VoteInfoFull } = {}
    
    for (const validatorId of filteredValidatorIds) {
      for (const proposalId of filteredProposalIds) {
        const key = `${validatorId}_${proposalId}`
        if (data.vote_lookup[key]) {
          filteredVoteLookup[key] = data.vote_lookup[key]
        }
      }
    }

    // 메타데이터 계산
    const totalCells = filteredValidators.length * filteredProposals.length
    const filledCells = Object.keys(filteredVoteLookup).length
    const coverage = totalCells > 0 ? filledCells / totalCells : 0

    return {
      proposals: filteredProposals,
      validators: filteredValidators,
      filteredVoteLookup,
      metadata: {
        proposal_count: filteredProposals.length,
        validator_count: filteredValidators.length,
        coverage,
        actual_votes: filledCells,
        possible_votes: totalCells,
        filters_applied: filters
      }
    }
  }

  /**
   * 검증인 유사도 기반 정렬
   */
  sortValidatorsBySimilarity(
    validators: ValidatorVizValidatorFull[],
    similarityMatrix: SimilarityMatrixFull,
    baseValidatorId: string
  ): ValidatorVizValidatorFull[] {
    const baseValidator = validators.find(v => v.id === baseValidatorId)
    if (!baseValidator) return validators

    const similarities = similarityMatrix.similarity_matrix[baseValidatorId] || {}
    
    const sortedValidators = validators
      .filter(v => v.id !== baseValidatorId)
      .map(validator => ({
        ...validator,
        similarity: similarities[validator.id]?.similarity || 0
      }))
      .sort((a, b) => b.similarity - a.similarity)

    return [baseValidator, ...sortedValidators]
  }

  /**
   * 히트맵 매트릭스 생성 (최적화)
   */
  generateHeatmapMatrix(
    proposals: ValidatorVizProposalFull[],
    validators: ValidatorVizValidatorFull[],
    voteLookup: { [key: string]: VoteInfoFull },
    maxValidators: number = 50,
    maxProposals: number = 100
  ): {
    z: (number | null)[][]
    customdata: any[][]
    displayValidators: ValidatorVizValidatorFull[]
    displayProposals: ValidatorVizProposalFull[]
  } {
    console.log('🔥 HEATMAP_MATRIX_DEBUG:', {
      totalValidators: validators.length,
      totalProposals: proposals.length,
      maxValidators,
      maxProposals
    })
    
    // 표시할 데이터 제한 (성능 고려)
    const displayValidators = validators.slice(0, maxValidators)
    const displayProposals = proposals.slice(-maxProposals) // 최근 프로포절
    
    console.log('🔥 AFTER_SLICING:', {
      displayValidators: displayValidators.length,
      displayProposals: displayProposals.length
    })

    const z: (number | null)[][] = []
    const customdata: any[][] = []

    displayValidators.forEach((validator) => {
      const row: (number | null)[] = []
      const customRow: any[] = []

      displayProposals.forEach((proposal) => {
        const key = `${validator.id}_${proposal.id}`
        const voteInfo = voteLookup[key]

         if (voteInfo) {
           // 실제 투표 데이터가 있는 경우만 색상 표시
           row.push(voteInfo.value)
           customRow.push({
             validator: validator.name,
             proposal: proposal.title,
             vote: voteInfo.option,
             power: voteInfo.power.toFixed(4),
             date: proposal.date,
             chain: proposal.chain,
             category: proposal.category,
             topic: proposal.topic
           })
         } else {
           // 투표 데이터가 없는 경우 - null로 공란 처리
           row.push(null)
           customRow.push({
             validator: validator.name,
             proposal: proposal.title,
             vote: 'NO_DATA',
             power: 'N/A',
             date: proposal.date,
             chain: proposal.chain,
             category: proposal.category,
             topic: proposal.topic
           })
         }
      })

      z.push(row)
      customdata.push(customRow)
    })

    return {
      z,
      customdata,
      displayValidators,
      displayProposals
    }
  }

  /**
   * 성능 모니터링
   */
  getPerformanceStats(): {
    cacheSize: number
    cachedFiles: string[]
    loadingFiles: string[]
    totalMemoryUsage: string
  } {
    // 대략적인 메모리 사용량 계산
    let totalSize = 0
    this.cache.forEach((data) => {
      totalSize += JSON.stringify(data).length
    })

    return {
      cacheSize: this.cache.size,
      cachedFiles: Array.from(this.cache.keys()),
      loadingFiles: Array.from(this.loadingStates.keys()),
      totalMemoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    }
  }

  /**
   * 캐시 관리
   */
  clearCache(): void {
    this.cache.clear()
    this.loadingStates.clear()
  }

  /**
   * 선택적 캐시 클리어
   */
  clearCacheExcept(keepFiles: string[]): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => !keepFiles.includes(key))
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// 싱글톤 인스턴스
export const validatorVizLoaderFull = new ValidatorVisualizationLoaderFull()

// 편의 함수들
export async function loadValidatorHeatmapDataFull(): Promise<HeatmapDataFull> {
  return validatorVizLoaderFull.loadHeatmapData()
}

export async function loadValidatorBasicDataFull() {
  return validatorVizLoaderFull.loadBasicData()
}

export async function loadValidatorAllDataFull() {
  return validatorVizLoaderFull.loadAllData()
} 