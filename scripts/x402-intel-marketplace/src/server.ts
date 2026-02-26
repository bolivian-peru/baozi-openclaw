/**
 * x402 Intel Marketplace HTTP Server
 *
 * Endpoints:
 *   GET  /                    — marketplace info
 *   GET  /markets             — list active Baozi markets (via MCP)
 *   GET  /analyses            — list available analyses
 *   GET  /analyses/:id        — 402 response with x402 payment requirements
 *   POST /analyses            — publish new analysis (requires analyst registration)
 *   POST /analysts/register   — register as analyst
 *   POST /payments/verify     — verify payment proof, receive analysis content
 *   GET  /reputation          — all analyst reputation scores
 *   GET  /reputation/:wallet  — single analyst reputation
 */

import type { Server } from "bun";
import {
  getAnalyses,
  getAnalysis,
  publishAnalysis,
  registerAnalyst,
  recordPurchase,
  hasPurchased,
  computeReputation,
  getAnalysts,
  recordPrediction,
} from "./store.ts";
import {
  buildPaymentRequirements,
  verifyPaymentProof,
  formatX402Header,
  parseProofHeader,
} from "./x402.ts";
import { getActiveMarkets, formatAffiliateLink } from "./mcp.ts";

const PORT = parseInt(process.env.PORT ?? "3040");

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function notFound(msg: string): Response {
  return json({ error: msg }, 404);
}

function badRequest(msg: string): Response {
  return json({ error: msg }, 400);
}

