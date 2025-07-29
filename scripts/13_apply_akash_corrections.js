
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'akash', 'proposals_v3.json');

const corrections = [
  { "proposal_id": "268", "new_type_v3": "Chain Administration", "new_topic_v3": "Software Upgrade" },
  { "proposal_id": "261", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "258", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "253", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "252", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "250", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "247", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "242", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "236", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "234", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "230", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "229", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "200", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "199", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "187", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "186", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "22", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Security" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for akash');
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

console.log(`Applied ${appliedCount} corrections to akash/proposals_v3.json`);
