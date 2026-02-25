#!/usr/bin/env ts-node
import axios from "axios";
import { Command } from "commander";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as fs from "fs";
import * as path from "path";

type AgentType = "crypto" | "trading" | "social" | "general";
type OnboardingStage =
  | "discovered"
  | "ready_to_outreach"
  | "outreach_prepared"
  | "onboarding_ready"
  | "first_bet_ready"
  | "low_priority";

interface CandidateAgent {
  id: string;
  name: string;
  source: string;
  framework: string;
  description: string;
  contact: string;
  agentType: AgentType;
  score: number;
  notes: string[];
}

interface OutreachMessage {
  agentId: string;
  title: string;
  body: string;
  persona: AgentType;
}

interface OnboardingEvidence {
  affiliateCode: string;
  affiliateCodeAvailable: boolean;
  affiliateLink: string;
  sampleMarketPda: string;
  sampleMarketQuestion: string;
  sampleQuote: Record<string, unknown>;
  txDrafts: {
    creatorProfile: Record<string, unknown> | null;
    registerAffiliate: Record<string, unknown> | null;
    firstBet: Record<string, unknown> | null;
  };
  networkStats: Record<string, unknown>;
  referrals: Record<string, unknown>;
  errors: string[];
}

interface RecruitmentRecord {
  candidate: CandidateAgent;
  stage: OnboardingStage;
  preparedAt: string;
  affiliateLink: string;
  sampleMarketPda: string;
  firstBetReady: boolean;
}

interface Dashboard {
  generatedAt: string;
  affiliateCode: string;
  totals: {
    discovered: number;
    outreachPrepared: number;
    onboardingReady: number;
    firstBetReady: number;
  };
  byStage: Record<OnboardingStage, number>;
  topCandidates: RecruitmentRecord[];
  network: {
    totalAgentAffiliates: number;
    totalReferrals: number;
    totalNetworkEarningsSol: number;
  };
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
}

const API_BASE = "https://baozi.bet";
const DEFAULT_LIMIT = 12;
const DEFAULT_WALLET = "BZQguC9CQAZrW8jMWGi19fUoubqECGtaSkStsv1kbLDd";
const PROOF_DIR = path.resolve(__dirname, "..", "proof");
const DATA_DIR = path.resolve(__dirname, "..", "data");

const OUTREACH_TEMPLATES: Record<AgentType, (p: {
  name: string;
  affiliateCode: string;
  affiliateLink: string;
  marketQuestion: string;
  marketPda: string;
}) => string> = {
  crypto: ({ name, affiliateCode, affiliateLink, marketQuestion, marketPda }) =>
    `hey ${name} - your market takes can monetize directly on baozi now.\n\nquick flow:\n1) npx @baozi.bet/mcp-server\n2) list_markets + get_quote\n3) build_bet_transaction\n\nyou can also register your own affiliate code and recruit others.\n\nstart link: ${affiliateLink}\ncode: ${affiliateCode}\nexample live market: ${marketQuestion}\nhttps://baozi.bet/market/${marketPda}`,

  trading: ({ name, affiliateCode, affiliateLink, marketQuestion, marketPda }) =>
    `hey ${name} - if you already run strategies, baozi is an easy new venue.\n\nwhy this is useful:\n- 69 mcp tools, no api key friction\n- direct quote + tx builders\n- affiliate + creator fee upside\n\njoin via ${affiliateLink} (ref: ${affiliateCode})\nfirst market to test: ${marketQuestion}\nhttps://baozi.bet/market/${marketPda}`,

  social: ({ name, affiliateCode, affiliateLink, marketQuestion, marketPda }) =>
    `hey ${name} - your audience is perfect for prediction market content loops.\n\nbaozi lets you:\n- discover hot markets\n- post takes and share outcomes\n- earn from referrals + creator fees\n\nonboarding link: ${affiliateLink}\nref code: ${affiliateCode}\nstarter market: ${marketQuestion}\nhttps://baozi.bet/market/${marketPda}`,

  general: ({ name, affiliateCode, affiliateLink, marketQuestion, marketPda }) =>
    `hey ${name} - practical way to earn from agent intelligence: onboard to baozi prediction markets.\n\nsetup:\n1) npx @baozi.bet/mcp-server\n2) list_markets\n3) get_quote\n4) build_bet_transaction\n\njoin: ${affiliateLink}\ncode: ${affiliateCode}\nfirst market: ${marketQuestion}\nhttps://baozi.bet/market/${marketPda}`,
};

class MCPClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private stdoutBuffer = "";

  async start(): Promise<void> {
    if (this.process) return;

    this.process = spawn("npx", ["-y", "@baozi.bet/mcp-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.process.stdout.on("data", (chunk: Buffer) => {
      this.stdoutBuffer += chunk.toString();
      this.flushStdoutLines();
    });

    this.process.stderr.on("data", () => {
      // The server prints startup details on stderr. Keep silent by default.
    });

    this.process.on("exit", () => {
      const err = new Error("MCP server exited unexpectedly");
      for (const [, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(err);
      }
      this.pending.clear();
      this.process = null;
    });

    await this.call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "baozi-agent-recruiter", version: "2.0.0" },
    });

    this.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    this.process.kill();
    this.process = null;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    const response = await this.call("tools/call", { name, arguments: args });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  private send(request: JsonRpcRequest): void {
    if (!this.process) throw new Error("MCP server is not started");
    this.process.stdin.write(`${JSON.stringify(request)}\n`);
  }

  private call(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    const id = this.nextId++;

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP timeout for ${method}`));
      }, 30000);

      this.pending.set(id, { resolve, reject, timer });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }

  private flushStdoutLines(): void {
    const lines = this.stdoutBuffer.split("\n");
    this.stdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parsed: JsonRpcResponse;
      try {
        parsed = JSON.parse(trimmed) as JsonRpcResponse;
      } catch {
        continue;
      }

      if (parsed.id === undefined) continue;
      const pending = this.pending.get(parsed.id);
      if (!pending) continue;

      clearTimeout(pending.timer);
      this.pending.delete(parsed.id);
      pending.resolve(parsed);
    }
  }
}

function ensureDir(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function writeJson(filePath: string, payload: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferAgentType(text: string): AgentType {
  const t = text.toLowerCase();
  if (/(crypto|solana|defi|onchain|prediction)/.test(t)) return "crypto";
  if (/(trading|quant|arb|execution|market maker|bot)/.test(t)) return "trading";
  if (/(social|content|community|twitter|telegram|youtube|tiktok)/.test(t)) return "social";
  return "general";
}

function scoreCandidate(description: string, framework: string): number {
  const d = description.toLowerCase();
  let score = 20;

  if (/(crypto|solana|prediction|market)/.test(d)) score += 25;
  if (/(trading|research|analysis|signal|quant)/.test(d)) score += 20;
  if (/(agent|autonomous|bot)/.test(d)) score += 15;
  if (/(langchain|eliza|agent kit|openclaw)/.test(framework.toLowerCase())) score += 10;
  if (description.length > 60) score += 5;

  return Math.min(score, 100);
}

async function discoverFromAgentBook(limit: number): Promise<CandidateAgent[]> {
  const url = `${API_BASE}/api/agentbook/posts?limit=${Math.max(limit * 3, 30)}`;
  const { data } = await axios.get(url, { timeout: 20000 });
  const posts = Array.isArray(data?.posts) ? data.posts : [];

  const byWallet = new Map<string, CandidateAgent>();
  for (const post of posts) {
    const wallet = String(post.walletAddress || post.author?.walletAddress || "").trim();
    if (!wallet) continue;

    const agentName = String(post.agent?.agentName || post.author?.name || `${wallet.slice(0, 6)}...`);
    const content = String(post.content || "");
    const existing = byWallet.get(wallet);
    const mergedDescription = `${existing?.description || ""}\n${content}`.trim();

    const framework = /langchain/i.test(content)
      ? "LangChain"
      : /eliza/i.test(content)
      ? "ElizaOS"
      : /openclaw/i.test(content)
      ? "OpenClaw"
      : "Unknown";

    const candidate: CandidateAgent = {
      id: wallet,
      name: agentName,
      source: "AgentBook",
      framework,
      description: mergedDescription,
      contact: wallet,
      agentType: inferAgentType(mergedDescription),
      score: scoreCandidate(mergedDescription, framework),
      notes: ["Discovered from AgentBook posts"],
    };

    byWallet.set(wallet, candidate);
  }

  return Array.from(byWallet.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}

async function discoverFromGitHubIssueComments(limit: number): Promise<CandidateAgent[]> {
  const issues = [39, 40, 41];
  const discovered: CandidateAgent[] = [];

  for (const issueNumber of issues) {
    const url = `https://api.github.com/repos/bolivian-peru/baozi-openclaw/issues/${issueNumber}/comments`;
    const { data } = await axios.get(url, { timeout: 20000, headers: { Accept: "application/vnd.github+json" } });
    const comments = Array.isArray(data) ? data : [];

    for (const c of comments) {
      const login = String(c?.user?.login || "").trim();
      if (!login) continue;

      const body = String(c?.body || "");
      const framework = /(langchain|eliza|openclaw|agent kit)/i.exec(body)?.[1] || "GitHub";
      const candidate: CandidateAgent = {
        id: `gh:${login}`,
        name: login,
        source: `GitHub issue #${issueNumber}`,
        framework,
        description: body.slice(0, 500),
        contact: `https://github.com/${login}`,
        agentType: inferAgentType(body),
        score: scoreCandidate(body, framework),
        notes: ["Commented on active Baozi bounty"],
      };
      discovered.push(candidate);
    }
  }

  const dedup = new Map<string, CandidateAgent>();
  for (const c of discovered) {
    const key = normalizeName(c.name);
    const prev = dedup.get(key);
    if (!prev || c.score > prev.score) dedup.set(key, c);
  }

  return Array.from(dedup.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}

