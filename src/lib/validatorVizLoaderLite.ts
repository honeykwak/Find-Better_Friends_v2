/**
 * Validator Visualization Data Loader - Lite Version
 * 경량화된 검증인 시각화를 위한 최적화된 데이터 로더
 * 
 * 우선순위:
 * 1. 기본 히트맵 시각화 (최우선) - 0.14MB
 * 2. 간트차트 (선택적) - 0.02MB  
 * 3. 유사도 분석 (선택적) - 0.01MB
 */

// 타입 정의 (경량화)
export interface ValidatorVizProposalLite {
  id: string
  title: string  // 30자 제한
  chain: string
  date: string
  category: string
  passed: boolean
}

export interface ValidatorVizValidatorLite {
  id: string
  name: string  // 20자 제한
  chain: string
  power: number
}

export interface VoteInfoLite {
  option: string
  power: number
  value: number
}

export interface HeatmapDataLite {
  proposals: ValidatorVizProposalLite[]  // 최대 100개
  validators: ValidatorVizValidatorLite[]  // 최대 30개
  matrix: VoteInfoLite[][]  // [validator_index][proposal_index]
  metadata: {
    proposal_count: number
    validator_count: number
    coverage: number
    optimization_level: 'lite'
  }
}

export interface GanttProposalLite {
  proposal_id: string
  chain: string
  title: string  // 50자 제한
  category: string
  voting_start: string
  voting_end: string
  duration_hours: number
  passed: boolean
  vote_summary: Record<string, number>  // 상세 투표 대신 요약
  total_votes: number
}

export interface GanttDataLite {
  time_range: {
    start: string
    end: string
    duration_days: number
  }
  top_validators: Array<{
    validator_id: string
    chain: string
    voter_name: string
  }>
  proposals: GanttProposalLite[]  // 최대 50개
  optimization_level: 'lite'
}

export interface SimilarityIndexLite {
  similarity_matrix: {
    [validatorId: string]: {
      [targetValidatorId: string]: {
        similarity: number
        common_votes: number
      }
    }
  }
  optimization_level: 'lite'
  total_validators_analyzed: number
  similarity_threshold: number
}

export interface ChainSummaryLite {
  proposal_count: number
  validator_count: number
  pass_rate: number
  date_range: {
    start: string
    end: string
  }
}

export interface ChainSummariesLite {
  [chainName: string]: ChainSummaryLite
}

export interface ValidatorVizMetadataLite {
  generated_at: string
  data_version: string
  optimization_level: 'lite'
  files: Record<string, string>
  limitations: {
    max_proposals_heatmap: number
    max_validators_heatmap: number
    max_proposals_gantt: number
    max_validators_similarity: number
    similarity_threshold: number
  }
  statistics: {
    total_proposals: number
    total_validators: number
    total_votes: number
    chains: number
  }
}

// 경량화된 데이터 로더 클래스
export class ValidatorVisualizationLoaderLite {
  private baseUrl: string
  private cache: Map<string, any> = new Map()
  private loadingStates: Map<string, Promise<any>> = new Map()

  constructor(baseUrl: string = '/data/validator_viz_lite') {
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
   * 히트맵 데이터 로드 (최우선 - 0.14MB)
   */
  async loadHeatmapData(): Promise<HeatmapDataLite> {
    return this.loadJson<HeatmapDataLite>('heatmap_data.json')
  }

  /**
   * 간트차트 데이터 로드 (선택적 - 0.02MB)
   */
  async loadGanttData(): Promise<GanttDataLite> {
    return this.loadJson<GanttDataLite>('gantt_data_lite.json')
  }

  /**
   * 유사도 인덱스 로드 (선택적 - 0.01MB)
   */
  async loadSimilarityIndex(): Promise<SimilarityIndexLite> {
    return this.loadJson<SimilarityIndexLite>('similarity_index_lite.json')
  }

  /**
   * 체인별 요약 데이터 로드 (0.003MB)
   */
  async loadChainSummaries(): Promise<ChainSummariesLite> {
    return this.loadJson<ChainSummariesLite>('chain_summaries.json')
  }

  /**
   * 메타데이터 로드
   */
  async loadMetadata(): Promise<ValidatorVizMetadataLite> {
    return this.loadJson<ValidatorVizMetadataLite>('metadata.json')
  }

  /**
   * 기본 데이터만 로드 (히트맵 + 메타데이터)
   */
  async loadBasicData() {
    const [heatmapData, metadata] = await Promise.all([
      this.loadHeatmapData(),
      this.loadMetadata()
    ])

    return { heatmapData, metadata }
  }

  /**
   * 모든 데이터 로드 (필요시에만)
   */
  async loadAllData() {
    const [heatmapData, ganttData, similarityIndex, chainSummaries, metadata] = await Promise.all([
      this.loadHeatmapData(),
      this.loadGanttData(),
      this.loadSimilarityIndex(),
      this.loadChainSummaries(),
      this.loadMetadata()
    ])

    return {
      heatmapData,
      ganttData,
      similarityIndex,
      chainSummaries,
      metadata
    }
  }

  /**
   * 필터링된 히트맵 데이터 생성 (최적화)
   */
  filterHeatmapData(
    data: HeatmapDataLite,
    filters: {
      chains?: string[]
      categories?: string[]
      validators?: string[]
      searchTerm?: string
    }
  ): HeatmapDataLite {
    let filteredProposals = data.proposals
    let filteredValidators = data.validators

    // 체인 필터
    if (filters.chains && filters.chains.length > 0) {
      filteredProposals = filteredProposals.filter(p => filters.chains!.includes(p.chain))
      filteredValidators = filteredValidators.filter(v => filters.chains!.includes(v.chain))
    }

    // 카테고리 필터
    if (filters.categories && filters.categories.length > 0) {
      filteredProposals = filteredProposals.filter(p => filters.categories!.includes(p.category))
    }

    // 검색어 필터 (검증인 이름)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filteredValidators = filteredValidators.filter(v => 
        v.name.toLowerCase().includes(searchLower)
      )
    }

