

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const chains = fs.readdirSync(dataDir).filter(file => fs.statSync(path.join(dataDir, file)).isDirectory());

const corrections = [];

function suggestCorrection(proposal) {
    const { proposal_id, chain_id, title: rawTitle, type, topic, type_v3, topic_v3 } = proposal;
    const title = rawTitle.toLowerCase();

    let suggestion = null;

    // Case 1: A proposal that ended up as Unknown but wasn't Unknown before.
    if (topic_v3 === 'Unknown' && type !== 'Unknown') {
        suggestion = { new_type_v3: '?', new_topic_v3: '?', reason: 'Fell through classification logic' };
    }

    // Case 2: TextProposals that might be better classified elsewhere based on keywords.
    if (type === 'TextProposal') {
        if (title.includes('ibc') || title.includes('channel')) {
            suggestion = { new_type_v3: 'Ecosystem & Interchain', new_topic_v3: 'IBC Management', reason: 'Keyword "ibc" in TextProposal' };
        } else if (title.includes('spend') || title.includes('fund') || title.includes('pay')) {
            suggestion = { new_type_v3: 'Treasury & Funding', new_topic_v3: 'Community Spend', reason: 'Keyword "spend/fund" in TextProposal' };
        } else if (title.includes('upgrade')) {
            suggestion = { new_type_v3: 'Chain Administration', new_topic_v3: 'Software Upgrade', reason: 'Keyword "upgrade" in TextProposal' };
        } else if (title.includes('parameter') || title.includes('param')) {
            suggestion = { new_type_v3: 'Chain Administration', new_topic_v3: 'Parameter Change', reason: 'Keyword "parameter" in TextProposal' };
        }
    }
    
    if (suggestion) {
        // Avoid suggesting a correction if it's already correct
        if (suggestion.new_type_v3 === type_v3 && suggestion.new_topic_v3 === topic_v3) {
            return;
        }
        corrections.push({
            chain_id,
            proposal_id,
            title: rawTitle,
            current_type_v3: type_v3,
            current_topic_v3: topic_v3,
            ...suggestion
        });
    }
}

chains.forEach(chain => {
    const proposalsV3Path = path.join(dataDir, chain, 'proposals_v3.json');
    if (fs.existsSync(proposalsV3Path)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
        proposals.forEach(suggestCorrection);
    }
});

if (corrections.length > 0) {
    console.log('Found potential misclassifications. Please review the following suggestions:\n');
    console.log(JSON.stringify(corrections, null, 2));
    console.log(`\nTotal suggestions: ${corrections.length}`);
    console.log('\nIf you agree with these changes, I will write a script to apply them.');
} else {
    console.log('No obvious misclassifications found based on the current rules.');
}

