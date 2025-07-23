const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const chains = fs.readdirSync(dataDir).filter(file => fs.statSync(path.join(dataDir, file)).isDirectory());

// New Classification Logic
function reclassifyProposal(proposal) {
    const title = proposal.title.toLowerCase();
    const type = proposal.type || '';
    const topic = proposal.topic || '';

    // Default values
    let type_v2 = 'Governance';
    let topic_v2_display = 'Signaling';

    // 1. Spam & Malicious Filter (Highest Priority)
    if (title.includes('airdrop') || title.includes('claim now') || title.includes('new version')) {
        return { type_v2: 'Governance', topic_v2_display: 'Spam & Malicious' };
    }

    // 2. Protocol Category
    if (type.includes('SoftwareUpgrade') || title.includes('upgrade')) {
        type_v2 = 'Protocol';
        topic_v2_display = 'Core Upgrade';
    } else if (type.includes('ParameterChange') || title.includes('parameter')) {
        type_v2 = 'Protocol';
        topic_v2_display = 'Parameter Change';
    } else if (title.includes('security') || title.includes('audit')) {
        type_v2 = 'Protocol';
        topic_v2_display = 'Security';
    }

    // 3. Treasury Category
    else if (type.includes('CommunityPoolSpend')) {
        type_v2 = 'Treasury';
        if (title.includes('core development') || title.includes('sdk') || title.includes('client')) {
            topic_v2_display = 'Core Development Funding';
        } else if (title.includes('incentives') || title.includes('liquidity') || title.includes('pool')) {
            topic_v2_display = 'Liquidity & Incentives';
        } else if (title.includes('marketing') || title.includes('community') || title.includes('events') || title.includes('hackathon')) {
            topic_v2_display = 'Community & Marketing Funding';
        } else {
            topic_v2_display = 'dApp & Tooling Funding';
        }
    }

    // 4. Ecosystem Category
    else if (type.includes('IBCRelated') || title.includes('ibc')) {
        type_v2 = 'Ecosystem';
        topic_v2_display = 'IBC Management';
    } else if (type.includes('SmartContract') || title.includes('wasm') || title.includes('whitelist') || title.includes('contract')) {
        type_v2 = 'Ecosystem';
        topic_v2_display = 'dApp Onboarding';
    } else if (type.includes('TokenRelated') || title.includes('token') || title.includes('alliance asset')) {
        type_v2 = 'Ecosystem';
        topic_v2_display = 'Token Management';
    } else if (title.includes('partnership') || title.includes('collaboration')) {
        type_v2 = 'Ecosystem';
        topic_v2_display = 'Partnership';
    }

    // 5. Governance Category (if not caught by others)
    else if (type.includes('TextProposal') || title.includes('signaling') || title.includes('policy')) {
        type_v2 = 'Governance';
        if (title.includes('committee') || title.includes('charter') || title.includes('policy')) {
            topic_v2_display = 'Process & Policy';
        } else {
            topic_v2_display = 'Signaling';
        }
    }
    
    // Fallback for unknown types that are not spam
    else if (type.includes('Unknown') || type.includes('Unclassified') || type.includes('Miscellaneous')) {
        // A simple keyword search for better classification of unknowns
        if (title.includes('fund')) topic_v2_display = 'dApp & Tooling Funding';
        else topic_v2_display = 'Signaling';
    }

    return { type_v2, topic_v2_display };
}

chains.forEach(chain => {
    const proposalsPath = path.join(dataDir, chain, 'proposals.json');
    if (fs.existsSync(proposalsPath)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf-8'));

        const updatedProposals = proposals.map(p => {
            const { type_v2, topic_v2_display } = reclassifyProposal(p);
            return {
                ...p,
                type_v2: type_v2,
                topic_v2: topic_v2_display, // Keep original topic_v2 for compatibility if needed, or remove
                topic_v2_display: topic_v2_display,
                topic_v2_unique: `${type_v2} - ${topic_v2_display}`
            };
        });

        const newPath = path.join(dataDir, chain, 'proposals_v2.json');
        fs.writeFileSync(newPath, JSON.stringify(updatedProposals, null, 2));
        console.log(`Successfully created ${newPath}`);
    }
});

console.log('Reclassification complete for all chains.');