async function parseBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function startServer(): Promise<Server> {
  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const { pathname } = url;
      const method = req.method;

      // ── GET / ─────────────────────────────────────────────────────────────
      if (method === "GET" && pathname === "/") {
        return json({
          name: "x402 Intel Marketplace",
          version: "1.0.0",
          description: "Agent-to-agent marketplace for prediction market analysis via x402 micropayments",
          network: "solana-mainnet",
          paymentProtocol: "x402 (simulated verification — see X402_NOTE)",
          X402_NOTE: "Payment verification is simulated for demo. See src/x402.ts for production upgrade path.",
          endpoints: {
            "GET /markets": "List active Baozi markets (real MCP data)",
            "GET /analyses": "Browse available analyses",
            "GET /analyses/:id": "Get analysis — returns 402 if not purchased",
            "POST /analyses": "Publish analysis (analyst only)",
            "POST /analysts/register": "Register as analyst",
            "POST /payments/verify": "Submit x402 proof, receive analysis",
            "GET /reputation": "All analyst reputation scores",
            "GET /reputation/:wallet": "Single analyst reputation",
          },
        });
      }

      // ── GET /markets ───────────────────────────────────────────────────────
      if (method === "GET" && pathname === "/markets") {
        const markets = await getActiveMarkets();
        return json({ count: markets.length, markets });
      }

      // ── GET /analyses ──────────────────────────────────────────────────────
      if (method === "GET" && pathname === "/analyses") {
        const analyses = getAnalyses();
        // Return previews only (thesis is paywalled)
        return json({
          count: analyses.length,
          analyses: analyses.map((a) => ({
            id: a.id,
            marketPda: a.marketPda,
            marketQuestion: a.marketQuestion,
            recommendedSide: a.recommendedSide,
            confidenceScore: a.confidenceScore,
            priceSol: a.priceSol,
            preview: a.preview,
            createdAt: a.createdAt,
            buyLink: `/analyses/${a.id}`,
          })),
        });
      }

      // ── GET /analyses/:id ──────────────────────────────────────────────────
      const analysisMatch = pathname.match(/^\/analyses\/([a-f0-9]+)$/);
      if (method === "GET" && analysisMatch) {
        const analysisId = analysisMatch[1];
        const analysis = getAnalysis(analysisId);
        if (!analysis) return notFound("Analysis not found");

        const analyst = getAnalysts().find((a) => a.wallet === analysis.analystWallet);
        const buyerWallet = url.searchParams.get("buyer");

        // Check if already purchased
        if (buyerWallet && hasPurchased(analysisId, buyerWallet)) {
          return json({
            ...analysis,
            affiliateLink: formatAffiliateLink(analysis.marketPda, analyst?.affiliateCode ?? ""),
            affiliateNote: "Place your bet via this link to earn the analyst 1% commission",
          });
        }

        // Return 402 with x402 payment requirements
        const requirements = buildPaymentRequirements(
          analysisId,
          analysis.priceSol,
          analysis.analystWallet,
          `Market thesis: ${analysis.marketQuestion} — ${analysis.recommendedSide} at ${analysis.confidenceScore}% confidence`
        );

        return json(
          {
            error: "Payment required",
            preview: analysis.preview,
            priceSol: analysis.priceSol,
            payTo: analysis.analystWallet,
            X402_NOTE: "Payment verification is simulated. POST /payments/verify with a proof to receive full analysis.",
            instructions: [
              "1. Generate payment proof: POST /payments/simulate-proof (demo) or use real x402 SDK",
              "2. Submit proof: POST /payments/verify with {analysisId, buyerWallet, proof}",
              "3. Full analysis is returned immediately upon verified payment",
            ],
          },
          402,
          {
            "X-Payment-Required": formatX402Header(requirements),
            "X-Payment-Resource": `/analyses/${analysisId}`,
            "X-Payment-Amount-SOL": String(analysis.priceSol),
            "X-Payment-To": analysis.analystWallet,
          }
        );
      }

      // ── POST /analysts/register ────────────────────────────────────────────
      if (method === "POST" && pathname === "/analysts/register") {
        const body = await parseBody(req) as { wallet?: string; displayName?: string } | null;
        if (!body?.wallet || !body?.displayName) {
          return badRequest("wallet and displayName required");
        }
        if (body.wallet.length < 32 || body.wallet.length > 50) {
          return badRequest("Invalid wallet address");
        }
        if (body.displayName.length < 2 || body.displayName.length > 40) {
          return badRequest("displayName must be 2-40 chars");
        }
        const analyst = registerAnalyst(body.wallet, body.displayName);
        return json({ success: true, analyst, message: "Registered as analyst. You can now publish analyses." });
      }

      // ── POST /analyses ─────────────────────────────────────────────────────
      if (method === "POST" && pathname === "/analyses") {
        const body = await parseBody(req) as {
          analystWallet?: string;
          marketPda?: string;
          marketQuestion?: string;
          thesis?: string;
          recommendedSide?: string;
          confidenceScore?: number;
          priceSol?: number;
        } | null;

        if (!body) return badRequest("Invalid request body");

        const { analystWallet, marketPda, marketQuestion, thesis, recommendedSide, confidenceScore, priceSol } = body;

        if (!analystWallet || !marketPda || !marketQuestion || !thesis || !recommendedSide || !confidenceScore || !priceSol) {
          return badRequest("Missing required fields: analystWallet, marketPda, marketQuestion, thesis, recommendedSide, confidenceScore, priceSol");
        }
        if (!["YES", "NO"].includes(recommendedSide)) {
          return badRequest("recommendedSide must be YES or NO");
        }
        if (confidenceScore < 1 || confidenceScore > 100) {
          return badRequest("confidenceScore must be 1-100");
        }
        if (thesis.length < 200 || thesis.length > 2000) {
          return badRequest("thesis must be 200-2000 chars");
        }
        if (priceSol < 0.001 || priceSol > 10) {
          return badRequest("priceSol must be 0.001-10");
        }

        // Ensure analyst is registered
        const analyst = getAnalysts().find((a) => a.wallet === analystWallet);
        if (!analyst) return badRequest("Analyst not registered. POST /analysts/register first.");

        const analysis = publishAnalysis(
          analystWallet, marketPda, marketQuestion, thesis,
          recommendedSide as "YES" | "NO", confidenceScore, priceSol
        );
        recordPrediction(analystWallet, analysis.id, marketPda, recommendedSide as "YES" | "NO", confidenceScore);

        return json({
          success: true,
          analysis,
          buyLink: `/analyses/${analysis.id}`,
          affiliateCode: analyst.affiliateCode,
          affiliateLink: formatAffiliateLink(marketPda, analyst.affiliateCode),
          message: "Analysis published. Buyers can now discover and purchase your thesis.",
        }, 201);
      }

      // ── POST /payments/simulate-proof ──────────────────────────────────────
      // Demo endpoint — helps buyers test the x402 flow without a real wallet
      if (method === "POST" && pathname === "/payments/simulate-proof") {
        const body = await parseBody(req) as { buyerWallet?: string; analysisId?: string } | null;
        if (!body?.buyerWallet || !body?.analysisId) {
          return badRequest("buyerWallet and analysisId required");
        }
        const analysis = getAnalysis(body.analysisId);
        if (!analysis) return notFound("Analysis not found");

        const { buildSimulatedPaymentProof } = await import("./x402.ts");
        const proof = buildSimulatedPaymentProof(body.buyerWallet, body.analysisId, analysis.priceSol);
        return json({
          proof,
          proofEncoded: Buffer.from(JSON.stringify(proof)).toString("base64"),
          note: "SIMULATED proof — use proofEncoded as X-Payment-Proof header or in POST /payments/verify",
        });
      }

      // ── POST /payments/verify ──────────────────────────────────────────────
      if (method === "POST" && pathname === "/payments/verify") {
        const body = await parseBody(req) as {
          analysisId?: string;
          buyerWallet?: string;
          proof?: unknown;
          proofEncoded?: string;
        } | null;

        if (!body?.analysisId || !body?.buyerWallet) {
          return badRequest("analysisId and buyerWallet required");
        }

        const analysis = getAnalysis(body.analysisId);
        if (!analysis) return notFound("Analysis not found");

        // Parse proof — accept object or base64-encoded string
        let proof = body.proof;
        if (!proof && body.proofEncoded) {
          proof = parseProofHeader(body.proofEncoded);
        }
        if (!proof) return badRequest("Payment proof required (proof or proofEncoded)");

        const requirements = buildPaymentRequirements(
          body.analysisId, analysis.priceSol, analysis.analystWallet, ""
        );

        const { valid, reason } = verifyPaymentProof(proof as ReturnType<typeof parseProofHeader> & object, requirements);
        if (!valid) {
          return json({ error: "Payment verification failed", reason }, 402);
        }

        const { paymentHash } = proof as { paymentHash: string };

        // Grant access
        recordPurchase(body.analysisId, body.buyerWallet, paymentHash);

        const analyst = getAnalysts().find((a) => a.wallet === analysis.analystWallet);
        const affiliateLink = formatAffiliateLink(analysis.marketPda, analyst?.affiliateCode ?? "");

        return json({
          success: true,
          analysis: {
            ...analysis,
            affiliateLink,
            affiliateNote: `Bet on this market via affiliate link to earn ${analyst?.displayName} a 1% commission`,
          },
          paymentHash,
          message: "Payment verified. Full analysis unlocked.",
        });
      }

      // ── GET /reputation ────────────────────────────────────────────────────
      if (method === "GET" && pathname === "/reputation") {
        const analysts = getAnalysts();
        const stats = analysts.map((a) => computeReputation(a.wallet)).filter(Boolean);
        return json({ count: stats.length, analysts: stats });
      }

      // ── GET /reputation/:wallet ────────────────────────────────────────────
      const repMatch = pathname.match(/^\/reputation\/(.+)$/);
      if (method === "GET" && repMatch) {
        const wallet = repMatch[1];
        const stats = computeReputation(wallet);
        if (!stats) return notFound("Analyst not found");
        return json(stats);
      }

      return notFound("Unknown endpoint. GET / for API docs.");
    },
  });

  console.log(`\n🏪 x402 Intel Marketplace running on http://localhost:${PORT}`);
  console.log(`   GET  /          → API docs`);
  console.log(`   GET  /markets   → Active Baozi markets (real MCP data)`);
  console.log(`   GET  /analyses  → Browse analyses`);
  console.log(`   POST /analysts/register → Become an analyst`);
  console.log(`   POST /analyses  → Publish analysis (paywalled)`);
  console.log(`   GET  /analyses/:id → 402 + x402 payment headers`);
  console.log(`   POST /payments/verify → Submit proof → unlock analysis\n`);

  return server;
}
