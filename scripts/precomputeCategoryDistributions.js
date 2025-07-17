const fs = require('fs');
const path = require('path');

// 투표 옵션 매핑 (metadata.json과 일치)
const VOTE_OPTIONS = {
  0: 'ABSTAIN',
  1: 'NO', 
  2: 'NO_VOTE',
  3: 'NO_WITH_VETO',
  4: 'WEIGHTED_VOTE',
  5: 'YES'
};

// 출력 디렉토리
const OUTPUT_DIR = './public/precomputed_data/category_distributions';

// 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 메인 함수
async function precomputeCategoryDistributions() {
  console.log('🔄 Starting category distribution precomputation...');
  
  try {
    // 메타데이터 로드
    const metadata = JSON.parse(fs.readFileSync('./public/optimized_data/metadata.json', 'utf-8'));
    const proposals = JSON.parse(fs.readFileSync('./public/optimized_data/proposals.json', 'utf-8'));
    
    // 체인별 투표 데이터 로드
    const chainVotes = {};
    const chainNames = Object.keys(metadata.chains);
    
    for (const chain of chainNames) {
      const votesPath = `./public/optimized_data/votes/${chain}_votes.csv`;
      if (fs.existsSync(votesPath)) {
        console.log(`📊 Loading votes for ${chain}...`);
        chainVotes[chain] = loadVotesFromCSV(votesPath);
      }
    }
    
    // 제안 데이터 처리
    const proposalsByChain = {};
    Object.values(proposals).forEach(proposal => {
      if (!proposalsByChain[proposal.chain]) {
        proposalsByChain[proposal.chain] = [];
      }
      proposalsByChain[proposal.chain].push(proposal);
    });
    
    // 체인별 처리
    for (const chain of chainNames) {
      console.log(`🔍 Processing ${chain}...`);
      const chainProposals = proposalsByChain[chain] || [];
      const votes = chainVotes[chain] || [];
      
      const distributions = calculateDistributions(chainProposals, votes);
      
      // 파일명 생성 (gravity-bridge -> gravity_bridge)
      const fileName = chain.replace(/[^a-zA-Z0-9]/g, '_');
      const outputPath = path.join(OUTPUT_DIR, `${fileName}.json`);
      
      fs.writeFileSync(outputPath, JSON.stringify(distributions, null, 2));
      console.log(`✅ Saved ${chain} distributions: ${Object.keys(distributions.categories).length} categories, ${Object.keys(distributions.topics).length} topics`);
    }
    
    // 전체 체인 집계
    console.log('🌐 Processing all chains...');
    const allProposals = Object.values(proposals);
    const allVotes = Object.values(chainVotes).flat();
    
    const allDistributions = calculateDistributions(allProposals, allVotes);
    const allChainsPath = path.join(OUTPUT_DIR, 'all_chains.json');
    
    fs.writeFileSync(allChainsPath, JSON.stringify(allDistributions, null, 2));
    console.log(`✅ Saved all chains distributions: ${Object.keys(allDistributions.categories).length} categories, ${Object.keys(allDistributions.topics).length} topics`);
    
    // 메타데이터 생성
    const metadataOutput = {
      generatedAt: new Date().toISOString(),
      totalProposals: allProposals.length,
      processedProposals: allProposals.length,
      totalVotes: allVotes.length,
      totalCategories: Object.keys(allDistributions.categories).length,
      totalTopics: Object.keys(allDistributions.topics).length,
      chains: chainNames.length,
      chainList: chainNames,
      version: '2.0' // 투표력 분포 추가로 버전 업
    };
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadataOutput, null, 2));
    console.log('✅ Saved metadata');
    
    console.log('🎉 Category distribution precomputation completed!');
    
  } catch (error) {
    console.error('❌ Error during precomputation:', error);
    process.exit(1);
  }
}

// CSV 파일에서 투표 데이터 로드
function loadVotesFromCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').slice(1); // 헤더 제거
  
  return lines
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      const voteCode = parseInt(values[2]); // 투표 옵션 코드
      const votingPower = parseFloat(values[3]); // 투표력
      
      return {
        proposalShortId: parseInt(values[0]),
        validatorShortId: parseInt(values[1]),
        voteOption: VOTE_OPTIONS[voteCode] || 'UNKNOWN',
        voteCode: voteCode,
        votingPower: votingPower, // 🔥 투표력 추가
        timestamp: parseInt(values[4]) || 0
      };
    })
    .filter(vote => vote.voteOption !== 'UNKNOWN' && vote.voteOption !== 'WEIGHTED_VOTE'); // 알려진 투표만 처리
}

// 분포 계산 함수
function calculateDistributions(proposals, votes) {
  // 제안 ID로 매핑
  const proposalMap = {};
  proposals.forEach(proposal => {
    const shortId = proposal.original_id ? parseInt(proposal.original_id.split('_')[1]) : null;
    if (shortId) {
      proposalMap[shortId] = proposal;
    }
  });
  
  // 카테고리와 토픽별 초기화
  const categoryStats = {};
  const topicStats = {};
  
  // 제안별 통계 집계
  proposals.forEach(proposal => {
    const category = proposal.category || 'Unknown';
    const topic = proposal.topic_subject || proposal.topic || 'Unknown';
    const passed = proposal.passed === true;
    
    // 카테고리 초기화
    if (!categoryStats[category]) {
      categoryStats[category] = {
        count: 0,
        passCount: 0,
        passRate: 0,
        voteDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 },
        votingPowerDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 } // 🔥 투표력 분포 추가
      };
    }
    
    // 토픽 초기화
    if (!topicStats[topic]) {
      topicStats[topic] = {
        count: 0,
        passCount: 0,
        passRate: 0,
        category: category,
        voteDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 },
        votingPowerDistribution: { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0, NO_VOTE: 0 } // 🔥 투표력 분포 추가
      };
    }
    
    // 카운트 증가
    categoryStats[category].count++;
    topicStats[topic].count++;
    
    if (passed) {
      categoryStats[category].passCount++;
      topicStats[topic].passCount++;
    }
  });
  
  // 투표 집계
  votes.forEach(vote => {
    const proposal = proposalMap[vote.proposalShortId];
    if (!proposal || !vote.voteOption) return;
    
    const category = proposal.category || 'Unknown';
    const topic = proposal.topic_subject || proposal.topic || 'Unknown';
    
    if (categoryStats[category]) {
      categoryStats[category].voteDistribution[vote.voteOption]++;
      categoryStats[category].votingPowerDistribution[vote.voteOption] += vote.votingPower; // 🔥 투표력 누적
    }
    
    if (topicStats[topic]) {
      topicStats[topic].voteDistribution[vote.voteOption]++;
      topicStats[topic].votingPowerDistribution[vote.voteOption] += vote.votingPower; // 🔥 투표력 누적
    }
  });
  
  // 통과율 계산
  Object.values(categoryStats).forEach(stats => {
    stats.passRate = stats.count > 0 ? (stats.passCount / stats.count) * 100 : 0;
  });
  
  Object.values(topicStats).forEach(stats => {
    stats.passRate = stats.count > 0 ? (stats.passCount / stats.count) * 100 : 0;
  });
  
  return {
    categories: categoryStats,
    topics: topicStats
  };
}

// 스크립트 실행
if (require.main === module) {
  precomputeCategoryDistributions();
}

module.exports = { precomputeCategoryDistributions }; 