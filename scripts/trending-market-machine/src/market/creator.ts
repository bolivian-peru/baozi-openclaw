// Create Lab markets on Baozi via MCP server + Solana transactions
import { CONFIG, type MarketQuestion, type CreatedMarket } from "../config.ts";
import { getCreatedMarketsFromState } from "./dedup.ts";
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import { spawn, type ChildProcess } from "child_process";

// In-memory rate limit tracking (supplements dedup.ts for cross-restart persistence)
const recentQuestions = new Set<string>();

// ─── MCP Client ──────────────────────────────────────────────────────────

interface MCPResult {
  content?: Array<{ text?: string; type?: string }>;
  [key: string]: unknown;
}

class MCPClient {
  private proc: ChildProcess | null = null;
  private buffer = "";
  private pendingResolves: Map<number, { resolve: (v: MCPResult) => void; reject: (e: Error) => void }> = new Map();
  private requestId = 0;
  private ready = false;

  async connect(): Promise<void> {
    this.proc = spawn("npx", ["@baozi.bet/mcp-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.stdout!.on("data", (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.proc.stderr!.on("data", () => {});

    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "trending-market-machine", version: "1.0.0" },
    });

    this.sendNotification("notifications/initialized", {});
    this.ready = true;
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && this.pendingResolves.has(msg.id)) {
          const { resolve, reject } = this.pendingResolves.get(msg.id)!;
          this.pendingResolves.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch (err) {
        console.error("MCP parse error:", (err as Error).message, "line:", line.slice(0, 100));
      }
    }
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<MCPResult> {
    return new Promise((resolve, reject) => {
      this.requestId++;
      const id = this.requestId;
      this.pendingResolves.set(id, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.proc!.stdin!.write(msg);
      setTimeout(() => {
        if (this.pendingResolves.has(id)) {
          this.pendingResolves.delete(id);
          reject(new Error(`MCP timeout for ${method}`));
        }
      }, 30000);
    });
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    this.proc!.stdin!.write(msg);
  }

  async callTool(name: string, args: Record<string, string>): Promise<MCPResult> {
    if (!this.ready) throw new Error("MCP not connected");
    return this.sendRequest("tools/call", { name, arguments: args });
  }

  close(): void {
    if (this.proc) { this.proc.kill(); this.proc = null; }
  }
}

// Singleton MCP client
let mcpClient: MCPClient | null = null;

async function getMCP(): Promise<MCPClient> {
  if (!mcpClient) {
    mcpClient = new MCPClient();
    console.log("  Connecting to Baozi MCP server...");
    await mcpClient.connect();
    console.log("  MCP connected!");
  }
  return mcpClient;
}

export function closeMCP(): void {
  if (mcpClient) { mcpClient.close(); mcpClient = null; }
}

// ─── Duplicate checking ──────────────────────────────────────────────────

