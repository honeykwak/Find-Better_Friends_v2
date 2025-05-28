/**
 * Validator Visualization Data Loader
 * 검증인 시각화를 위한 최적화된 데이터 로더
 */

// 타입 정의
export interface ValidatorVizProposal {
  id: string
  title: string
  chain: string
  date: string
  category: string
  passed: boolean
}

export interface ValidatorVizValidator {
  id: string
  name: string
  chain: string
  power: number
}

export interface VoteInfo {
  option: string
  power: number
  value: number
}

export interface HeatmapData {
  proposals: ValidatorVizProposal[]
  validators: ValidatorVizValidator[]
  matrix: VoteInfo[][]  // [validator_index][proposal_index]
  metadata: {
    proposal_count: number
    validator_count: number
    coverage: number
  }
}

export interface GanttProposal {
  proposal_id: string
  chain: string
  title: string
  category: string
  topic: string
  voting_start: string
  voting_end: string
  duration_hours: number
  passed: boolean
  validator_votes: Record<string, {
    vote_option: string
    voting_power: number
    vote_timestamp: string
    relative_timing: number
  }>
}

export interface GanttData {
  time_range: {
    start: string
    end: string
    duration_days: number
  }
  top_validators: Array<{
    validator_id: string
    chain: string
    voter_name: string
    sum: number
    mean: number
  }>
  proposals: GanttProposal[]
}

export interface SimilarityIndex {
  [validatorId: string]: {
    [targetValidatorId: string]: {
      similarity: number
      common_votes: number
    }
  }
}

export interface ChainSummary {
  proposal_count: number
  validator_count: number
  vote_count: number
  pass_rate: number
  participation_rate: number
  avg_voting_period_days: number
  category_distribution: Record<string, number>
  date_range: {
    start: string
    end: string
  }
}

export interface ChainSummaries {
  [chainName: string]: ChainSummary
}

export interface ValidatorVizMetadata {
  generated_at: string
  data_version: string
  files: Record<string, string>
  statistics: {
    total_proposals: number
    total_validators: number
    total_votes: number
    chains: number
    date_range: {
      start: string
      end: string
    }
  }
}

// 데이터 로더 클래스
export class ValidatorVisualizationLoader {
  private baseUrl: string
  private cache: Map<string, any> = new Map()

  constructor(baseUrl: string = '/data/validator_viz') {
    this.baseUrl = baseUrl
  }

  /**
   * JSON 파일 로드 (캐싱 지원)
   */
  private async loadJson<T>(filename: string): Promise<T> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename)
    }

    try {
      const response = await fetch(`${this.baseUrl}/${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`)
      }
      
      const data = await response.json()
      this.cache.set(filename, data)
      return data
    } catch (error) {
      console.error(`Error loading ${filename}:`, error)
      throw error
    }
  }

  /**
   * 히트맵 데이터 로드
   */
  async loadHeatmapData(): Promise<HeatmapData> {
    return this.loadJson<HeatmapData>('heatmap_data.json')
  }

  /**
   * 간트차트 데이터 로드
   */
  async loadGanttData(): Promise<GanttData> {
    return this.loadJson<GanttData>('gantt_data.json')
  }

  /**
   * 유사도 인덱스 로드
   */
  async loadSimilarityIndex(): Promise<SimilarityIndex> {
    return this.loadJson<SimilarityIndex>('similarity_index.json')
  }

  /**
   * 체인별 요약 데이터 로드
   */
  async loadChainSummaries(): Promise<ChainSummaries> {
    return this.loadJson<ChainSummaries>('chain_summaries.json')
  }

  /**
   * 메타데이터 로드
   */
  async loadMetadata(): Promise<ValidatorVizMetadata> {
    return this.loadJson<ValidatorVizMetadata>('metadata.json')
  }

  /**
   * 모든 데이터 한번에 로드
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
   * 필터링된 히트맵 데이터 생성
   */
  filterHeatmapData(
    data: HeatmapData,
    filters: {
      chains?: string[]
      categories?: string[]
      validators?: string[]
      dateRange?: { start: string; end: string }
    }
  ): HeatmapData {
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

    // 검증인 필터
    if (filters.validators && filters.validators.length > 0) {
      filteredValidators = filteredValidators.filter(v => filters.validators!.includes(v.id))
    }

    // 날짜 범위 필터
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      filteredProposals = filteredProposals.filter(p => {
        const proposalDate = new Date(p.date)
        return proposalDate >= startDate && proposalDate <= endDate
      })
    }

    // 인덱스 매핑 생성
    const proposalIndexMap = new Map<string, number>()
    const validatorIndexMap = new Map<string, number>()

    filteredProposals.forEach((p, idx) => proposalIndexMap.set(p.id, idx))
    filteredValidators.forEach((v, idx) => validatorIndexMap.set(v.id, idx))

    // 매트릭스 필터링
    const filteredMatrix: VoteInfo[][] = []
    
    filteredValidators.forEach((validator, vIdx) => {
      const originalVIdx = data.validators.findIndex(v => v.id === validator.id)
      if (originalVIdx === -1) return

      const validatorRow: VoteInfo[] = []
      
      filteredProposals.forEach((proposal, pIdx) => {
        const originalPIdx = data.proposals.findIndex(p => p.id === proposal.id)
        if (originalPIdx === -1) {
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
        coverage
      }
    }
  }

  /**
   * 검증인 유사도 기반 정렬
   */
  sortValidatorsBySimilarity(
    validators: ValidatorVizValidator[],
    similarityIndex: SimilarityIndex,
    baseValidatorId: string
  ): ValidatorVizValidator[] {
    const baseValidator = validators.find(v => v.id === baseValidatorId)
    if (!baseValidator) return validators

    const similarities = similarityIndex[baseValidatorId] || {}
    
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
   * 간트차트용 시간 범위 계산
   */
  calculateTimeRange(proposals: GanttProposal[]): {
    start: Date
    end: Date
    duration: number
    intervals: Array<{ start: Date; end: Date; label: string }>
  } {
    const dates = proposals.flatMap(p => [
      new Date(p.voting_start),
      new Date(p.voting_end)
    ])

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))
    const duration = end.getTime() - start.getTime()

    // 시간 간격 생성 (월별)
    const intervals: Array<{ start: Date; end: Date; label: string }> = []
    const current = new Date(start)
    
    while (current < end) {
      const intervalStart = new Date(current)
      current.setMonth(current.getMonth() + 1)
      const intervalEnd = new Date(Math.min(current.getTime(), end.getTime()))
      
      intervals.push({
        start: intervalStart,
        end: intervalEnd,
        label: intervalStart.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      })
    }

    return { start, end, duration, intervals }
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 캐시 상태 확인
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 싱글톤 인스턴스
export const validatorVizLoader = new ValidatorVisualizationLoader()

// 편의 함수들
export async function loadValidatorHeatmapData(): Promise<HeatmapData> {
  return validatorVizLoader.loadHeatmapData()
}

export async function loadValidatorGanttData(): Promise<GanttData> {
  return validatorVizLoader.loadGanttData()
}

export async function loadValidatorSimilarityIndex(): Promise<SimilarityIndex> {
  return validatorVizLoader.loadSimilarityIndex()
}

export async function loadValidatorChainSummaries(): Promise<ChainSummaries> {
  return validatorVizLoader.loadChainSummaries()
} 