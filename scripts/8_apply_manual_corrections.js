

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');

const corrections = [
  {
    "chain_id": "akash",
    "proposal_id": "25",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "axelar",
    "proposal_id": "212",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "cosmos",
    "proposal_id": "950",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "cosmos",
    "proposal_id": "860",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "cosmos",
    "proposal_id": "819",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "cosmos",
    "proposal_id": "93",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "cosmos",
    "proposal_id": "29",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "evmos",
    "proposal_id": "88",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "injective",
    "proposal_id": "341",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "348",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "310",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "125",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "124",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "72",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "64",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "60",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "juno",
    "proposal_id": "59",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "520",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "519",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "516",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "388",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "103",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "85",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "osmosis",
    "proposal_id": "63",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "secret",
    "proposal_id": "281",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "secret",
    "proposal_id": "251",
    "new_type_v3": "Chain Administration",
    "new_topic_v3": "Parameter Change"
  },
  {
    "chain_id": "secret",
    "proposal_id": "240",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "secret",
    "proposal_id": "58",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  },
  {
    "chain_id": "secret",
    "proposal_id": "44",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  },
  {
    "chain_id": "secret",
    "proposal_id": "21",
    "new_type_v3": "Chain Administration",
    "new_topic_v3": "Software Upgrade"
  },
  {
    "chain_id": "sentinel",
    "proposal_id": "2",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  },
  {
    "chain_id": "stargaze",
    "proposal_id": "93",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "terra",
    "proposal_id": "4743",
    "new_type_v3": "Treasury & Funding",
    "new_topic_v3": "Community Spend"
  },
  {
    "chain_id": "terra",
    "proposal_id": "1467",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  },
  {
    "chain_id": "terra",
    "proposal_id": "349",
    "new_type_v3": "Ecosystem & Interchain",
    "new_topic_v3": "IBC Management"
  }
];

let appliedCount = 0;

corrections.forEach(correction => {
    const { chain_id, proposal_id, new_type_v3, new_topic_v3 } = correction;
    const proposalsV3Path = path.join(dataDir, chain_id, 'proposals_v3.json');

    if (fs.existsSync(proposalsV3Path)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
        
        const proposalIndex = proposals.findIndex(p => p.proposal_id === proposal_id);

        if (proposalIndex !== -1) {
            proposals[proposalIndex].type_v3 = new_type_v3;
            proposals[proposalIndex].topic_v3 = new_topic_v3;
            proposals[proposalIndex].topic_v3_unique = `${new_type_v3} - ${new_topic_v3}`;
            
            fs.writeFileSync(proposalsV3Path, JSON.stringify(proposals, null, 2));
            console.log(`Applied correction to ${chain_id} proposal ${proposal_id}`);
            appliedCount++;
        } else {
            console.log(`Could not find proposal ${proposal_id} in ${chain_id}`);
        }
    } else {
        console.log(`Could not find proposals_v3.json for chain ${chain_id}`);
    }
});

console.log(`\nManual correction complete. Applied ${appliedCount} of ${corrections.length} corrections.`);
