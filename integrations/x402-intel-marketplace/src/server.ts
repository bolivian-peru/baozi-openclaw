/**
 * Marketplace HTTP Server
 *
 * Exposes the x402 Intel Marketplace as a REST API.
 * Uses Node.js built-in HTTP server (no framework dependency).
 *
 * Endpoints:
 *   POST /analysts              — Register analyst
 *   GET  /analysts              — List analysts (sorted by reputation)
 *   GET  /analysts/:wallet      — Get analyst profile
 *
 *   POST /intel                 — Publish analysis (analyst only)
 *   GET  /intel                 — Browse listings (teasers only)
 *   GET  /intel/:id             — Get listing details
 *
 *   POST /intel/:id/purchase    — Purchase intel via x402
 *                                  Returns 402 with payment request if unpaid,
 *                                  returns full thesis if proof provided.
 *
 *   POST /intel/:id/resolve     — Mark intel resolved (admin)
 *
 * x402 Flow:
 *   1. POST /intel/:id/purchase → 402 + payment details
 *   2. Client pays on Solana
 *   3. POST /intel/:id/purchase with x-payment header → 200 + thesis
 */
import http from "http";
import type { MarketplaceConfig } from "./types.js";
import { Marketplace } from "./marketplace.js";

export class MarketplaceServer {
  private marketplace: Marketplace;
  private server: http.Server;
  private port: number;

  constructor(config: Partial<MarketplaceConfig> = {}, port = 3000) {
    this.marketplace = new Marketplace(config);
    this.port = port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`\n🏪 x402 Intel Marketplace running on http://localhost:${this.port}`);
        console.log(`\nEndpoints:`);
        console.log(`  POST /analysts          — Register analyst`);
        console.log(`  GET  /analysts          — List all analysts`);
        console.log(`  GET  /analysts/:wallet  — Analyst profile`);
        console.log(`  POST /intel             — Publish analysis`);
        console.log(`  GET  /intel             — Browse listings`);
        console.log(`  GET  /intel/:id         — Listing detail`);
        console.log(`  POST /intel/:id/purchase — Buy via x402`);
        console.log(`  POST /intel/:id/resolve  — Resolve prediction`);
        console.log();
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    const method = req.method ?? "GET";

    try {
      // ── Analyst routes ────────────────────────────────────────────────────
      if (pathname === "/analysts" && method === "POST") {
        const body = await readBody(req);
        const { wallet, displayName, affiliateCode } = JSON.parse(body);
        if (!wallet || !displayName || !affiliateCode) {
          return json(res, 400, {
            error: "wallet, displayName, and affiliateCode are required",
          });
        }
        const analyst = this.marketplace.registerAnalyst({
          wallet,
          displayName,
          affiliateCode,
        });
        return json(res, 201, analyst);
      }

      if (pathname === "/analysts" && method === "GET") {
        const analysts = this.marketplace.listAnalysts();
        return json(res, 200, analysts);
      }

      const analystMatch = pathname.match(/^\/analysts\/(.+)$/);
      if (analystMatch && method === "GET") {
        const wallet = decodeURIComponent(analystMatch[1]);
        const analyst = this.marketplace.getAnalyst(wallet);
        if (!analyst) return json(res, 404, { error: "Analyst not found" });
        return json(res, 200, analyst);
      }

      // ── Intel routes ──────────────────────────────────────────────────────
      if (pathname === "/intel" && method === "POST") {
        const body = await readBody(req);
        const params = JSON.parse(body);
        const result = await this.marketplace.publishIntel(params);
        if (!result.success) return json(res, 400, { error: result.error });
        return json(res, 201, result.intel);
      }

      if (pathname === "/intel" && method === "GET") {
        const minConfidence = url.searchParams.get("minConfidence");
        const minTier = url.searchParams.get("minTier") ?? undefined;
        const analystWallet = url.searchParams.get("analystWallet") ?? undefined;
        const marketPda = url.searchParams.get("marketPda") ?? undefined;
        const limitStr = url.searchParams.get("limit");
        const limit = limitStr ? parseInt(limitStr) : undefined;

        const listings = this.marketplace.listIntel({
          analystWallet,
          marketPda,
          minConfidence: minConfidence ? parseInt(minConfidence) : undefined,
          minTier,
          limit,
        });
        return json(res, 200, listings);
      }

      const intelPurchaseMatch = pathname.match(/^\/intel\/([^/]+)\/purchase$/);
      if (intelPurchaseMatch && method === "POST") {
        const intelId = decodeURIComponent(intelPurchaseMatch[1]);
        const body = await readBody(req);
        const { buyerWallet, buyerPrivateKey } = JSON.parse(body);

        // Check for x-payment header (buyer providing proof after paying)
        const paymentHeader = req.headers["x-payment"];
        let paymentProof: any = undefined;
        if (paymentHeader) {
          try {
            const decoded = Buffer.from(paymentHeader as string, "base64").toString("utf-8");
            paymentProof = JSON.parse(decoded);
          } catch {
            return json(res, 400, { error: "Invalid x-payment header" });
          }
        }

        const result = await this.marketplace.purchaseIntel({
          intelId,
          buyerWallet,
          paymentProof,
          buyerPrivateKey,
        });

        if (!result.success && result.paymentRequest) {
          return json(res, 402, result.paymentRequest);
        }
        if (!result.success) {
          return json(res, 400, { error: result.error });
        }
        return json(res, 200, result.intel);
      }

      const intelResolveMatch = pathname.match(/^\/intel\/([^/]+)\/resolve$/);
      if (intelResolveMatch && method === "POST") {
        const intelId = decodeURIComponent(intelResolveMatch[1]);
        const body = await readBody(req);
        const { resolvedOutcome } = JSON.parse(body);
        if (!resolvedOutcome) {
          return json(res, 400, { error: "resolvedOutcome is required" });
        }
        const result = this.marketplace.resolveIntel(intelId, resolvedOutcome);
        if (!result.success) return json(res, 400, { error: result.error });
        return json(res, 200, result);
      }

      const intelDetailMatch = pathname.match(/^\/intel\/([^/]+)$/);
      if (intelDetailMatch && method === "GET") {
        const intelId = decodeURIComponent(intelDetailMatch[1]);
        const listings = this.marketplace.listIntel();
        const listing = listings.find((l) => l.id === intelId);
        if (!listing) return json(res, 404, { error: "Intel not found" });
        return json(res, 200, listing);
      }

      // ── Health check ──────────────────────────────────────────────────────
      if (pathname === "/health" && method === "GET") {
        return json(res, 200, { status: "ok", service: "x402-intel-marketplace" });
      }

      json(res, 404, { error: "Not found" });
    } catch (err: any) {
      console.error("Request error:", err);
      json(res, 500, { error: "Internal server error" });
    }
  }
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
