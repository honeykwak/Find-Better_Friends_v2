const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'dydx', 'proposals_v3.json');

const corrections = [
  { "proposal_id": "175", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "174", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "161", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "157", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "156", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "152", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "148", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "147", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "142", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "128", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "61", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for dydx');
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

console.log(`Applied ${appliedCount} corrections to dydx/proposals_v3.json`);
