
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'stargaze', 'proposals_v3.json');

const individualCorrections = [
  { "proposal_id": "293", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Ecosystem Growth Funding" },
  { "proposal_id": "290", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "288", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "276", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Partnership" },
  { "proposal_id": "271", "new_type_v3": "Governance & Community", "new_topic_v3": "Signaling" },
  { "proposal_id": "233", "new_type_v3": "Treasury & Funding", "new_topic_v3": "Community Spend" },
  { "proposal_id": "226", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "225", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" },
  { "proposal_id": "219", "new_type_v3": "Chain Administration", "new_topic_v3": "Parameter Change" },
  { "proposal_id": "215", "new_type_v3": "Ecosystem & Interchain", "new_topic_v3": "Smart Contract Management" },
  { "proposal_id": "169", "new_type_v3": "Governance & Community", "new_topic_v3": "Process & Policy" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for stargaze');
    process.exit(1);
}

const proposals = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
let appliedCount = 0;

// Apply individual corrections
individualCorrections.forEach(correction => {
    const { proposal_id, new_type_v3, new_topic_v3 } = correction;
    const proposalIndex = proposals.findIndex(p => p.proposal_id === proposal_id);

    if (proposalIndex !== -1) {
        proposals[proposalIndex].type_v3 = new_type_v3;
        proposals[proposalIndex].topic_v3 = new_topic_v3;
        proposals[proposalIndex].topic_v3_unique = `${new_type_v3} - ${new_topic_v3}`;
        appliedCount++;
    }
});

// Apply bulk spam correction
for (let i = 0; i < proposals.length; i++) {
    if (proposals[i].proposal_id >= 1 && proposals[i].proposal_id <= 168) {
        if (proposals[i].title === 'Stargaze Foundation') {
            proposals[i].type_v3 = 'Governance & Community';
            proposals[i].topic_v3 = 'Spam/Malicious';
            proposals[i].topic_v3_unique = 'Governance & Community - Spam/Malicious';
            appliedCount++;
        }
    }
}


fs.writeFileSync(proposalsV3Path, JSON.stringify(proposals, null, 2));

console.log(`Applied ${appliedCount} total corrections to stargaze/proposals_v3.json`);