export async function checkDuplicateMarket(question: string): Promise<boolean> {
  const normalized = question.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (recentQuestions.has(normalized)) return true;
  recentQuestions.add(normalized);

  try {
    const resp = await fetch(`${CONFIG.BAOZI_API}/markets`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      // 500 = server error — don't block on server issues, proceed with creation
      // 404 = no markets yet — definitely not a duplicate
      console.warn(`Duplicate check API returned ${resp.status} — proceeding`);
      return false;
    }
    const data: unknown = await resp.json();
    const markets: Array<Record<string, string>> = Array.isArray(data) ? data : (data as Record<string, unknown>).markets as Array<Record<string, string>> || [];
    for (const m of markets) {
      const existingQ = (m.question || m.title || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      const qWords = new Set(normalized.split(" ").filter(Boolean));
      const mWords = new Set(existingQ.split(" ").filter(Boolean));
      const overlap = [...qWords].filter((w) => mWords.has(w)).length;
      const similarity = overlap / Math.max(qWords.size, mWords.size);
      if (similarity > 0.6) return true;
    }
  } catch (err) {
    // Network errors should not block market creation
    console.warn("Duplicate check failed:", (err as Error).message, "— proceeding");
    return false;
  }

  return false;
}

// ─── Market creation via MCP ─────────────────────────────────────────────

export async function createLabMarket(
  market: MarketQuestion,
  walletKeypair?: Keypair
): Promise<CreatedMarket | null> {
  console.log(`\n--- Creating Lab Market via MCP ---`);
  console.log(`Question: ${market.question}`);
  console.log(`Category: ${market.category}`);
  console.log(`Close: ${market.closingTime.toISOString()}`);
  console.log(`Event: ${market.eventTime.toISOString()}`);
  console.log(`Type: A (event-based, v7.0)`);
  console.log(`Data source: ${market.dataSource}`);

  // Duplicate check
  const isDuplicate = await checkDuplicateMarket(market.question);
  if (isDuplicate) {
    console.log("SKIPPED: Similar market already exists");
    return null;
  }

  // Rate limit (uses persisted state to survive restarts)
  const allCreated = getCreatedMarketsFromState();
  const recentCreations = allCreated.filter(
    (m) => Date.now() - new Date(m.createdAt).getTime() < 60 * 60 * 1000
  );
  if (recentCreations.length >= CONFIG.MAX_MARKETS_PER_HOUR) {
    console.log(`SKIPPED: Rate limit (${CONFIG.MAX_MARKETS_PER_HOUR}/hour)`);
    return null;
  }

  if (CONFIG.DRY_RUN) {
    console.log("DRY RUN — market validated, would create on-chain");
    const dryResult: CreatedMarket = {
      marketPda: "DRY_RUN_" + Date.now().toString(36),
      txSignature: "DRY_RUN",
      question: market.question,
      closingTime: market.closingTime,
      createdAt: new Date(),
      trendId: market.trendSource.id,
    };
    return dryResult;
  }

  if (!walletKeypair) {
    console.log("NO WALLET — set SOLANA_PRIVATE_KEY to create markets on mainnet");
    return null;
  }

  try {
    const mcp = await getMCP();

    // Step 1: Validate the market question via MCP
    console.log("  Validating via MCP...");
    const validResult = await mcp.callTool("validate_market_question", {
      question: market.question,
      closing_time: market.closingTime.toISOString(),
      market_type: "typeA",
      event_time: market.eventTime.toISOString(),
    });
    const validText = (validResult.content || []).map((c) => c.text || "").join("\n");
    console.log(`  Validation: ${validText.slice(0, 200)}`);

    if (validText.toLowerCase().includes("rejected") || validText.toLowerCase().includes("not valid")) {
      console.log("  SKIPPED: MCP validation rejected");
      return null;
    }

    // Step 2: Build transaction via MCP
    console.log("  Building transaction via MCP...");
    const createResult = await mcp.callTool("build_create_lab_market_transaction", {
      question: market.question,
      closing_time: market.closingTime.toISOString(),
      market_type: "typeA",
      event_time: market.eventTime.toISOString(),
      category: market.category,
      data_source: market.dataSource,
      creator_wallet: walletKeypair.publicKey.toBase58(),
    });

    const createText = (createResult.content || []).map((c) => c.text || "").join("\n");
    console.log(`  MCP response: ${createText.slice(0, 300)}`);

    // Extract base64 transaction from MCP response
    const txMatch = createText.match(/[A-Za-z0-9+/]{100,}={0,2}/);
    if (!txMatch) {
      console.error("  Could not extract transaction from MCP response");
      console.log("  Full response:", createText);
      return null;
    }

    const base64Tx = txMatch[0];
    console.log(`  Transaction: ${base64Tx.length} chars base64`);

    // Step 3: Sign and send
    const conn = new Connection(CONFIG.RPC_URL, "confirmed");
    const txBuf = Buffer.from(base64Tx, "base64");
    const tx = Transaction.from(txBuf);

    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletKeypair.publicKey;
    tx.sign(walletKeypair);
    console.log("  Transaction signed!");

    const sig = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    console.log(`  TX sent: ${sig}`);
    console.log(`  Explorer: https://solscan.io/tx/${sig}`);

    const confirmation = await conn.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (confirmation.value.err) {
      console.error("  Transaction failed:", confirmation.value.err);
      return null;
    }

    console.log("  CONFIRMED on mainnet!");

    // Extract market PDA from response if available
    const pdaMatch = createText.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    const marketPda = pdaMatch ? pdaMatch[0] : "see-tx-" + sig.slice(0, 8);

    const result: CreatedMarket = {
      marketPda,
      txSignature: sig,
      question: market.question,
      closingTime: market.closingTime,
      createdAt: new Date(),
      trendId: market.trendSource.id,
    };

    console.log(`  Market created! PDA: ${marketPda}`);

    // Step 4: Generate share card
    const shareCardUrl = await generateShareCard(mcp, marketPda, market.question);
    if (shareCardUrl) {
      console.log(`  Share card: ${shareCardUrl}`);
      result.shareCardUrl = shareCardUrl;
    }

    // Step 5: Post to AgentBook
    await postToAgentBook(
      walletKeypair.publicKey.toBase58(),
      market.question,
      marketPda,
      shareCardUrl
    );

    return result;
  } catch (err) {
    console.error("  Market creation failed:", (err as Error).message);
    return null;
  }
}

// ─── Share card generation ─────────────────────────────────────────────────

export async function generateShareCard(
  mcp: MCPClient,
  marketPda: string,
  question: string
): Promise<string | null> {
  try {
    console.log("  Generating share card...");
    const result = await mcp.callTool("generate_share_card", {
      market_pda: marketPda,
      question,
    });
    const text = (result.content || []).map((c) => c.text || "").join("\n");
    console.log(`  Share card response: ${text.slice(0, 200)}`);
    // Extract image URL from response
    const urlMatch = text.match(/https?:\/\/[^\s"']+(?:\.png|\.jpg|\.gif|share[^\s"']*)/i);
    return urlMatch ? urlMatch[0] : null;
  } catch (err) {
    console.warn("  Share card failed:", (err as Error).message);
    return null;
  }
}

// ─── AgentBook posting ─────────────────────────────────────────────────────

export async function postToAgentBook(
  walletAddress: string,
  question: string,
  marketPda: string,
  shareCardUrl: string | null
): Promise<void> {
  const content = shareCardUrl
    ? `🥟 New prediction market live: "${question.slice(0, 100)}" — Trade now: https://baozi.bet/markets/${marketPda} ${shareCardUrl}`
    : `🥟 New prediction market live: "${question.slice(0, 100)}" — Trade now: https://baozi.bet/markets/${marketPda}`;

  try {
    const resp = await fetch(`${CONFIG.BAOZI_API}/agentbook/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, content }),
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      console.log("  AgentBook: posted announcement");
    } else {
      const body = await resp.text();
      console.warn(`  AgentBook: ${resp.status} — ${body.slice(0, 100)}`);
    }
  } catch (err) {
    console.warn("  AgentBook post failed:", (err as Error).message);
  }
}
