

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');
const chains = fs.readdirSync(dataDir).filter(file => fs.statSync(path.join(dataDir, file)).isDirectory());

const stats = {
    v1: { type: {}, topic: {} },
    v2: { type: {}, topic: {} },
    v3: { type: {}, topic: {} }
};

function countItems(obj, key) {
    obj[key] = (obj[key] || 0) + 1;
}

chains.forEach(chain => {
    const proposalsPath = path.join(dataDir, chain, 'proposals.json');
    const proposalsV2Path = path.join(dataDir, chain, 'proposals_v2.json');
    const proposalsV3Path = path.join(dataDir, chain, 'proposals_v3.json');

    if (fs.existsSync(proposalsPath)) {
        const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf-8'));
        proposals.forEach(p => {
            if (p.type) countItems(stats.v1.type, p.type);
            if (p.topic) countItems(stats.v1.topic, p.topic);
        });
    }

    if (fs.existsSync(proposalsV2Path)) {
        const proposalsV2 = JSON.parse(fs.readFileSync(proposalsV2Path, 'utf-8'));
        proposalsV2.forEach(p => {
            if (p.type_v2) countItems(stats.v2.type, p.type_v2);
            if (p.topic_v2) countItems(stats.v2.topic, p.topic_v2);
        });
    }
    
    if (fs.existsSync(proposalsV3Path)) {
        const proposalsV3 = JSON.parse(fs.readFileSync(proposalsV3Path, 'utf-8'));
        proposalsV3.forEach(p => {
            if (p.type_v3) countItems(stats.v3.type, p.type_v3);
            if (p.topic_v3) countItems(stats.v3.topic, p.topic_v3);
        });
    }
});

function printStats(version, classification, data) {
    console.log(`\n--- ${version.toUpperCase()} ${classification.toUpperCase()} ---`);
    const sortedData = Object.entries(data).sort(([, a], [, b]) => b - a);
    sortedData.forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
}

console.log('Classification Statistics (All Chains)');
printStats('v1', 'type', stats.v1.type);
printStats('v1', 'topic', stats.v1.topic);
printStats('v2', 'type', stats.v2.type);
printStats('v2', 'topic', stats.v2.topic);
printStats('v3', 'type', stats.v3.type);
printStats('v3', 'topic', stats.v3.topic);

