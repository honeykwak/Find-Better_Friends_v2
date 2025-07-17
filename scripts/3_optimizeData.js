const { promises: fs } = require('fs');
const fs_sync = require('fs');
const path = require('path');
const Papa = require('papaparse');

const SOURCE_DIR = path.join(__dirname, '../public/new_data');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs_sync.createReadStream(filePath);
    Papa.parse(fileStream, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

async function processAllData() {
  console.log('Starting data optimization process...');

  const categoryMapPath = path.join(SOURCE_DIR, 'proposal_categories_enhanced.csv');
  const categoryEnhancements = await readCsv(categoryMapPath);
  const categoryMap = new Map();
  for (const row of categoryEnhancements) {
    categoryMap.set(row.title, {
      high_level_category: row.high_level_category,
      topic_subject: row.topic_subject,
    });
  }
  console.log(`Loaded ${categoryMap.size} entries from category enhancement file.`);

  const allFiles = await fs.readdir(SOURCE_DIR);
  const proposalFiles = allFiles.filter(f => f.endsWith('_proposals.csv'));

  for (const fileName of proposalFiles) {
    const chainName = fileName.replace('_proposals.csv', '');
    console.log(`\nProcessing chain: ${chainName}...`);

    const chainData = {
      proposals: [],
      validators: new Map(),
      votes: [],
    };

    const proposalsFromCsv = await readCsv(path.join(SOURCE_DIR, fileName));

    for (const proposal of proposalsFromCsv) {
      const mappedCategory = categoryMap.get(proposal.title) || {
        high_level_category: 'Unknown',
        topic_subject: 'Unknown',
      };

      let votesData = [];
      try {
        votesData = JSON.parse(proposal.votes || '[]');
      } catch (e) {
        console.warn(`Could not parse votes for proposal "${proposal.title}". Skipping votes.`);
        votesData = [];
      }

      for (const vote of votesData) {
        const validatorAddress = vote.voter;
        if (!validatorAddress) continue;

        if (!chainData.validators.has(validatorAddress)) {
          chainData.validators.set(validatorAddress, {
            validator_address: vote.validatorAddress, // Use the actual address
            moniker: validatorAddress, // Use the voter name as the moniker
            chain_id: chainName,
          });
        }
        chainData.votes.push({
          proposal_id: proposal.id,
          validator_address: vote.validatorAddress,
          vote_option: vote.option,
          voting_power: vote.votingPower,
        });
      }

      const final_tally_result = votesData.reduce((acc, vote) => {
        const option = vote.option.replace('VOTE_OPTION_', '');
        acc[`${option.toLowerCase()}_count`] = (acc[`${option.toLowerCase()}_count`] || 0) + 1;
        return acc;
      }, {});

      chainData.proposals.push({
        proposal_id: proposal.id,
        chain_id: chainName,
        title: proposal.title,
        type: mappedCategory.high_level_category,
        topic: mappedCategory.topic_subject,
        status: proposal.status,
        submit_time: proposal.submit_time,
        final_tally_result,
      });
    }

    const outputChainDir = path.join(OUTPUT_DIR, chainName);
    await fs.mkdir(outputChainDir, { recursive: true });

    const validatorsArray = Array.from(chainData.validators.values());

    await fs.writeFile(path.join(outputChainDir, 'proposals.json'), JSON.stringify(chainData.proposals, null, 2));
    await fs.writeFile(path.join(outputChainDir, 'validators.json'), JSON.stringify(validatorsArray, null, 2));
    await fs.writeFile(path.join(outputChainDir, 'votes.json'), JSON.stringify(chainData.votes, null, 2));

    console.log(`Successfully generated optimized data for ${chainName}.`);
  }

  console.log('\nData optimization process finished successfully!');
}

processAllData().catch(error => {
  console.error('A critical error occurred during the data optimization process:', error);
});