    // 검증인 ID 필터
    if (filters.validators && filters.validators.length > 0) {
      filteredValidators = filteredValidators.filter(v => filters.validators!.includes(v.id))
    }

    // 인덱스 매핑 생성
    const proposalIndexMap = new Map<string, number>()
    const validatorIndexMap = new Map<string, number>()

    data.proposals.forEach((p, idx) => proposalIndexMap.set(p.id, idx))
    data.validators.forEach((v, idx) => validatorIndexMap.set(v.id, idx))

    // 매트릭스 필터링
    const filteredMatrix: VoteInfoLite[][] = []
    
    filteredValidators.forEach((validator) => {
      const originalVIdx = validatorIndexMap.get(validator.id)
      if (originalVIdx === undefined) return

      const validatorRow: VoteInfoLite[] = []
      
      filteredProposals.forEach((proposal) => {
        const originalPIdx = proposalIndexMap.get(proposal.id)
        if (originalPIdx === undefined) {
          validatorRow.push({ option: 'NO_VOTE', power: 0, value: 2 })
          return
        }

        if (data.matrix[originalVIdx] && data.matrix[originalVIdx][originalPIdx]) {
          validatorRow.push(data.matrix[originalVIdx][originalPIdx])
        } else {
          validatorRow.push({ option: 'NO_VOTE', power: 0, value: 2 })
        }
      })

      filteredMatrix.push(validatorRow)
    })

    // 커버리지 계산
    const totalCells = filteredValidators.length * filteredProposals.length
    const filledCells = filteredMatrix.flat().filter(cell => cell.option !== 'NO_VOTE').length
    const coverage = totalCells > 0 ? filledCells / totalCells : 0

    return {
      proposals: filteredProposals,
      validators: filteredValidators,
      matrix: filteredMatrix,
      metadata: {
        proposal_count: filteredProposals.length,
        validator_count: filteredValidators.length,
        coverage,
        optimization_level: 'lite'
      }
    }
  }

  /**
   * 검증인 유사도 기반 정렬 (경량화)
   */
  sortValidatorsBySimilarity(
    validators: ValidatorVizValidatorLite[],
    similarityIndex: SimilarityIndexLite,
    baseValidatorId: string
  ): ValidatorVizValidatorLite[] {
    const baseValidator = validators.find(v => v.id === baseValidatorId)
    if (!baseValidator) return validators

    const similarities = similarityIndex.similarity_matrix[baseValidatorId] || {}
    
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
   * 간트차트용 시간 범위 계산 (간소화)
   */
  calculateTimeRange(proposals: GanttProposalLite[]): {
    start: Date
    end: Date
    duration: number
  } {
    const dates = proposals.flatMap(p => [
      new Date(p.voting_start),
      new Date(p.voting_end)
    ])

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))
    const duration = end.getTime() - start.getTime()

    return { start, end, duration }
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
export const validatorVizLoaderLite = new ValidatorVisualizationLoaderLite()

// 편의 함수들 (경량화)
export async function loadValidatorHeatmapDataLite(): Promise<HeatmapDataLite> {
  return validatorVizLoaderLite.loadHeatmapData()
}

export async function loadValidatorBasicDataLite() {
  return validatorVizLoaderLite.loadBasicData()
}

export async function loadValidatorGanttDataLite(): Promise<GanttDataLite> {
  return validatorVizLoaderLite.loadGanttData()
}

export async function loadValidatorSimilarityIndexLite(): Promise<SimilarityIndexLite> {
  return validatorVizLoaderLite.loadSimilarityIndex()
} 