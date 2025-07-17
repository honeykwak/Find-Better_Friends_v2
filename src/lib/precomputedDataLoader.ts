export interface PrecomputedCategoryDistribution {
  count: number;
  passCount: number;
  passRate: number;
  voteDistribution: {
    YES: number;
    NO: number;
    ABSTAIN: number;
    NO_WITH_VETO: number;
    NO_VOTE: number;
  };
  // 🔥 새로운 투표력 분포 필드 추가
  votingPowerDistribution: {
    YES: number;
    NO: number;
    ABSTAIN: number;
    NO_WITH_VETO: number;
    NO_VOTE: number;
  };
}

export interface PrecomputedTopicDistribution extends PrecomputedCategoryDistribution {
  category: string;
}

export interface PrecomputedChainData {
  categories: Record<string, PrecomputedCategoryDistribution>;
  topics: Record<string, PrecomputedTopicDistribution>;
}

export interface PrecomputedAllData {
  categories: Record<string, PrecomputedCategoryDistribution>;
  topics: Record<string, PrecomputedTopicDistribution>;
}

export interface PrecomputedMetadata {
  generatedAt: string;
  totalProposals: number;
  processedProposals: number;
  totalVotes: number;
  totalCategories: number;
  totalTopics: number;
  chains: number;
  chainList: string[];
  version: string;
}

class PrecomputedDataLoader {
  private static instance: PrecomputedDataLoader;
  private metadataCache: PrecomputedMetadata | null = null;
  private allChainsCache: PrecomputedAllData | null = null;
  private chainDataCache: Map<string, PrecomputedChainData> = new Map();

  private constructor() {}

  static getInstance(): PrecomputedDataLoader {
    if (!PrecomputedDataLoader.instance) {
      PrecomputedDataLoader.instance = new PrecomputedDataLoader();
    }
    return PrecomputedDataLoader.instance;
  }

  async loadMetadata(): Promise<PrecomputedMetadata> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      const response = await fetch('/precomputed_data/category_distributions/metadata.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.metadataCache = await response.json();
      return this.metadataCache!;
    } catch (error) {
      console.error('Error loading precomputed metadata:', error);
      throw error;
    }
  }

  // 전체 체인 데이터 로딩 제거됨 - 개별 체인만 지원

  async loadChainData(chainName: string): Promise<PrecomputedChainData> {
    if (this.chainDataCache.has(chainName)) {
      return this.chainDataCache.get(chainName)!;
    }

    try {
      // 체인 이름을 파일명으로 변환
      const fileName = chainName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const response = await fetch(`/precomputed_data/category_distributions/${fileName}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const chainData = await response.json();
      this.chainDataCache.set(chainName, chainData);
      return chainData;
    } catch (error) {
      console.error(`Error loading chain data for ${chainName}:`, error);
      throw error;
    }
  }

  async loadCategoryDistributions(selectedChains: string[]): Promise<PrecomputedAllData> {
    if (selectedChains.length === 0) {
      // 체인 선택이 필수가 되었으므로 에러 처리
      throw new Error('Chain selection is required - all chains mode no longer supported');
    }

    if (selectedChains.length === 1) {
      // 단일 체인 데이터 반환
      const chainData = await this.loadChainData(selectedChains[0]);
      return {
        categories: chainData.categories,
        topics: chainData.topics
      };
    }

    // 여러 체인 데이터 병합 (단일 체인 사용 권장)
    const chainDataPromises = selectedChains.map(chain => this.loadChainData(chain));
    const chainDataArray = await Promise.all(chainDataPromises);

    const mergedCategories: Record<string, PrecomputedCategoryDistribution> = {};
    const mergedTopics: Record<string, PrecomputedTopicDistribution> = {};

    // 카테고리 병합
    chainDataArray.forEach(chainData => {
      Object.entries(chainData.categories).forEach(([category, data]) => {
        if (!mergedCategories[category]) {
          mergedCategories[category] = {
            count: 0,
            passCount: 0,
            passRate: 0,
            voteDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 },
            votingPowerDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 }
          };
        }

        mergedCategories[category].count += data.count;
        mergedCategories[category].passCount += data.passCount;

        // 투표 분포 누적
        Object.keys(data.voteDistribution).forEach(voteType => {
          mergedCategories[category].voteDistribution[voteType as keyof typeof data.voteDistribution] += 
            data.voteDistribution[voteType as keyof typeof data.voteDistribution];
        });

        // 투표력 분포 누적
        Object.keys(data.votingPowerDistribution).forEach(voteType => {
          mergedCategories[category].votingPowerDistribution[voteType as keyof typeof data.votingPowerDistribution] += 
            data.votingPowerDistribution[voteType as keyof typeof data.votingPowerDistribution];
        });
      });
    });

    // 토픽 병합
    chainDataArray.forEach(chainData => {
      Object.entries(chainData.topics).forEach(([topic, data]) => {
        if (!mergedTopics[topic]) {
          mergedTopics[topic] = {
            count: 0,
            passCount: 0,
            passRate: 0,
            category: data.category,
            voteDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 },
            votingPowerDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 }
          };
        }

        mergedTopics[topic].count += data.count;
        mergedTopics[topic].passCount += data.passCount;

        // 투표 분포 누적
        Object.keys(data.voteDistribution).forEach(voteType => {
          mergedTopics[topic].voteDistribution[voteType as keyof typeof data.voteDistribution] += 
            data.voteDistribution[voteType as keyof typeof data.voteDistribution];
        });

        // 투표력 분포 누적
        Object.keys(data.votingPowerDistribution).forEach(voteType => {
          mergedTopics[topic].votingPowerDistribution[voteType as keyof typeof data.votingPowerDistribution] += 
            data.votingPowerDistribution[voteType as keyof typeof data.votingPowerDistribution];
        });
      });
    });

    // 통과율 재계산
    Object.values(mergedCategories).forEach(category => {
      category.passRate = category.count > 0 ? (category.passCount / category.count) * 100 : 0;
    });

    Object.values(mergedTopics).forEach(topic => {
      topic.passRate = topic.count > 0 ? (topic.passCount / topic.count) * 100 : 0;
    });

    return {
      categories: mergedCategories,
      topics: mergedTopics
    };
  }

  // 캐시 초기화 (필요시)
  clearCache(): void {
    this.metadataCache = null;
    this.allChainsCache = null;
    this.chainDataCache.clear();
  }
}

export default PrecomputedDataLoader; 