function discoverFrameworkWatchlist(): CandidateAgent[] {
  const seeds = [
    {
      name: "agentnet_research",
      framework: "ElizaOS",
      description: "Autonomous crypto research and strategy agent building distribution loops.",
      contact: "https://github.com/topics/elizaos",
    },
    {
      name: "langchain_signal_lab",
      framework: "LangChain",
      description: "Signal extraction and market analysis pipeline for autonomous trading agents.",
      contact: "https://github.com/topics/langchain",
    },
    {
      name: "solana_agent_kit_builder",
      framework: "Solana Agent Kit",
      description: "Builds onchain-capable agents and wallet workflows on Solana.",
      contact: "https://github.com/topics/solana-agent-kit",
    },
    {
      name: "openclaw_operator",
      framework: "OpenClaw",
      description: "Operates coding + workflow agents and can integrate prediction market tools quickly.",
      contact: "https://github.com/openclaw",
    },
  ];

  return seeds.map((s, idx) => ({
    id: `seed:${idx + 1}`,
    name: s.name,
    source: "Framework watchlist",
    framework: s.framework,
    description: s.description,
    contact: s.contact,
    agentType: inferAgentType(s.description),
    score: scoreCandidate(s.description, s.framework),
    notes: ["High-fit framework target"],
  }));
}

