"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLabMarket = createLabMarket;
exports.getWalletBalance = getWalletBalance;
exports.canAffordMarketCreation = canAffordMarketCreation;
exports.shutdownMcp = shutdownMcp;
/**
 * Market Creator — On-chain market creation via MCP Server
 *
 * Uses @baozi.bet/mcp-server's build_create_lab_market_transaction tool
 * to create markets on-chain, then signs and submits the transaction.
 */
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const config_1 = require("./config");
const news_detector_1 = require("./news-detector");
const tracker_1 = require("./tracker");
const mcp_client_1 = require("./mcp-client");
let connection;
let keypair;
let mcpClient = null;
function getConnection() {
    if (!connection) {
        connection = new web3_js_1.Connection(config_1.config.rpcEndpoint, 'confirmed');
    }
    return connection;
}
function getKeypair() {
    if (!keypair) {
        const secretKey = bs58_1.default.decode(config_1.config.privateKey);
        keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    return keypair;
}
async function getMcpClient() {
    if (!mcpClient) {
        mcpClient = new mcp_client_1.McpClient();
        await mcpClient.start();
    }
    return mcpClient;
}
/** Max retries for on-chain transaction submission */
const TX_MAX_RETRIES = 3;
/** Base delay (ms) for exponential backoff between retries */
const TX_RETRY_BASE_DELAY_MS = 2000;
/**
 * Sleep helper for retry backoff.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Submit a signed transaction with exponential-backoff retry.
 * Retries on transient network / RPC errors; does NOT retry on program errors
 * (e.g. InstructionError) because those will fail deterministically.
 */
async function sendWithRetry(conn, rawTx, retries = TX_MAX_RETRIES) {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const sig = await conn.sendRawTransaction(rawTx, {
                skipPreflight: false,
                maxRetries: 2,
            });
            await conn.confirmTransaction(sig, 'confirmed');
            return sig;
        }
        catch (err) {
            lastError = err;
            const msg = err?.message || String(err);
            // Program / instruction errors are deterministic - don't retry
            if (msg.includes('custom program error') ||
                msg.includes('InstructionError') ||
                msg.includes('insufficient funds')) {
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
async function createLabMarket(proposal) {
    const conn = getConnection();
    const kp = getKeypair();
    try {
        // ── 1. Validate and enforce pari-mutuel v6.3 timing rules ──────────
        const timingCheck = (0, news_detector_1.classifyAndValidateTiming)(proposal);
        if (!timingCheck.valid) {
            const adjusted = (0, news_detector_1.enforceTimingRules)(proposal);
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
        }
        catch (e) {
            console.warn(`  MCP validation skipped: ${e.message}`);
        }
        // ── 3. Build unsigned transaction via MCP ──────────────────────────
        const closingTimeISO = proposal.closingTime.toISOString();
        let buildResult;
        try {
            buildResult = await mcp.buildCreateLabMarketTransaction({
                question: proposal.question,
                closingTime: closingTimeISO,
                creatorWallet: kp.publicKey.toBase58(),
                resolutionMode: 'CouncilOracle',
                councilMembers: [kp.publicKey.toBase58()],
            });
        }
        catch (e) {
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
        const tx = web3_js_1.Transaction.from(txBuffer);
        tx.sign(kp);
        const txSignature = await sendWithRetry(conn, Buffer.from(tx.serialize()));
        const marketPda = buildResult.marketPda || '';
        console.log(`\n  ✅ Market created via MCP!`);
        console.log(`  PDA: ${marketPda}`);
        console.log(`  TX: https://solscan.io/tx/${txSignature}`);
        // ── 5. Record in tracker ───────────────────────────────────────────
        (0, tracker_1.recordMarket)({
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
    }
    catch (err) {
        return { success: false, marketPda: '', marketId: 0, txSignature: '', error: err.message || String(err) };
    }
}
async function getWalletBalance() {
    const conn = getConnection();
    const kp = getKeypair();
    const balance = await conn.getBalance(kp.publicKey);
    return balance / 1000000000;
}
async function canAffordMarketCreation() {
    const balance = await getWalletBalance();
    const needed = 0.015;
    if (balance < needed) {
        console.warn(`Low balance: ${balance.toFixed(4)} SOL (need ${needed} SOL)`);
        return false;
    }
    return true;
}
async function shutdownMcp() {
    if (mcpClient) {
        await mcpClient.stop();
        mcpClient = null;
    }
}
//# sourceMappingURL=market-creator.js.map