const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'evmos', 'proposals_v3.json');

const corrections = [
  // Spam/Malicious Proposals
  ...["318", "315", "312", "311", "308", "302", "301", "299", "298", "294", "293", "292", "289", "288", "287", "282", "281", "280", "279", "278", "274", "255", "249", "248", "247", "242", "241", "239", "237", "227", "224", "216", "215", "210", "208", "291", "285", "284"].map(id => ({
    proposal_id: id,
    new_type_v3: "Governance & Community",
    new_topic_v3: "Spam/Malicious"
  })),

  // Individual Corrections
  { "proposal_id": "317", "new_type_v3": "Chain Administration", "new_topic_v3": "Software Upgrade" },
  { "proposal_id": "314", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "305", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "295", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "286", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "267", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "261", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "236", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "206", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "147", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for evmos');
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

console.log(`Applied ${appliedCount} corrections to evmos/proposals_v3.json`);