function mergeCandidates(sources: CandidateAgent[][], limit: number): CandidateAgent[] {
  const merged = new Map<string, CandidateAgent>();

  for (const list of sources) {
    for (const item of list) {
      const key = `${normalizeName(item.name)}:${item.source.split(" ")[0]}`;
      const prev = merged.get(key);
      if (!prev || item.score > prev.score) {
        merged.set(key, item);
      }
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getStage(candidate: CandidateAgent, onboarding: OnboardingEvidence): OnboardingStage {
  if (candidate.score < 40) return "low_priority";
  if (!onboarding.sampleMarketPda) return "ready_to_outreach";
  if (!onboarding.txDrafts.firstBet) return "onboarding_ready";
  return "first_bet_ready";
}

function buildOutreach(candidate: CandidateAgent, onboarding: OnboardingEvidence): OutreachMessage {
  const marketQuestion = onboarding.sampleMarketQuestion || "Will a major AI market narrative shift this week?";
  const marketPda = onboarding.sampleMarketPda || "";
  const body = OUTREACH_TEMPLATES[candidate.agentType]({
    name: candidate.name,
    affiliateCode: onboarding.affiliateCode,
    affiliateLink: onboarding.affiliateLink,
    marketQuestion,
    marketPda,
  });

  return {
    agentId: candidate.id,
    persona: candidate.agentType,
    title: `baozi onboarding invite for ${candidate.name}`,
    body,
  };
}

async function parseToolJson(client: MCPClient, toolName: string, args: Record<string, unknown>): Promise<any> {
  const result = await client.callTool(toolName, args);
  const text = String(result?.content?.[0]?.text || "{}");
  return safeJsonParse(text);
}

async function gatherOnboardingEvidence(
  client: MCPClient,
  affiliateCode: string,
  wallet: string
): Promise<OnboardingEvidence> {
  const errors: string[] = [];

  const codeCheck = await parseToolJson(client, "check_affiliate_code", { code: affiliateCode }).catch((e) => {
    errors.push(`check_affiliate_code: ${(e as Error).message}`);
    return {};
  });

  const linkResult = await parseToolJson(client, "format_affiliate_link", { code: affiliateCode }).catch((e) => {
    errors.push(`format_affiliate_link: ${(e as Error).message}`);
    return {};
  });

  const marketsResult = await parseToolJson(client, "list_markets", { status: "Active" }).catch((e) => {
    errors.push(`list_markets: ${(e as Error).message}`);
    return {};
  });

  const markets = Array.isArray(marketsResult?.markets) ? marketsResult.markets : [];
  const openMarket = markets.find((m: any) => Boolean(m?.isBettingOpen)) || markets[0] || null;

  const quoteResult = openMarket
    ? await parseToolJson(client, "get_quote", {
        market: openMarket.publicKey,
        side: "Yes",
        amount: 0.1,
      }).catch((e) => {
        errors.push(`get_quote: ${(e as Error).message}`);
        return {};
      })
    : {};

  const txDrafts = {
    creatorProfile: null as Record<string, unknown> | null,
    registerAffiliate: null as Record<string, unknown> | null,
    firstBet: null as Record<string, unknown> | null,
  };

  txDrafts.creatorProfile = await parseToolJson(client, "build_create_creator_profile_transaction", {
    display_name: "recruiter_v2",
    creator_fee_bps: 50,
    creator_wallet: wallet,
  }).catch((e) => {
    errors.push(`build_create_creator_profile_transaction: ${(e as Error).message}`);
    return null;
  });

  txDrafts.registerAffiliate = await parseToolJson(client, "build_register_affiliate_transaction", {
    code: `${affiliateCode}42`.slice(0, 12),
    user_wallet: wallet,
  }).catch((e) => {
    errors.push(`build_register_affiliate_transaction: ${(e as Error).message}`);
    return null;
  });

  txDrafts.firstBet = openMarket
    ? await parseToolJson(client, "build_bet_transaction", {
        market: openMarket.publicKey,
        outcome: "yes",
        amount_sol: 0.01,
        user_wallet: wallet,
        affiliate_code: affiliateCode,
      }).catch((e) => {
        errors.push(`build_bet_transaction: ${(e as Error).message}`);
        return null;
      })
    : null;

  const referrals = await parseToolJson(client, "get_referrals", { code: affiliateCode }).catch((e) => {
    errors.push(`get_referrals: ${(e as Error).message}`);
    return {};
  });

  const networkStats = await parseToolJson(client, "get_agent_network_stats", {}).catch((e) => {
    errors.push(`get_agent_network_stats: ${(e as Error).message}`);
    return {};
  });

  return {
    affiliateCode,
    affiliateCodeAvailable: Boolean(codeCheck?.available),
    affiliateLink: String(linkResult?.link || `https://baozi.bet?ref=${affiliateCode}`),
    sampleMarketPda: String(openMarket?.publicKey || ""),
    sampleMarketQuestion: String(openMarket?.question || ""),
    sampleQuote: quoteResult,
    txDrafts,
    referrals,
    networkStats,
    errors,
  };
}

function buildRecruitmentRecords(
  candidates: CandidateAgent[],
  onboarding: OnboardingEvidence
): RecruitmentRecord[] {
  const now = new Date().toISOString();

  return candidates.map((candidate) => {
    const stage = getStage(candidate, onboarding);
    return {
      candidate,
      stage,
      preparedAt: now,
      affiliateLink: onboarding.affiliateLink,
      sampleMarketPda: onboarding.sampleMarketPda,
      firstBetReady: stage === "first_bet_ready",
    };
  });
}

function buildDashboard(
  affiliateCode: string,
  records: RecruitmentRecord[],
  onboarding: OnboardingEvidence
): Dashboard {
  const byStage: Record<OnboardingStage, number> = {
    discovered: 0,
    ready_to_outreach: 0,
    outreach_prepared: 0,
    onboarding_ready: 0,
    first_bet_ready: 0,
    low_priority: 0,
  };

  for (const r of records) {
    byStage[r.stage] += 1;
  }

  const totals = {
    discovered: records.length,
    outreachPrepared: records.filter((r) => r.stage !== "low_priority").length,
    onboardingReady: records.filter((r) => r.stage === "onboarding_ready" || r.stage === "first_bet_ready").length,
    firstBetReady: records.filter((r) => r.firstBetReady).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    affiliateCode,
    totals,
    byStage,
    topCandidates: records.slice(0, 8),
    network: {
      totalAgentAffiliates: Number(onboarding.networkStats?.totalAgentAffiliates || 0),
      totalReferrals: Number(onboarding.networkStats?.totalReferrals || 0),
      totalNetworkEarningsSol: Number(onboarding.networkStats?.totalNetworkEarningsSol || 0),
    },
  };
}

async function discoverCandidates(limit: number): Promise<CandidateAgent[]> {
  const [agentbook, github] = await Promise.all([
    discoverFromAgentBook(limit).catch(() => []),
    discoverFromGitHubIssueComments(limit).catch(() => []),
  ]);

  const watchlist = discoverFrameworkWatchlist();
  return mergeCandidates([agentbook, github, watchlist], limit);
}

function printDashboard(dashboard: Dashboard): void {
  console.log("\n=== Agent Recruiter Dashboard ===\n");
  console.log(`Generated: ${dashboard.generatedAt}`);
  console.log(`Affiliate Code: ${dashboard.affiliateCode}`);
  console.log(`Discovered: ${dashboard.totals.discovered}`);
  console.log(`Outreach Prepared: ${dashboard.totals.outreachPrepared}`);
  console.log(`Onboarding Ready: ${dashboard.totals.onboardingReady}`);
  console.log(`First Bet Ready: ${dashboard.totals.firstBetReady}`);
  console.log("\nTop candidates:");
  for (const [idx, r] of dashboard.topCandidates.entries()) {
    console.log(`${idx + 1}. ${r.candidate.name} | ${r.candidate.source} | ${r.candidate.agentType} | score=${r.candidate.score} | stage=${r.stage}`);
  }
  console.log("\nNetwork stats:");
  console.log(`- totalAgentAffiliates: ${dashboard.network.totalAgentAffiliates}`);
  console.log(`- totalReferrals: ${dashboard.network.totalReferrals}`);
  console.log(`- totalNetworkEarningsSol: ${dashboard.network.totalNetworkEarningsSol}`);
}

async function runRecruiterFlow(options: {
  affiliateCode: string;
  limit: number;
  wallet: string;
  writeProof: boolean;
  printOutreach: boolean;
}): Promise<void> {
  ensureDir(PROOF_DIR);
  ensureDir(DATA_DIR);

  const candidates = await discoverCandidates(options.limit);
  const client = new MCPClient();
  await client.start();

  try {
    const onboarding = await gatherOnboardingEvidence(client, options.affiliateCode, options.wallet);
    const records = buildRecruitmentRecords(candidates, onboarding);
    const dashboard = buildDashboard(options.affiliateCode, records, onboarding);
    const outreach = records
      .filter((r) => r.stage !== "low_priority")
      .map((r) => buildOutreach(r.candidate, onboarding));

    writeJson(path.join(DATA_DIR, "recruitment-dashboard.json"), dashboard);
    writeJson(path.join(DATA_DIR, "recruited-agents.json"), records);
    writeJson(path.join(DATA_DIR, "outreach-messages.json"), outreach);

    if (options.writeProof) {
      writeJson(path.join(PROOF_DIR, "sample-network-stats.json"), onboarding.networkStats);
      writeJson(path.join(PROOF_DIR, "sample-referrals.json"), onboarding.referrals);
      writeJson(path.join(PROOF_DIR, "sample-markets.json"), {
        sampleMarketPda: onboarding.sampleMarketPda,
        sampleMarketQuestion: onboarding.sampleMarketQuestion,
      });
      writeJson(path.join(PROOF_DIR, "sample-quote.json"), onboarding.sampleQuote);
      writeJson(path.join(PROOF_DIR, "sample-link-and-code-check.json"), {
        affiliateCode: onboarding.affiliateCode,
        affiliateCodeAvailable: onboarding.affiliateCodeAvailable,
        affiliateLink: onboarding.affiliateLink,
      });
      writeJson(path.join(PROOF_DIR, "sample-onboarding-transactions.json"), onboarding.txDrafts);
      writeJson(path.join(PROOF_DIR, "recruited-agents.json"), records);
      writeJson(path.join(PROOF_DIR, "outreach-messages.json"), outreach);
      writeJson(path.join(PROOF_DIR, "sample-errors.json"), { errors: onboarding.errors });

      const proofReadme = [
        "# Proof Artifacts (Bounty #41)",
        "",
        `Generated: ${new Date().toISOString()}`,
        "",
        "Files:",
        "- sample-network-stats.json (get_agent_network_stats)",
        "- sample-referrals.json (get_referrals)",
        "- sample-markets.json (list_markets)",
        "- sample-quote.json (get_quote)",
        "- sample-link-and-code-check.json (check_affiliate_code + format_affiliate_link)",
        "- sample-onboarding-transactions.json (build_create_creator_profile_transaction + build_register_affiliate_transaction + build_bet_transaction)",
        "- recruited-agents.json",
        "- outreach-messages.json",
        "- sample-errors.json",
        "",
        "Command used:",
        `BAOZI_LIVE=${process.env.BAOZI_LIVE || "0"} npm run proof`,
      ].join("\n");

      fs.writeFileSync(path.join(PROOF_DIR, "README.md"), proofReadme);
    }

    printDashboard(dashboard);

    if (options.printOutreach) {
      console.log("\n=== Outreach Messages ===\n");
      for (const msg of outreach.slice(0, 6)) {
        console.log(`[${msg.persona}] ${msg.title}`);
        console.log(msg.body);
        console.log("\n---\n");
      }
    }

    if (options.writeProof) {
      console.log(`Proof written to: ${PROOF_DIR}`);
    }
  } finally {
    await client.stop();
  }
}

const program = new Command();
program.name("agent-recruiter").description("Baozi Agent Recruiter bounty runner");

function withCommonOptions(cmd: Command): Command {
  return cmd
    .option("-a, --affiliate-code <code>", "Affiliate code", "JARVIS")
    .option("-l, --limit <n>", "Max candidate agents", String(DEFAULT_LIMIT))
    .option("-w, --wallet <wallet>", "Wallet for transaction drafting", process.env.RECRUITER_WALLET || DEFAULT_WALLET);
}

withCommonOptions(program.command("dashboard").description("Show recruiter dashboard")).action(async (opts) => {
  await runRecruiterFlow({
    affiliateCode: String(opts.affiliateCode),
    limit: Number(opts.limit || DEFAULT_LIMIT),
    wallet: String(opts.wallet || DEFAULT_WALLET),
    writeProof: false,
    printOutreach: false,
  });
});

withCommonOptions(program.command("outreach").description("Print outreach templates for top candidates")).action(async (opts) => {
  await runRecruiterFlow({
    affiliateCode: String(opts.affiliateCode),
    limit: Number(opts.limit || DEFAULT_LIMIT),
    wallet: String(opts.wallet || DEFAULT_WALLET),
    writeProof: false,
    printOutreach: true,
  });
});

withCommonOptions(program.command("proof").description("Generate proof artifacts in ./proof")).action(async (opts) => {
  await runRecruiterFlow({
    affiliateCode: String(opts.affiliateCode),
    limit: Number(opts.limit || DEFAULT_LIMIT),
    wallet: String(opts.wallet || DEFAULT_WALLET),
    writeProof: true,
    printOutreach: true,
  });
});

withCommonOptions(program.command("demo").description("Run dashboard + outreach + proof in one pass")).action(async (opts) => {
  await runRecruiterFlow({
    affiliateCode: String(opts.affiliateCode),
    limit: Number(opts.limit || DEFAULT_LIMIT),
    wallet: String(opts.wallet || DEFAULT_WALLET),
    writeProof: true,
    printOutreach: true,
  });
});

if (process.argv.length <= 2) {
  process.argv.push("dashboard");
}

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`Agent recruiter failed: ${err.message}`);
  process.exit(1);
});
