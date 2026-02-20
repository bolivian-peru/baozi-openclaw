/**
 * Trending Market Machine
 *
 * Monitors trends, creates v7.0-compliant Lab markets,
 * generates share cards, and posts to AgentBook.
 */
import cron from 'node-cron';
import { fetchTrends, generateProposal } from './trend-detector';
import { createLabMarket, canAffordMarketCreation } from './market-creator';
import { getShareCardUrl, postToAgentBook, preValidateMarket } from './api-utils';
import { isDuplicate } from './tracker';
import { classifyAndValidateTiming } from './validation';

async function runCycle() {
  console.log('📡 Scanning for trends...');
  
  if (!(await canAffordMarketCreation())) {
    console.log('Skipping cycle: Low balance');
    return;
  }

  const trends = await fetchTrends();
  
  for (const trend of trends) {
    if (isDuplicate(trend.title)) continue;

    console.log(`Analyzing: ${trend.title}`);
    const proposal = await generateProposal(trend);
    
    if (!proposal) {
      console.log('  -> No valid market proposal generated');
      continue;
    }

    if (isDuplicate(proposal.question)) {
      console.log('  -> Duplicate question');
      continue;
    }

    // Double check timing rules locally
    const timing = classifyAndValidateTiming(proposal);
    if (!timing.valid) {
      console.log(`  -> Timing invalid: ${timing.reason}`);
      continue;
    }

    // Pre-validate with API
    const valid = await preValidateMarket({
      question: proposal.question,
      closingTime: proposal.closingTime.toISOString(),
    });

    if (!valid) {
      console.log('  -> API pre-validation failed');
      continue;
    }

    console.log(`🚀 Creating market: "${proposal.question}"`);
    const result = await createLabMarket(proposal);

    if (result.success) {
      console.log(`✅ Market created: ${result.marketPda}`);
      
      // Generate share card & post
      const cardUrl = getShareCardUrl(result.marketPda);
      const caption = `fresh market 🥟 trending topic\n\n"${proposal.question}"\n\ncloses: ${proposal.closingTime.toDateString()}\n\nplace your bet → baozi.bet/market/${result.marketPda}`;
      
      await postToAgentBook(caption, cardUrl, result.marketPda);
      console.log('  -> Posted to AgentBook');
    } else {
      console.error(`❌ Creation failed: ${result.error}`);
    }
  }
}

// Run every 30 minutes
cron.schedule('*/30 * * * *', runCycle);

// Startup scan
runCycle().catch(console.error);
