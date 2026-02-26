import { Client }    from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// ── PROVERB ENGINE ────────────────────────────────────────────────────────────
// Context-aware: reads market signals and selects the most fitting proverb.
// Categories: PATIENCE · TIMING · RISK · PROFIT_TAKING · COMMUNITY · BRAND

interface Proverb {
  zh: string;
  py: string;           // pinyin
  en: string;           // translation
  category: string;
  tags: string[];       // signal tags that trigger this proverb
}

const PROVERBS: Proverb[] = [
  {
    zh: '欲速则不达',
    py: 'yù sù zé bù dá',
    en: "can\'t rush hot tofu — patience brings results.",
    category: 'PATIENCE',
    tags: ['long_dated', 'days_remaining_gt_7', 'slow_movement'],
  },
  {
    zh: '慢工出细活',
    py: 'màn gōng chū xì huó',
    en: 'slow work, fine craft — quality takes the time it takes.',
    category: 'PATIENCE',
    tags: ['long_dated', 'low_volume'],
  },
  {
    zh: '好饭不怕晚',
    py: 'hǎo fàn bù pà wǎn',
    en: 'good food does not fear being late — worth waiting for.',
    category: 'TIMING',
    tags: ['long_dated', 'high_pool'],
  },
  {
    zh: '火候到了，自然熟',
    py: 'huǒ hòu dào le, zì rán shú',
    en: 'right heat, naturally cooked — the market resolves when ready.',
    category: 'TIMING',
    tags: ['close_odds', 'days_remaining_gt_3', 'days_remaining_lt_7'],
  },
  {
    zh: '民以食为天',
    py: 'mín yǐ shí wéi tiān',
    en: 'food is heaven for the people — the fundamentals always win.',
    category: 'COMMUNITY',
    tags: ['community_milestone', 'high_pool', 'resolved'],
  },
  {
    zh: '贪多嚼不烂',
    py: 'tān duō jiáo bù làn',
    en: 'bite off too much, can\'t chew — size your position carefully.',
    category: 'RISK',
    tags: ['lopsided_odds', 'high_pool', 'short_dated'],
  },
  {
    zh: '知足者常乐',
    py: 'zhī zú zhě cháng lè',
    en: 'contentment brings happiness — take the profit, leave the greed.',
    category: 'PROFIT_TAKING',
    tags: ['close_to_resolution', 'in_profit'],
  },
  {
    zh: '见好就收',
    py: 'jiàn hǎo jiù shōu',
    en: 'quit while ahead — smart exits are cooked, not gambled.',
    category: 'PROFIT_TAKING',
    tags: ['close_to_resolution', 'days_remaining_lt_3'],
  },
  {
    zh: '谋事在人，成事在天',
    py: 'móu shì zài rén, chéng shì zài tiān',
    en: 'you plan, fate decides — the market has final say.',
    category: 'ACCEPTANCE',
    tags: ['uncertain', 'close_odds', 'high_pool'],
  },
  {
    zh: '小笼包，大命运',
    py: 'xiǎo lóng bāo, dà mìng yùn',
    en: 'small steamer, big fate — every baozi hides a surprise.',
    category: 'BRAND',
    tags: ['any'],
  },
];

