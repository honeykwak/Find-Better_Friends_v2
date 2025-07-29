const fs = require('fs');
const path = require('path');

const proposalsFilePath = path.join(__dirname, '..', 'public', 'data', 'injective', 'proposals_v3.json');

// 수정할 제안 목록
const corrections = [
  {
    proposal_id: "458",
    new_type: "Chain Administration",
    new_topic: "Security",
    reason: "오라클에서 특정 릴레이어를 제거하는 것은 스마트 컨트랙트의 직접적인 코드 변경이 아니라, 오라클 데이터의 신뢰성과 보안을 강화하기 위한 운영상의 조치입니다. 따라서 'Security'로 분류하는 것이 더 적절합니다."
  },
  {
    proposal_id: "455",
    new_type: "Chain Administration",
    new_topic: "Parameter Change",
    reason: "제안의 내용이 명백한 수수료 관련 '파라미터 변경'이므로, 기존 분류가 더 정확합니다. (오분류 수정)"
  },
  {
    proposal_id: "443",
    new_type: "Chain Administration",
    new_topic: "Software Upgrade",
    reason: "'INJ 3.0'은 단순한 파라미터 변경을 넘어, 인플레이션 메커니즘을 근본적으로 바꾸는 중요한 토크노믹스 업그레이드입니다. 이는 'Software Upgrade'로 분류하는 것이 타당합니다."
  },
  {
    proposal_id: "440",
    new_type: "Chain Administration",
    new_topic: "Permissioning",
    reason: "특정 주소를 화이트리스트에 추가하는 것은 스마트 컨트랙트 관리라기보다는, 특정 권한을 부여하는 'Permissioning' 행위에 해당합니다."
  },
  {
    proposal_id: "429",
    new_type: "Chain Administration",
    new_topic: "Software Upgrade",
    reason: "'INJ 3.0' 토크노믹스 업그레이드는 체인의 핵심 로직을 변경하는 것이므로 'Software Upgrade'가 가장 정확한 분류입니다."
  },
  {
    proposal_id: "422",
    new_type: "Chain Administration",
    new_topic: "Parameter Change",
    reason: "모든 시장의 최소 주문 금액(min-notional)을 업데이트하는 것은 개별 스마트 컨트랙트 관리가 아닌, 거래소 모듈의 전반적인 '파라미터 변경'입니다."
  },
  {
    proposal_id: "410",
    new_type: "Ecosystem & Interchain",
    new_topic: "Smart Contract Management",
    reason: "제안의 제목과 내용이 '토큰'이 아닌 '팩토리 컨트랙트' 업로드에 관한 것이므로, 'Smart Contract Management'가 더 정확합니다."
  },
  {
    proposal_id: "409",
    new_type: "Chain Administration",
    new_topic: "Software Upgrade",
    reason: "'INJ 3.0' 관련 제안은 핵심 토크노믹스 변경이므로 'Software Upgrade'로 분류합니다."
  },
  {
    proposal_id: "407",
    new_type: "Ecosystem & Interchain",
    new_topic: "Token Management",
    reason: "새로운 '토큰' 컨트랙트를 업로드하는 것이므로, 'Token Management'가 가장 명확한 분류입니다."
  },
  {
    proposal_id: "371",
    new_type: "Ecosystem & Interchain",
    new_topic: "Smart Contract Management",
    reason: "게임 내에서 사용될 '토큰' 컨트랙트를 업로드하는 것이지만, 이는 특정 dApp(Ninza)의 스마트 컨트랙트 시스템을 구성하는 일부이므로 'Smart Contract Management'가 더 포괄적이고 적절합니다."
  },
  {
    proposal_id: "360",
    new_type: "Chain Administration",
    new_topic: "Parameter Change",
    reason: "특정 시장의 최소 주문 수량을 업데이트하는 것은 거래소 모듈의 '파라미터 변경'에 해당합니다."
  },
  {
    proposal_id: "353",
    new_type: "Chain Administration",
    new_topic: "Parameter Change",
    reason: "특정 시장의 가격 및 수량 틱 사이즈를 업데이트하는 것은 거래소 모듈의 '파라미터 변경'입니다."
  }
];

// proposals_v3.json 파일 읽기
fs.readFile(proposalsFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('파일을 읽는 중 오류가 발생했습니다:', err);
    return;
  }

  let proposals = JSON.parse(data);

  // 수정 적용
  corrections.forEach(correction => {
    const proposal = proposals.find(p => p.proposal_id === correction.proposal_id);
    if (proposal) {
      proposal.type_v3 = correction.new_type;
      proposal.topic_v3 = correction.new_topic;
      proposal.topic_v3_unique = `${correction.new_type} - ${correction.new_topic}`;
    }
  });

  // 수정된 내용을 다시 파일에 쓰기
  fs.writeFile(proposalsFilePath, JSON.stringify(proposals, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('파일을 쓰는 중 오류가 발생했습니다:', err);
      return;
    }
    console.log('proposals_v3.json 파일이 성공적으로 업데이트되었습니다.');
  });
});