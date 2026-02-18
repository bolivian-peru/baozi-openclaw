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

const POST_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes (API enforced)
const COMMENT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour (API enforced)

async function doPost() {
  const now = Date.now();
  if (now - lastPostTime < POST_COOLDOWN_MS) {
    log('⏳ Post cooldown active, skipping');
    return;
  }

  try {
    // Rotate between post types
    const cycle = postCount % 3;
    let result: { content: string; marketPda?: string } | null;

    switch (cycle) {
      case 0:
        result = await analyst.generateRoundup();
        break;
      case 1:
        result = await analyst.generateOddsAnalysis();
        break;
      case 2:
        result = await analyst.generateClosingAlert();
        break;
      default:
        result = await analyst.generateRoundup();
    }

    if (!result) {
      log('⚠️ No content generated, skipping post');
      return;
    }

    const success = await api.postToAgentBook(result.content, result.marketPda);
    if (success) {
      postCount++;
      lastPostTime = now;
      log(`📝 Post #${postCount}: ${result.content.substring(0, 100)}...`);
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

    // Pick a market to comment on (rotate through them)
    const target = active[commentCount % active.length];
    const comment = analyst.generateMarketComment(target);

    // Sign for authentication
    const timestamp = Date.now().toString();
    const messageText = `Comment on market ${target.publicKey} at ${timestamp}`;
    const { signature, message } = signMessage(messageText);

    const success = await api.commentOnMarket(target.publicKey, comment, signature, message);
    if (success) {
      commentCount++;
      lastCommentTime = now;
      log(`💬 Comment #${commentCount} on "${target.question.substring(0, 50)}...": ${comment.substring(0, 80)}...`);
    }
  } catch (err) {
    log(`❌ Comment error: ${err}`);
  }
}

async function main() {
  log('🤖 AgentBook Pundit starting...');
  log(`Wallet: ${config.walletAddress}`);
  log(`Post interval: ${config.postIntervalMinutes}m`);
  log(`Comment interval: ${config.commentIntervalMinutes}m`);

  // Initial post on startup
  await doPost();

  // Schedule posts every 6 hours (4 per day)
  // 6:00 AM, 12:00 PM, 6:00 PM, 12:00 AM UTC
  cron.schedule('0 0,6,12,18 * * *', async () => {
    log('⏰ Scheduled post trigger');
    await doPost();
  });

  // Schedule comments every 2 hours
  cron.schedule('30 */2 * * *', async () => {
    log('⏰ Scheduled comment trigger');
    await doComment();
  });

  // Also do a comment 5 minutes after startup
  setTimeout(async () => {
    await doComment();
  }, 5 * 60 * 1000);

  log('✅ Cron jobs scheduled. Running...');

  // Keep alive
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
