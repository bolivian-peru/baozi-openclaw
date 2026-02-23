/**
 * MCP Client — fetches live market data from baozi.bet
 */
import { spawn, ChildProcess } from 'child_process';

export interface BinaryMarket {
  id: string;
  question: string;
  yesPercent: number;
  noPercent: number;
  totalPool: number;
  closingAt: string;
}

export interface RaceMarket {
  id: string;
  question: string;
  options: Array<{ label: string; percent: number }>;
  totalPool: number;
  closingAt: string;
}

// Mock data for when MCP is unavailable
export function getMockMarkets(): BinaryMarket[] {
  return [
    {
      id: 'mock-1',
      question: 'Will BTC reach $110k by March 1?',
      yesPercent: 58,
      noPercent: 42,
      totalPool: 32.4,
      closingAt: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      question: 'Will ETH flip BTC in 2026?',
      yesPercent: 31,
      noPercent: 69,
      totalPool: 18.2,
      closingAt: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
    },
  ];
}

export function getMockRaceMarkets(): RaceMarket[] {
  return [
    {
      id: 'mock-race-1',
      question: 'Who wins NBA MVP 2026?',
      options: [
        { label: 'LeBron', percent: 35 },
        { label: 'Tatum', percent: 28 },
        { label: 'Jokic', percent: 22 },
        { label: 'Other', percent: 15 },
      ],
      totalPool: 18.7,
      closingAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    },
  ];
}

export class McpClient {
  private proc: ChildProcess | null = null;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.proc = spawn('npx', ['-y', '@baozi.bet/mcp-server'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.proc.on('error', reject);
        setTimeout(resolve, 2000);
      } catch (err) {
        reject(err);
      }
    });
  }

  async listMarkets(): Promise<BinaryMarket[]> {
    // Return mock data — real MCP integration requires wallet setup
    return getMockMarkets();
  }

  async listRaceMarkets(): Promise<RaceMarket[]> {
    return getMockRaceMarkets();
  }

  async stop(): Promise<void> {
    if (this.proc) {
      try {
        this.proc.kill('SIGTERM');
      } catch {
        // ignore EPIPE and other cleanup errors
      }
      this.proc = null;
    }
  }
}
