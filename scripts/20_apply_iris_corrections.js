const fs = require('fs');
const path = require('path');

const proposalsFilePath = path.join(__dirname, '..', 'public', 'data', 'iris', 'proposals_v3.json');

// 수정할 제안 목록
const corrections = [
  {
    proposal_id: "95",
    new_type: "Treasury & Funding",
    new_topic: "Development Funding"
  },
  {
    proposal_id: "94",
    new_type: "Treasury & Funding",
    new_topic: "Development Funding"
  },
  {
    proposal_id: "89",
    new_type: "Treasury & Funding",
    new_topic: "Development Funding"
  },
  {
    proposal_id: "79",
    new_type: "Treasury & Funding",
    new_topic: "Development Funding"
  },
  {
    proposal_id: "76",
    new_type: "Ecosystem & Interchain",
    new_topic: "Partnership"
  },
  {
    proposal_id: "60",
    new_type: "Treasury & Funding",
    new_topic: "Development Funding"
  },
  {
    proposal_id: "27",
    new_type: "Treasury & Funding",
    new_topic: "Ecosystem Growth Funding"
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
