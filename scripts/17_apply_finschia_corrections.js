const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'finschia', 'proposals_v3.json');

const corrections = [
  // Batch update for "Service Contribution Reward" proposals
  ...["36", "32", "30", "29", "28", "26", "25", "24", "21", "18", "15", "14", "13", "12", "9", "8"].map(id => ({
    proposal_id: id,
    new_type_v3: "Treasury & Funding",
    new_topic_v3: "Community Spend"
  })),

  // Individual Corrections
  { "proposal_id": "34", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "33", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "23", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "19", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "16", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "7", "new_type_v3": "Governance & Community", "new_topic_v3": "Signaling" },
  { "proposal_id": "3", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Token Management" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for finschia');
    process.exit(1);
}

const proposals = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
let appliedCount = 0;

// A quick check to handle cases where an ID might be in both batch and individual.
const correctionMap = new Map();
corrections.forEach(c => correctionMap.set(c.proposal_id, c));

correctionMap.forEach(correction => {
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

console.log(`Applied ${appliedCount} corrections to finschia/proposals_v3.json`);
