
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'juno', 'proposals_v3.json');

const corrections = [
  { "proposal_id": "351", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Infrastructure Funding" },
  { "proposal_id": "350", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "345", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "343", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "341", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "339", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "338", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "337", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "336", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "335", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "331", "new_type_v3": "Governance & Community", "new_topic_v3": "Signaling" },
  { "proposal_id": "330", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "329", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "328", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "326", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "324", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "323", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "322", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "321", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "319", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "318", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Development Funding" },
  { "proposal_id": "316", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "313", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "312", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for juno');
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

console.log(`Applied ${appliedCount} corrections to juno/proposals_v3.json`);
