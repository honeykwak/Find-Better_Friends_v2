const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const DATA_DIR = path.join(__dirname, '../public/data');
const NEW_DATA_DIR = path.join(__dirname, '../public/new_data');

// Helper function to read CSV files using papaparse
function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

async function fixVotingPower() {
  console.log('Starting to fix voting power distributions...');

  try {
    const chainDirs = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());

    for (const chain of chainDirs) {
      console.log(`\nProcessing chain: ${chain}`);

      const categorySummaryPath = path.join(DATA_DIR, chain, 'category_summary.json');
      const proposalsPath = path.join(DATA_DIR, chain, 'proposals.json');
      const csvPath = path.join(NEW_DATA_DIR, `${chain}_proposals.csv`);

      if (!fs.existsSync(categorySummaryPath) || !fs.existsSync(proposalsPath) || !fs.existsSync(csvPath)) {
        console.log(`Skipping ${chain}: missing one or more required files.`);
        continue;
      }

      let categorySummary = JSON.parse(fs.readFileSync(categorySummaryPath, 'utf-8'));
      const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf-8'));
      
      const records = await readCsv(csvPath);

      const votesMap = {};
      for (const record of records) {
        if (record.id && record.votes) {
          try {
            const votesFromString = JSON.parse(record.votes);
            votesMap[record.id] = votesFromString;
          } catch (e) {
            console.warn(`Could not parse votes for proposal ID ${record.id} in chain ${chain}.`);
          }
        }
      }

      const proposalInfoMap = {};
      for (const p of proposals) {
        proposalInfoMap[p.proposal_id] = {
          category: p.type || 'Unknown',
          topic: p.topic || 'Unclassified',
        };
      }
      
      Object.values(categorySummary.categories).forEach(cat => {
        cat.votingPowerDistribution = { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0 };
      });
      if (categorySummary.topics) {
        Object.values(categorySummary.topics).forEach(topic => {
          topic.votingPowerDistribution = { YES: 0, NO: 0, ABSTAIN: 0, NO_WITH_VETO: 0 };
        });
      }

      for (const proposalId in proposalInfoMap) {
        const proposalInfo = proposalInfoMap[proposalId];
        const votes = votesMap[proposalId];

        if (proposalInfo && votes) {
            const category = categorySummary.categories[proposalInfo.category];
            const topicKey = Object.keys(categorySummary.topics).find(key => key.toLowerCase() === (proposalInfo.topic || '').toLowerCase());
            const topic = categorySummary.topics[topicKey];

            if (category) {
                for (const vote of votes) {
                    const power = parseFloat(vote.votingPower);
                    if (vote.option && !isNaN(power)) {
                        const voteOption = vote.option.replace('VOTE_OPTION_', '');
                        if (category.votingPowerDistribution[voteOption] !== undefined) {
                            category.votingPowerDistribution[voteOption] += power;
                        }
                        if (topic && topic.votingPowerDistribution[voteOption] !== undefined) {
                            topic.votingPowerDistribution[voteOption] += power;
                        }
                    }
                }
            }
        }
      }

      fs.writeFileSync(categorySummaryPath, JSON.stringify(categorySummary, null, 2));
      console.log(`Successfully updated ${categorySummaryPath}`);
    }

    console.log('\nAll chains processed successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

fixVotingPower();