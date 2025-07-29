
const fs = require('fs');
const path = require('path');

const proposalsFilePath = path.join(__dirname, '../public/data/sentinel/proposals_v3.json');

// 수정할 제안 목록
const corrections = {
  "39": { type_v3: "Chain Administration", topic_v3: "Parameter Change" },
  "22": { type_v3: "Treasury & Funding", topic_v3: "Infrastructure Funding" },
  "17": { type_v3: "Governance & Community", topic_v3: "Process & Policy" },
  "16": { type_v3: "Governance & Community", topic_v3: "Signaling" },
  "13": { type_v3: "Governance & Community", topic_v3: "Signaling" },
  "2": { type_v3: "Governance & Community", topic_v3: "Signaling" }
};

// proposals_v3.json 파일 읽기
fs.readFile(proposalsFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading proposals file:', err);
    return;
  }

  let proposals = JSON.parse(data);

  // 수정 적용
  proposals.forEach(proposal => {
    if (corrections[proposal.proposal_id]) {
      const { type_v3, topic_v3 } = corrections[proposal.proposal_id];
      console.log(`Updating proposal ${proposal.proposal_id}:`);
      console.log(`  Old: type_v3=${proposal.type_v3}, topic_v3=${proposal.topic_v3}`);
      proposal.type_v3 = type_v3;
      proposal.topic_v3 = topic_v3;
      proposal.topic_v3_unique = `${type_v3} - ${topic_v3}`;
      console.log(`  New: type_v3=${proposal.type_v3}, topic_v3=${proposal.topic_v3}`);
    }
  });

  // 수정된 내용으로 파일 다시 쓰기
  fs.writeFile(proposalsFilePath, JSON.stringify(proposals, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing proposals file:', err);
      return;
    }
    console.log('Successfully applied corrections to sentinel proposals_v3.json');
  });
});
