
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'osmosis', 'proposals_v3.json');

const corrections = [
  { "proposal_id": "855", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "853", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "IBC Management" },
  { "proposal_id": "845", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "836", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "829", "new_type_v3": "Chain Administration", "new_topic_v3": "Software Upgrade" },
  { "proposal_id": "827", "new_type_v3": "Chain Administration", "new_topic_v3": "Software Upgrade" },
  { "proposal_id": "826", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "812", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "806", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "795", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "780", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "772", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "753", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "752", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "746", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "745", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "743", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for osmosis');
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

console.log(`Applied ${appliedCount} corrections to osmosis/proposals_v3.json`);
