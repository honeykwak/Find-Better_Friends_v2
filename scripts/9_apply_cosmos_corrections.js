
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const proposalsV3Path = path.join(dataDir, 'cosmos', 'proposals_v3.json');

const corrections = [
  { proposal_id: "969", new_type_v3: "Ecosystem & Interchain", new_topic_v3: "Partnership" },
  { proposal_id: "955", new_type_v3: "Treasury & Funding", new_topic_v3: "Community Spend" },
  { proposal_id: "947", new_type_v3: "Chain Administration", new_topic_v3: "Software Upgrade" },
  { proposal_id: "945", new_type_v3: "Chain Administration", new_topic_v3: "Software Upgrade" },
  { proposal_id: "926", new_type_v3: "Governance & Community", new_topic_v3: "Process & Policy" },
  { proposal_id: "897", new_type_v3: "Ecosystem & Interchain", new_topic_v3: "IBC Management" },
  { proposal_id: "895", new_type_v3: "Chain Administration", new_topic_v3: "Security" },
  { proposal_id: "881", new_type_v3: "Ecosystem & Interchain", new_topic_v3: "Partnership" }
];

if (!fs.existsSync(proposalsV3Path)) {
    console.error('Could not find proposals_v3.json for cosmos');
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

console.log(`Applied ${appliedCount} corrections to cosmos/proposals_v3.json`);
