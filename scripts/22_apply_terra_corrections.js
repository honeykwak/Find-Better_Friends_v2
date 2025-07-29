const fs = require('fs');
const path = require('path');

const proposalsFilePath = path.join(__dirname, '../public/data/terra/proposals_v3.json');

// 수정할 제안 목록
const corrections = {
  "4823": { type_v3: "Ecosystem & Interchain", topic_v3: "Partnership" },
  "4822": { type_v3: "Treasury & Funding", topic_v3: "Community Spend" },
  "4817": { type_v3: "Ecosystem & Interchain", topic_v3: "Partnership" },
  "4790": { type_v3: "Treasury & Funding", topic_v3: "Community Spend" },
  "4775": { type_v3: "Treasury & Funding", topic_v3: "Security" },
  "4765": { type_v3: "Treasury & Funding", topic_v3: "Community Spend" },
  "4725": { type_v3: "Treasury & Funding", topic_v3: "Security" },
  "4715": { type_v3: "Treasury & Funding", topic_v3: "Security" },
  "4592": { type_v3: "Treasury & Funding", topic_v3: "Security" },
  "3534": { type_v3: "Treasury & Funding", topic_v3: "Security" },
  "1467": { type_v3: "Treasury & Funding", topic_v3: "Development Funding" }
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
    console.log('Successfully applied corrections to terra proposals_v3.json');
  });
});