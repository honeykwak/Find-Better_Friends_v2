const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');

// Get all chain directories
const chains = fs.readdirSync(dataDir).filter(file => 
    fs.statSync(path.join(dataDir, file)).isDirectory()
);

chains.forEach(chain => {
    const chainDir = path.join(dataDir, chain);
    const v3Path = path.join(chainDir, 'proposals_v3.json');
    const v2Path = path.join(chainDir, 'proposals_v2.json');
    const v1Path = path.join(chainDir, 'proposals.json'); // The original/destination file
    
    let sourcePath;
    let version;

    // Determine the highest version available to use as the source
    if (fs.existsSync(v3Path)) {
        sourcePath = v3Path;
        version = 3;
    } else if (fs.existsSync(v2Path)) {
        sourcePath = v2Path;
        version = 2;
    } else if (fs.existsSync(v1Path)) {
        sourcePath = v1Path;
        version = 1;
    } else {
        console.log(`No proposal file found for ${chain}. Skipping.`);
        return;
    }

    try {
        const rawData = fs.readFileSync(sourcePath, 'utf-8');
        const proposals = JSON.parse(rawData);

        // Map proposals to the new unified format
        const newProposals = proposals.map(p => {
            const newP = { ...p };

            // *** Core Logic: Copy v3/v2 data to standard fields before deleting ***
            if (version === 3 && newP.type_v3) {
                newP.type = newP.type_v3;
                newP.topic = newP.topic_v3;
            } else if (version === 2 && newP.type_v2) {
                newP.type = newP.type_v2;
                newP.topic = newP.topic_v2;
            }
            // If version is 1, 'type' and 'topic' are already correct.

            // Now, delete all the old versioned fields
            delete newP.type_v2;
            delete newP.topic_v2;
            delete newP.type_v3;
            delete newP.topic_v3;
            delete newP.topic_v3_unique;
            
            return newP;
        });

        // Write to the standard 'proposals.json'
        const newPath = path.join(chainDir, 'proposals.json');
        fs.writeFileSync(newPath, JSON.stringify(newProposals, null, 2));
        console.log(`Successfully unified proposals for ${chain} to use 'type' and 'topic' fields.`);

        // Clean up old v2 and v3 files
        if (fs.existsSync(v2Path)) {
            fs.unlinkSync(v2Path);
            console.log(`Removed old proposals_v2.json for ${chain}.`);
        }
        if (fs.existsSync(v3Path)) {
            fs.unlinkSync(v3Path);
            console.log(`Removed old proposals_v3.json for ${chain}.`);
        }

    } catch (error) {
        console.error(`Error processing ${chain}:`, error);
    }
});

console.log('Proposal unification process completed.');