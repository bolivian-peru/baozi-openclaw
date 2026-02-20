/**
 * Baozi API client — markets + share cards
 */
import { config } from './config';

export interface BinaryMarket {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  outcome: string;
  yesPercent: number;
  noPercent: number;
  totalPoolSol: number;
  closingTime: string;
  isBettingOpen: boolean;
  category?: string;
  creator?: string;
  createdAt?: string;
}

export interface MarketSnapshot {
  binary: BinaryMarket[];
  timestamp: number;
}

let previousSnapshot: MarketSnapshot | null = null;

export async function fetchMarkets(): Promise<BinaryMarket[]> {
  const resp = await fetch(`${config.baoziApiUrl}/markets`);
  if (!resp.ok) throw new Error(`Markets API ${resp.status}: ${resp.statusText}`);
  const data = await resp.json() as any;
  // API returns { data: { binary: [...] } } or { binary: [...] }
  const binary = data?.data?.binary || data?.binary || [];
  return binary;
}

export function getShareCardUrl(marketPda: string): string {
  const params = new URLSearchParams({
    market: marketPda,
    wallet: config.walletAddress,
  });
  if (config.affiliateCode) params.set('ref', config.affiliateCode);
  return `${config.baoziApiUrl}/share/card?${params.toString()}`;
}

export function getMarketUrl(marketPda: string): string {
  const base = config.baoziApiUrl.replace('/api', '');
  const ref = config.affiliateCode ? `?ref=${config.affiliateCode}` : '';
  return `${base}/market/${marketPda}${ref}`;
}

export interface NotableEvent {
  type: 'new_market' | 'large_bet' | 'closing_soon' | 'resolved' | 'odds_shift';
  market: BinaryMarket;
  detail: string;
}

/**
 * Compare current markets to previous snapshot and detect notable events.
 */
export function detectNotableEvents(markets: BinaryMarket[]): NotableEvent[] {
  const events: NotableEvent[] = [];
  const now = Date.now();

  for (const m of markets) {
    const closingMs = new Date(m.closingTime).getTime();
    const hoursUntilClose = (closingMs - now) / (1000 * 60 * 60);

    // New market (< 1 hour old, has createdAt)
    if (m.createdAt) {
      const ageHours = (now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 1) {
        events.push({
          type: 'new_market',
          market: m,
          detail: `New market created ${Math.round(ageHours * 60)}min ago`,
        });
      }
    }

    // Closing soon (< 24 hours)
    if (hoursUntilClose > 0 && hoursUntilClose < 24 && m.isBettingOpen) {
      events.push({
        type: 'closing_soon',
        market: m,
        detail: `Closing in ${hoursUntilClose.toFixed(1)} hours`,
      });
    }

    // Resolved
    if (m.outcome !== 'Unresolved' && m.status !== 'Active') {
      events.push({
        type: 'resolved',
        market: m,
        detail: `Resolved: ${m.outcome}`,
      });
    }

    // Large pool (> 5 SOL)
    if (m.totalPoolSol > 5) {
      events.push({
        type: 'large_bet',
        market: m,
        detail: `Pool: ${m.totalPoolSol.toFixed(2)} SOL`,
      });
    }

    // Odds shift (compare to previous snapshot)
    if (previousSnapshot) {
      const prev = previousSnapshot.binary.find(p => p.publicKey === m.publicKey);
      if (prev) {
        const shift = Math.abs(m.yesPercent - prev.yesPercent);
        if (shift > 10) {
          events.push({
            type: 'odds_shift',
            market: m,
            detail: `Odds shifted ${shift.toFixed(1)}% (was ${prev.yesPercent}% YES, now ${m.yesPercent}%)`,
          });
        }
      }
    }
  }

  // Update snapshot
  previousSnapshot = { binary: markets, timestamp: now };

  return events;
}

/**
 * Post to AgentBook
 */
export async function postToAgentBook(content: string, imageUrl?: string): Promise<{ id: number } | null> {
  if (!config.walletAddress) return null;

  const body: any = {
    walletAddress: config.walletAddress,
    content,
  };
  if (imageUrl) body.imageUrl = imageUrl;

  const resp = await fetch(`${config.baoziApiUrl}/agentbook/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error(`AgentBook post failed: ${resp.status}`);
    return null;
  }
  return resp.json() as Promise<{ id: number }>;
}

/**
 * Post image to Telegram channel
 */
export async function postToTelegram(caption: string, imageUrl: string): Promise<boolean> {
  if (!config.telegramBotToken || !config.telegramChatId) return false;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      photo: imageUrl,
      caption,
      parse_mode: 'Markdown',
    }),
  });
  return resp.ok;
}
