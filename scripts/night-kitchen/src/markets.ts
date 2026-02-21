/**
 * markets.ts — fetch live market data from baozi on-chain
 *
 * decodes V4.7.6 market accounts directly from Solana mainnet.
 * no API key needed — reads public on-chain state.
 */

const PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";
const RPC_ENDPOINT =
  process.env.HELIUS_RPC_URL ??
  process.env.SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

// account discriminator for boolean markets (first 8 bytes of sha256("account:Market"))
const MARKET_DISC = [219, 190, 213, 55, 0, 227, 198, 154];

export interface BooleanMarket {
  type: "boolean";
  publicKey: string;
  marketId: number;
  question: string;
  yesPrice: number;
  noPrice: number;
  poolSol: number;
  closingTime: string;
  eventTime: string;
  resolved: boolean;
  status: string;
  outcome?: string;
  category?: string;
}

export interface RaceMarket {
  type: "race";
  publicKey: string;
  question: string;
  options: Array<{ name: string; probability: number }>;
  poolSol: number;
  closingTime: string;
  eventTime: string;
  resolved: boolean;
  outcome?: string;
  category?: string;
}

export type Market = BooleanMarket | RaceMarket;

const STATUS_NAMES: Record<number, string> = {
  0: "active",
  1: "closed",
  2: "resolved",
  3: "voided",
  4: "disputed",
};

function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1e9;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const resp = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await resp.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`rpc error: ${json.error.message}`);
  return json.result;
}

function decodeMarket(base64Data: string, pubkey: string): BooleanMarket | null {
  try {
    const buf = Buffer.from(base64Data, "base64");

    // verify discriminator
    for (let i = 0; i < 8; i++) {
      if (buf[i] !== MARKET_DISC[i]) return null;
    }

    let offset = 8;

    const marketId = Number(buf.readBigUInt64LE(offset));
    offset += 8;

    const questionLen = buf.readUInt32LE(offset);
    offset += 4;
    const question = buf.subarray(offset, offset + questionLen).toString("utf8");
    offset += questionLen;

    const closingTime = Number(buf.readBigInt64LE(offset));
    offset += 8;
    const resolutionTime = Number(buf.readBigInt64LE(offset));
    offset += 8;

    // auto_stop_buffer
    offset += 8;

    const yesPool = buf.readBigUInt64LE(offset);
    offset += 8;
    const noPool = buf.readBigUInt64LE(offset);
    offset += 8;

    // snapshot pools
    offset += 16;

    const statusCode = buf.readUInt8(offset);

    const yesPoolSol = lamportsToSol(yesPool);
    const noPoolSol = lamportsToSol(noPool);
    const totalPoolSol = round4(yesPoolSol + noPoolSol);
    const yesPercent = totalPoolSol > 0 ? yesPoolSol / totalPoolSol : 0.5;
    const noPercent = totalPoolSol > 0 ? noPoolSol / totalPoolSol : 0.5;

    return {
      type: "boolean",
      publicKey: pubkey,
      marketId,
      question,
      yesPrice: round4(yesPercent),
      noPrice: round4(noPercent),
      poolSol: totalPoolSol,
      closingTime: new Date(closingTime * 1000).toISOString(),
      eventTime: new Date(resolutionTime * 1000).toISOString(),
      resolved: statusCode >= 2,
      status: STATUS_NAMES[statusCode] ?? "unknown",
      category: inferCategory(question),
    };
  } catch (err) {
    console.error(`decode failed for ${pubkey}:`, err);
    return null;
  }
}

function inferCategory(question: string): string {
  const q = question.toLowerCase();
  if (/btc|eth|sol|crypto|token|defi|nft/.test(q)) return "crypto";
  if (/nba|nfl|mlb|sports|game|match|team|mvp/.test(q)) return "sports";
  if (/election|president|vote|congress/.test(q)) return "elections";
  if (/weather|temperature|rain|snow/.test(q)) return "weather";
  return "general";
}

export async function fetchMarkets(): Promise<Market[]> {
  const markets: Market[] = [];

  try {
    // base58 encode of market discriminator for memcmp filter
    // [219, 190, 213, 55, 0, 227, 198, 154] -> base58
    const discBase58 = "dkokXHR3DTw"; // pre-computed from [219,190,213,55,0,227,198,154]

    const result = (await rpcCall("getProgramAccounts", [
      PROGRAM_ID,
      {
        encoding: "base64",
        filters: [{ memcmp: { offset: 0, bytes: discBase58 } }],
      },
    ])) as Array<{ pubkey: string; account: { data: [string, string] } }>;

    if (!Array.isArray(result)) return markets;

    for (const acct of result) {
      const market = decodeMarket(acct.account.data[0], acct.pubkey);
      if (market) markets.push(market);
    }
  } catch (err) {
    console.error("rpc fetch failed:", err);
    // try direct API as fallback
    try {
      const apiMarkets = await fetchFromApi();
      markets.push(...apiMarkets);
    } catch (apiErr) {
      console.error("api fallback also failed:", apiErr);
    }
  }

  return markets;
}

async function fetchFromApi(): Promise<Market[]> {
  const markets: Market[] = [];
  try {
    const resp = await fetch("https://baozi.bet/api/agents/proofs");
    if (!resp.ok) return markets;
    const data = (await resp.json()) as {
      proofs?: Array<{
        market_id?: number;
        question?: string;
        pool_sol?: number;
        yes_pct?: number;
        status?: string;
      }>;
    };

    if (data.proofs && Array.isArray(data.proofs)) {
      for (const p of data.proofs) {
        markets.push({
          type: "boolean",
          publicKey: "",
          marketId: p.market_id ?? 0,
          question: p.question ?? "",
          yesPrice: (p.yes_pct ?? 50) / 100,
          noPrice: 1 - (p.yes_pct ?? 50) / 100,
          poolSol: p.pool_sol ?? 0,
          closingTime: "",
          eventTime: "",
          resolved: p.status === "resolved",
          status: p.status ?? "active",
          category: inferCategory(p.question ?? ""),
        });
      }
    }
  } catch (err) {
    console.error("proofs api failed:", err);
  }
  return markets;
}

export function closeMcp(): void {
  // no-op: we use direct RPC, no MCP process to clean up
}
