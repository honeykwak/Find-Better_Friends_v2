const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const chains = fs.readdirSync(dataDir).filter(file => fs.statSync(path.join(dataDir, file)).isDirectory());

function classifyProposalV3(proposal) {
    const title = proposal.title.toLowerCase();
    const type = proposal.type || '';
    const topic = proposal.topic || '';

    // 1. Spam/Malicious (Highest Priority)
    if (title.includes('airdrop') || title.includes('claim now') || title.includes('new version') || title.includes('giveaway') || title.includes('reward')) {
        return { type_v3: 'Governance & Community', topic_v3: 'Spam/Malicious' };
    }

    // 2. Chain Administration
    if (type.includes('SoftwareUpgrade') || title.includes('upgrade')) {
        return { type_v3: 'Chain Administration', topic_v3: 'Software Upgrade' };
    }
    if (type.includes('ParameterChange') || title.includes('parameter')) {
        return { type_v3: 'Chain Administration', topic_v3: 'Parameter Change' };
    }
    if (title.includes('security') || title.includes('audit')) {
        return { type_v3: 'Chain Administration', topic_v3: 'Security' };
    }
    if (type.includes('ChainSpecific') || topic.includes('Network Policy')) {
        return { type_v3: 'Chain Administration', topic_v3: 'Network Policy' };
    }

    // 3. Treasury & Funding
    if (type.includes('CommunityPoolSpend')) {
        if (title.includes('development') || title.includes('sdk') || title.includes('core dev')) {
            return { type_v3: 'Treasury & Funding', topic_v3: 'Development Funding' };
        }
        if (title.includes('marketing') || title.includes('events') || title.includes('hackathon') || title.includes('growth')) {
            return { type_v3: 'Treasury & Funding', topic_v3: 'Ecosystem Growth Funding' };
        }
        if (title.includes('infrastructure') || title.includes('rpc') || title.includes('relayer')) {
            return { type_v3: 'Treasury & Funding', topic_v3: 'Infrastructure Funding' };
        }
        return { type_v3: 'Treasury & Funding', topic_v3: 'Community Spend' };
    }

    // 4. Ecosystem & Interchain
    if (type.includes('IBCRelated') || title.includes('ibc')) {
        return { type_v3: 'Ecosystem & Interchain', topic_v3: 'IBC Management' };
    }
    if (type.includes('TokenRelated') || title.includes('token') || title.includes('asset')) {
        return { type_v3: 'Ecosystem & Interchain', topic_v3: 'Token Management' };
    }
    if (title.includes('partnership') || title.includes('collaboration')) {
        return { type_v3: 'Ecosystem & Interchain', topic_v3: 'Partnership' };
    }
    if (type.includes('SmartContract') || type.includes('MarketRelated') || type.includes('PoolIncentives') || type.includes('PoolData') || title.includes('wasm') || title.includes('contract')) {
        return { type_v3: 'Ecosystem & Interchain', topic_v3: 'Smart Contract Management' };
    }

    // 5. Governance & Community
    if (type.includes('TextProposal')) {
        if (title.includes('committee') || title.includes('charter') || title.includes('policy')) {
            return { type_v3: 'Governance & Community', topic_v3: 'Process & Policy' };
        }
        if (title.includes('signal') || title.includes('signaling')) {
            return { type_v3: 'Governance & Community', topic_v3: 'Signaling' };
        }
        // If a text proposal doesn't fit a more specific category, classify it as Process & Policy
        return { type_v3: 'Governance & Community', topic_v3: 'Process & Policy' };
    }

    // Fallback for truly unknown types
    return { type_v3: 'Governance & Community', topic_v3: 'Unknown' };
}


chains.forEach(chain => {
    const proposalsPath = path.join(dataDir, chain, 'proposals.json');
    if (fs.existsSync(proposalsPath)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf-8'));

        const updatedProposals = proposals.map(p => {
            const { type_v3, topic_v3 } = classifyProposalV3(p);
            return {
                ...p,
                type_v3: type_v3,
                topic_v3: topic_v3,
                topic_v3_unique: `${type_v3} - ${topic_v3}`
            };
        });

        const newPath = path.join(dataDir, chain, 'proposals_v3.json');
        fs.writeFileSync(newPath, JSON.stringify(updatedProposals, null, 2));
        console.log(`Successfully created ${newPath}`);
    }
});

console.log('V3 reclassification complete for all chains.');
