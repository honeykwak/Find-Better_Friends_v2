
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'axelar', 'proposals_v3.json');

const corrections = [
  { "proposal_id": "251", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "246", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "240", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "228", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "220", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "216", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "211", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "206", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "196", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "191", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "178", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "172", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "170", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "168", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "167", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "166", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "17", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for axelar');
    process.exit(1);
}

const proposals = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
let appliedCount = 0;

corrections.forEach(correction => {
    const { proposal_id, new_type_v3, new_topic_v3 } = correction;
    const proposalIndex = proposals.findIndex(p => p.proposal_id === proposal_id);

    if (proposalIndex !== -1) {
        proposals[proposalIndex].type_v3 = new_type_v3;
        proposals[proposalIndex].topic_v3 = new_topic_v3;
        proposals[proposalIndex].topic_v3_unique = `${new_type_v3} - ${new_topic_v3}`;
        appliedCount++;
    }
});

fs.writeFileSync(proposalsV3Path, JSON.stringify(proposals, null, 2));

console.log(`Applied ${appliedCount} corrections to axelar/proposals_v3.json`);
