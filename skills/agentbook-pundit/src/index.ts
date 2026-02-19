import cron from 'node-cron';
import { BaoziAPI } from './baozi-api';
import { Analyst } from './analyst';
import { signMessage } from './signer';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(__dirname, '..', 'posts.log');

function log(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

const api = new BaoziAPI();
const analyst = new Analyst(api);

let postCount = 0;
let commentCount = 0;
let lastPostTime = 0;
let lastCommentTime = 0;

const POST_COOLDOWN_MS = 30 * 60 * 1000;
const COMMENT_COOLDOWN_MS = 60 * 60 * 1000;

async function doPost() {
  const now = Date.now();
  if (now - lastPostTime < POST_COOLDOWN_MS) {
    log('⏳ Post cooldown active, skipping');
    return;
  }

  try {
    // Try all post types until one succeeds
    const generators = [
      () => analyst.generateRoundup(),
      () => analyst.generateOddsAnalysis(),
      () => analyst.generateClosingAlert(),
    ];

    // Rotate starting point
    const startIdx = postCount % generators.length;
    let result: { content: string; marketPda?: string } | null = null;

    for (let i = 0; i < generators.length; i++) {
      const idx = (startIdx + i) % generators.length;
      result = await generators[idx]();
      if (result && result.content && result.content.length > 10) break;
    }

    if (!result || !result.content || result.content.length < 10) {
      log('⚠️ No content generated from any generator');
      return;
    }

    const success = await api.postToAgentBook(result.content, result.marketPda);
    if (success) {
      postCount++;
      lastPostTime = now;
      log(`📝 Post #${postCount}: ${result.content.substring(0, 120)}...`);
    }
  } catch (err) {
    log(`❌ Post error: ${err}`);
  }
}

async function doComment() {
  const now = Date.now();
  if (now - lastCommentTime < COMMENT_COOLDOWN_MS) {
    log('⏳ Comment cooldown active, skipping');
    return;
  }

  try {
    const active = await api.getActiveMarkets();
    if (active.length === 0) return;

    // Pick a market with pool activity
    const withPool = active.filter(m => m.totalPoolSol > 0);
    const targets = withPool.length > 0 ? withPool : active;
    const target = targets[commentCount % targets.length];

    const comment = await analyst.generateMarketComment(target);

    // Sign: use the exact market PDA + timestamp as message
    const nonce = Date.now().toString();
    const messageToSign = `${target.publicKey}:${nonce}`;
    const { signature, message } = signMessage(messageToSign);

    const success = await api.commentOnMarket(target.publicKey, comment, signature, message);
    if (success) {
      commentCount++;
      lastCommentTime = now;
      log(`💬 Comment #${commentCount} on "${target.question.substring(0, 50)}..."`);
    }
  } catch (err) {
    log(`❌ Comment error: ${err}`);
  }
}

async function main() {
  log('🤖 AgentBook Pundit starting (LLM-powered)...');
  log(`Wallet: ${config.walletAddress}`);
  log(`API: ${config.apiUrl}`);
  log(`LLM: ${process.env.OPENAI_API_KEY ? 'GPT-4o-mini' : 'Template fallback'}`);

  // Initial post on startup
  await doPost();

  // Post every 6 hours
  cron.schedule('0 0,6,12,18 * * *', async () => {
    log('⏰ Scheduled post trigger');
    await doPost();
  });

  // Also post every 3 hours for faster proof accumulation
  cron.schedule('0 3,9,15,21 * * *', async () => {
    log('⏰ Mid-cycle post trigger');
    await doPost();
  });

  // Comment every 2 hours
  cron.schedule('30 */2 * * *', async () => {
    log('⏰ Scheduled comment trigger');
    await doComment();
  });

  // Comment 2 min after startup
  setTimeout(async () => {
    await doComment();
  }, 2 * 60 * 1000);

  log('✅ Cron jobs scheduled (posts every 3h, comments every 2h). Running...');

  process.on('SIGINT', () => {
    log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}`);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    log(`🛑 Shutting down. Posts: ${postCount}, Comments: ${commentCount}`);
    process.exit(0);
  });
}

main().catch(err => {
  log(`💥 Fatal: ${err}`);
  process.exit(1);
});
