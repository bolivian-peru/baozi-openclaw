/**
 * Market Creator — On-chain market creation via MCP Server
 *
 * Uses @baozi.bet/mcp-server's build_create_lab_market_transaction tool
 * to create markets on-chain, then signs and submits the transaction.
 */
import {
  Connection,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config';
import { MarketProposal } from './trend-detector';
import { classifyAndValidateTiming, enforceTimingRules } from './validation';
import { recordMarket } from './tracker';
import { McpClient } from './mcp-client';

let connection: Connection;
let keypair: Keypair;
let mcpClient: McpClient | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.rpcEndpoint, 'confirmed');
  }
  return connection;
}

function getKeypair(): Keypair {
  if (!keypair) {
    const secretKey = bs58.decode(config.privateKey);
    keypair = Keypair.fromSecretKey(secretKey);
  }
  return keypair;
}

async function getMcpClient(): Promise<McpClient> {
  if (!mcpClient) {
    mcpClient = new McpClient();
    await mcpClient.start();
  }
  return mcpClient;
}

export interface CreateMarketResult {
  success: boolean;
  marketPda: string;
  marketId: number;
  txSignature: string;
  error?: string;
}

/** Max retries for on-chain transaction submission */
const TX_MAX_RETRIES = 3;
/** Base delay (ms) for exponential backoff between retries */
const TX_RETRY_BASE_DELAY_MS = 2000;

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submit a signed transaction with exponential-backoff retry.
 * Retries on transient network / RPC errors; does NOT retry on program errors
 * (e.g. InstructionError) because those will fail deterministically.
 */
async function sendWithRetry(
  conn: Connection,
  rawTx: Buffer,
  retries = TX_MAX_RETRIES,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const sig = await conn.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 2,
      });
      await conn.confirmTransaction(sig, 'confirmed');
      return sig;
    } catch (err: any) {
      lastError = err;
      const msg: string = err?.message || String(err);

      // Program / instruction errors are deterministic - don't retry
      if (
        msg.includes('custom program error') ||
        msg.includes('InstructionError') ||
        msg.includes('insufficient funds')
      ) {
        throw err;
      }

      // Transient errors - retry with backoff
      const delayMs = TX_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`  ⚠️ TX attempt ${attempt}/${retries} failed (${msg}). Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error('sendWithRetry exhausted all attempts');
}

/**
 * Create a lab market using MCP server's build_create_lab_market_transaction.
 *
 * Pipeline:
 *   1. Validate & enforce pari-mutuel v6.3 timing rules (local)
 *   2. Validate question via MCP server
 *   3. Build unsigned tx via MCP build_create_lab_market_transaction
 *   4. Sign locally, submit to Solana with exponential-backoff retry
 *   5. Record in local tracker DB
 */
export async function createLabMarket(proposal: MarketProposal): Promise<CreateMarketResult> {
  const conn = getConnection();
  const kp = getKeypair();

  try {
    // ── 1. Validate and enforce pari-mutuel v6.3 timing rules ──────────
    const timingCheck = classifyAndValidateTiming(proposal);
    if (!timingCheck.valid) {
      const adjusted = enforceTimingRules(proposal);
      if (!adjusted) {
        return {
          success: false, marketPda: '', marketId: 0, txSignature: '',
          error: `Timing violation (v6.3 ${timingCheck.type}): ${timingCheck.reason}`,
        };
      }
      console.log(`  🔧 Timing adjusted to comply with v6.3 ${timingCheck.type} rules`);
      proposal = adjusted;
    }

    console.log(`  Timing: ${timingCheck.type} - ${timingCheck.reason}`);

    // ── 2. Validate question via MCP ───────────────────────────────────
    const mcp = await getMcpClient();

    try {
      const validation = await mcp.validateMarketQuestion(proposal.question);
      if (validation && !validation.valid) {
        return {
          success: false, marketPda: '', marketId: 0, txSignature: '',
          error: `Question validation failed: ${validation.issues.join(', ')}`,
        };
      }
    } catch (e: any) {
      console.warn(`  MCP validation skipped: ${e.message}`);
    }

    // ── 3. Build unsigned transaction via MCP ──────────────────────────
    const closingTimeISO = proposal.closingTime.toISOString();
    let buildResult: any;

    try {
      buildResult = await mcp.buildCreateLabMarketTransaction({
        question: proposal.question,
        closingTime: closingTimeISO,
        creatorWallet: kp.publicKey.toBase58(),
        resolutionMode: 'CouncilOracle',
        councilMembers: [kp.publicKey.toBase58()],
      });
    } catch (e: any) {
      return {
        success: false, marketPda: '', marketId: 0, txSignature: '',
        error: `MCP build_create_lab_market_transaction failed: ${e.message}`,
      };
    }

    if (!buildResult || !buildResult.transaction) {
      return {
        success: false, marketPda: '', marketId: 0, txSignature: '',
        error: 'MCP returned no transaction data (empty response from build_create_lab_market_transaction)',
      };
    }

    // ── 4. Deserialize, sign, and send with retry ──────────────────────
    const txBuffer = Buffer.from(buildResult.transaction, 'base64');
    const tx = Transaction.from(txBuffer);
    tx.sign(kp);

    const txSignature = await sendWithRetry(conn, Buffer.from(tx.serialize()));

    const marketPda = buildResult.marketPda || '';

    console.log(`\n  ✅ Market created via MCP!`);
    console.log(`  PDA: ${marketPda}`);
    console.log(`  TX: https://solscan.io/tx/${txSignature}`);

    // ── 5. Record in tracker ───────────────────────────────────────────
    recordMarket({
      market_pda: marketPda,
      market_id: 0,
      question: proposal.question,
      category: proposal.category,
      source: proposal.source,
      source_url: proposal.sourceUrl,
      closing_time: closingTimeISO,
      resolution_outcome: null,
      tx_signature: txSignature,
    });

    return { success: true, marketPda, marketId: 0, txSignature };
  } catch (err: any) {
    return { success: false, marketPda: '', marketId: 0, txSignature: '', error: err.message || String(err) };
  }
}

export async function getWalletBalance(): Promise<number> {
  const conn = getConnection();
  const kp = getKeypair();
  const balance = await conn.getBalance(kp.publicKey);
  return balance / 1_000_000_000;
}

export async function canAffordMarketCreation(): Promise<boolean> {
  const balance = await getWalletBalance();
  const needed = 0.015;
  if (balance < needed) {
    console.warn(`Low balance: ${balance.toFixed(4)} SOL (need ${needed} SOL)`);
    return false;
  }
  return true;
}

export async function shutdownMcp(): Promise<void> {
  if (mcpClient) {
    await mcpClient.stop();
    mcpClient = null;
  }
}