// Select best proverb for a market based on its signals
function selectProverb(signals: string[]): Proverb {
  // Score each proverb by tag overlap
  let best = PROVERBS[PROVERBS.length - 1]; // brand as fallback
  let bestScore = 0;

  for (const p of PROVERBS) {
    if (p.tags.includes('any')) continue;
    const score = p.tags.filter(t => signals.includes(t)).length;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

// Derive market signals from raw market data
function deriveSignals(market: any): string[] {
  const signals: string[] = [];
  const now   = Date.now();
  const close = market.close_time ? new Date(market.close_time).getTime() : null;
  const daysLeft = close ? (close - now) / 86400000 : null;

  if (daysLeft !== null) {
    if (daysLeft > 7)  signals.push('long_dated', 'days_remaining_gt_7');
    if (daysLeft > 3)  signals.push('days_remaining_gt_3');
    if (daysLeft < 7)  signals.push('days_remaining_lt_7');
    if (daysLeft < 3)  signals.push('close_to_resolution', 'days_remaining_lt_3', 'days_remaining_lt_3');
    if (daysLeft < 1)  signals.push('short_dated');
  }

  const pool = parseFloat(market.total_pool ?? market.pool_size ?? 0);
  if (pool > 20) signals.push('high_pool');
  if (pool < 2)  signals.push('low_volume');

  const outcomes = market.outcomes ?? market.options ?? [];
  if (outcomes.length >= 2) {
    const probs = outcomes.map((o: any) => parseFloat(o.probability ?? o.odds ?? 0));
    const maxP  = Math.max(...probs);
    const minP  = Math.min(...probs);
    if (maxP > 0.7)           signals.push('lopsided_odds');
    if (maxP < 0.6 && minP > 0.3) signals.push('close_odds', 'uncertain');
  }

  if (market.status === 'resolved') signals.push('resolved', 'close_to_resolution');

  return signals;
}

// Format time remaining as human text
function timeLabel(market: any): string {
  const close = market.close_time ? new Date(market.close_time) : null;
  if (!close) return 'open';
  const diff  = close.getTime() - Date.now();
  if (diff < 0) return 'resolved';
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `closing in ${days}d`;
  return `closing in ${hours}h`;
}

// Format odds line for one market
function oddsLine(market: any): string {
  const outcomes = market.outcomes ?? market.options ?? [];
  if (!outcomes.length) return '  odds: unavailable';
  return outcomes
    .slice(0, 4)
    .map((o: any) => {
      const name = (o.label ?? o.name ?? 'option').toLowerCase().slice(0, 20);
      const pct  = o.probability
        ? Math.round(parseFloat(o.probability) * 100) + '%'
        : o.odds ?? '?';
      return `  ${name}: ${pct}`;
    })
    .join(' | ');
}

// ── NIGHT KITCHEN AGENT ───────────────────────────────────────────────────────

export class NightKitchen {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@baozi.bet/mcp-server'],
    });
    this.client = new Client({ name: 'night-kitchen', version: '1.0.0' });
  }

  async connect() {
    await this.client.connect(this.transport);
    console.log('🥟  night kitchen — connected to baozi mcp');
  }

  async disconnect() {
    await this.transport.close();
  }

  // Call any MCP tool
  async tool(name: string, args: Record<string, unknown> = {}) {
    const result = await this.client.callTool({ name, arguments: args });
    const text   = (result.content as any[]).map((c: any) => c.text ?? '').join('');
    try { return JSON.parse(text); } catch { return text; }
  }

  // Build the full bilingual report
  async buildReport(): Promise<string> {
    // Fetch markets
    const marketsResp = await this.tool('list_markets', { limit: 10, status: 'open' });
    const markets: any[] = Array.isArray(marketsResp)
      ? marketsResp
      : (marketsResp?.markets ?? marketsResp?.data ?? []);

    // Also fetch race markets for variety
    let raceMarkets: any[] = [];
    try {
      const raceResp = await this.tool('list_race_markets', { limit: 5 });
      raceMarkets = Array.isArray(raceResp) ? raceResp : (raceResp?.markets ?? []);
    } catch { /* optional */ }

    const all = [...markets.slice(0, 5), ...raceMarkets.slice(0, 2)];

    const now       = new Date();
    const dateStr   = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const totalPool = all.reduce((s, m) => s + parseFloat(m.total_pool ?? m.pool_size ?? 0), 0);
    const resolved  = all.filter(m => m.status === 'resolved').length;
    const open      = all.filter(m => m.status !== 'resolved').length;

    // Pick a session-level proverb (brand or community feel)
    const sessionProverb = PROVERBS.find(p => p.category === 'COMMUNITY') ?? PROVERBS[PROVERBS.length - 1];

    const lines: string[] = [];

    // ── HEADER ──
    lines.push('🌙 night kitchen report');
    lines.push(dateStr);
    lines.push('');
    lines.push(`${all.length} markets on the stove. grandma checked the steamer.`);
    lines.push('');

    // ── PER-MARKET BLOCKS ──
    const usedProverbs = new Set<string>();
    for (const market of all.slice(0, 6)) {
      const signals  = deriveSignals(market);
      let   proverb  = selectProverb(signals);
      // avoid repeating the same proverb
      if (usedProverbs.has(proverb.zh)) {
        proverb = PROVERBS.filter(p => !usedProverbs.has(p.zh) && !p.tags.includes('any'))[0]
               ?? PROVERBS[PROVERBS.length - 1];
      }
      usedProverbs.add(proverb.zh);

      const title    = (market.question ?? market.title ?? 'unnamed market').toLowerCase();
      const poolStr  = parseFloat(market.total_pool ?? market.pool_size ?? 0).toFixed(1);
      const timeStr  = timeLabel(market);

      lines.push(`🥟 "${title}"`);
      lines.push(oddsLine(market));
      lines.push(`  pool: ${poolStr} sol | ${timeStr}`);
      lines.push('');
      lines.push(`  ${proverb.zh}`);
      lines.push(`  ${proverb.py}`);
      lines.push(`  "${proverb.en}"`);
      lines.push('');
      lines.push('───────────────────────────────');
      lines.push('');
    }

    // ── SUMMARY ──
    lines.push('kitchen summary');
    lines.push('');
    lines.push(`${open} markets cooking. ${resolved} resolved.`);
    lines.push(`total pool: ${totalPool.toFixed(1)} sol`);
    lines.push('');
    lines.push(`${sessionProverb.zh}`);
    lines.push(`${sessionProverb.py}`);
    lines.push(`"${sessionProverb.en}"`);
    lines.push('');
    lines.push('baozi.bet | 小笼包，大命运');
    lines.push('this is still gambling. play small, play soft.');

    return lines.join('\n');
  }

  // Post to AgentBook
  async postToAgentBook(report: string): Promise<string | null> {
    try {
      const result = await this.tool('create_post', { content: report });
      return result?.post_id ?? result?.id ?? null;
    } catch (e: any) {
      console.warn('⚠️  agentbook post skipped:', e.message);
      return null;
    }
  }

  async run() {
    await this.connect();

    try {
      console.log('🌙  generating bilingual market report…');
      const report = await this.buildReport();

      console.log('\n──────────────────────────────────────────');
      console.log(report);
      console.log('──────────────────────────────────────────\n');

      const postId = await this.postToAgentBook(report);
      if (postId) {
        console.log(`✅  posted to agentbook: ${postId}`);
      } else {
        console.log('📋  report generated. post manually or configure agentbook key.');
      }
    } finally {
      await this.disconnect();
    }
  }
}
