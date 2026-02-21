/**
 * Dashboard
 *
 * Renders a rich terminal UI for Agent Arena using blessed.
 * Falls back to a plain ANSI renderer if blessed is unavailable
 * or the terminal doesn't support it.
 *
 * Layout:
 *   ┌── AGENT ARENA ─────────────────────────────────────────┐
 *   │ [header: title + last-refresh timestamp]               │
 *   ├── Active Markets ─────────────────────────────────────┤
 *   │  Market: "..."  Pool: X SOL  YES: 62% | NO: 38%       │
 *   │  ...                                                   │
 *   ├── Active Positions ────────────────────────────────────┤
 *   │  Agent-XXXX  → 5 SOL YES  P&L: +2.10  Acc: 78%       │
 *   ├── Leaderboard ─────────────────────────────────────────┤
 *   │  1. Agent-XXXX  78.0%  +12.50 SOL  W5                 │
 *   └────────────────────────────────────────────────────────┘
 */

import { ArenaState } from './types';
import { Leaderboard } from './leaderboard';

// ---------------------------------------------------------------------------
// ANSI colour helpers
// ---------------------------------------------------------------------------

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgBlue: '\x1b[44m',
  bgBlack: '\x1b[40m',
};

function col(text: string, ...codes: string[]): string {
  return codes.join('') + text + C.reset;
}

function pnlColor(n: number, text: string): string {
  return n >= 0 ? col(text, C.green) : col(text, C.red);
}

function streakColor(streak: number, text: string): string {
  if (streak > 0) return col(text, C.green, C.bold);
  if (streak < 0) return col(text, C.red);
  return col(text, C.dim);
}

// ---------------------------------------------------------------------------
// Terminal width utility
// ---------------------------------------------------------------------------

function termWidth(): number {
  return process.stdout.columns ?? 100;
}

function pad(s: string, n: number): string {
  const visible = stripAnsi(s).length;
  return s + ' '.repeat(Math.max(0, n - visible));
}

function rpad(s: string, n: number): string {
  const visible = stripAnsi(s).length;
  return ' '.repeat(Math.max(0, n - visible)) + s;
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function hr(width: number, char = '─'): string {
  return char.repeat(Math.max(0, width));
}

function sectionHeader(title: string, width: number): string {
  const inner = ` ${title} `;
  const left = Math.floor((width - 2 - inner.length) / 2);
  const right = width - 2 - inner.length - left;
  return (
    col('├', C.cyan) +
    hr(left, '─') +
    col(inner, C.bold, C.cyan) +
    hr(right, '─') +
    col('┤', C.cyan)
  );
}

function topBorder(title: string, width: number): string {
  const inner = `  ${title}  `;
  const right = width - 2 - inner.length;
  return (
    col('┌', C.cyan) +
    col(inner, C.bold, C.yellow) +
    hr(Math.max(0, right), '─') +
    col('┐', C.cyan)
  );
}

function bottomBorder(width: number): string {
  return col('└', C.cyan) + hr(width - 2, '─') + col('┘', C.cyan);
}

function row(content: string, width: number): string {
  const inner = ' ' + content;
  const visible = stripAnsi(inner).length;
  const padding = ' '.repeat(Math.max(0, width - 2 - visible));
  return col('│', C.cyan) + inner + padding + col('│', C.cyan);
}

// ---------------------------------------------------------------------------
// Dashboard class
// ---------------------------------------------------------------------------

export class Dashboard {
  private useBlessedIfAvailable: boolean;
  private blessedScreen: unknown = null;
  private lastRender = '';

  constructor(useBlessedIfAvailable = true) {
    this.useBlessedIfAvailable = useBlessedIfAvailable;
  }

  /**
   * Initialise the dashboard.
   * Attempts to set up blessed; falls back to ANSI if not available.
   */
  init(): void {
    if (this.useBlessedIfAvailable) {
      try {
        // Dynamically require blessed — if it fails, use ANSI fallback
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const blessed = require('blessed');
        this.blessedScreen = blessed.screen({
          smartCSR: true,
          title: 'Agent Arena',
        });
        // For simplicity, we render into a box and clear/update it
        // Full blessed widget layout would be a separate effort; we use
        // blessed only for screen control (clear, cursor hide) and render
        // ANSI content into a raw log element.
        (this.blessedScreen as { key: Function; destroy: Function }).key(
          ['q', 'C-c'],
          () => {
            (this.blessedScreen as { destroy: Function }).destroy();
            process.exit(0);
          },
        );
      } catch {
        this.blessedScreen = null;
      }
    }
  }

  /**
   * Render the current ArenaState to the terminal.
   */
  render(state: ArenaState): void {
    const output = this.buildOutput(state);
    if (output === this.lastRender) return; // no change
    this.lastRender = output;

    // Move cursor to top-left and overwrite
    process.stdout.write('\x1b[H\x1b[2J'); // clear screen
    process.stdout.write(output);
  }

  private buildOutput(state: ArenaState): string {
    const width = Math.min(termWidth(), 110);
    const lines: string[] = [];

    // ------ Header ------
    const now = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
    lines.push(topBorder('AGENT ARENA  --  Live AI Prediction Market Competition', width));
    lines.push(
      row(
        col('Cycle #' + state.cycleCount, C.bold) +
          col('  |  ', C.dim) +
          col('Markets: ' + state.markets.length, C.white) +
          col('  |  ', C.dim) +
          col('Agents: ' + state.agents.size, C.white) +
          col('  |  ', C.dim) +
          col('Refreshed: ' + now, C.dim),
        width,
      ),
    );

    // ------ Active Markets ------
    lines.push(sectionHeader('Active Markets', width));
    const activeMarkets = state.markets
      .filter((m) => m.status === 'active')
      .sort((a, b) => b.totalPool - a.totalPool)
      .slice(0, 5);

    if (activeMarkets.length === 0) {
      lines.push(row(col('No active markets found — polling...', C.dim), width));
    } else {
      for (const mkt of activeMarkets) {
        const question = mkt.question.length > 48
          ? mkt.question.slice(0, 45) + '...'
          : mkt.question;
        const pool = `${mkt.totalPool.toFixed(2)} SOL`;
        const yes = `${(mkt.yesOdds * 100).toFixed(1)}%`;
        const no = `${(mkt.noOdds * 100).toFixed(1)}%`;
        const closes = mkt.closingTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        const marketLine =
          col('"' + question + '"', C.bold) +
          col(`  Pool: `, C.dim) + col(pool, C.yellow) +
          col(`  YES: `, C.dim) + col(yes, C.green) +
          col(' | NO: ', C.dim) + col(no, C.red) +
          col(`  Closes: ${closes}`, C.dim);

        lines.push(row(marketLine, width));
      }
    }

    // ------ Active Positions ------
    lines.push(sectionHeader('Active Positions', width));

    const allPositions: Array<{
      label: string;
      wallet: string;
      question: string;
      side: string;
      amount: number;
      pnl: number;
      winRate: number;
    }> = [];

    for (const agent of state.agents.values()) {
      for (const pos of agent.currentPositions) {
        allPositions.push({
          label: agent.label,
          wallet: agent.wallet,
          question: pos.marketQuestion,
          side: pos.side,
          amount: pos.amount,
          pnl: pos.unrealisedPnl,
          winRate: agent.winRate,
        });
      }
    }

    if (allPositions.length === 0) {
      lines.push(row(col('No open positions — waiting for agent activity...', C.dim), width));
    } else {
      const sorted = allPositions.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
      for (const pos of sorted.slice(0, 8)) {
        const q = pos.question.length > 30 ? pos.question.slice(0, 28) + '..' : pos.question;
        const pnlStr = Leaderboard.formatPnl(pos.pnl) + ' SOL';
        const sideStr = pos.side === 'YES'
          ? col('YES', C.green, C.bold)
          : col('NO', C.red, C.bold);

        const posLine =
          col('>> ', C.magenta) +
          col(pad(pos.label, 12), C.bold) +
          col(' -> ', C.dim) +
          col(pos.amount.toFixed(2) + ' SOL ', C.yellow) +
          sideStr +
          col(`  "${q}"`, C.dim) +
          col('  uP&L: ', C.dim) +
          pnlColor(pos.pnl, pnlStr) +
          col(`  Acc: ${Leaderboard.formatWinRate(pos.winRate)}`, C.cyan);

        lines.push(row(posLine, width));
      }
    }

    // ------ Leaderboard ------
    lines.push(sectionHeader('Leaderboard', width));

    const header =
      col(rpad('#', 3), C.dim) +
      col(pad('Agent', 14), C.dim) +
      col(rpad('Win%', 7), C.dim) +
      col(rpad('P&L (SOL)', 12), C.dim) +
      col(rpad('Volume', 10), C.dim) +
      col(rpad('Bets', 6), C.dim) +
      col(rpad('Streak', 8), C.dim);
    lines.push(row(header, width));
    lines.push(row(col(hr(width - 4, '·'), C.dim), width));

    if (state.leaderboard.length === 0) {
      lines.push(row(col('Rankings not yet computed...', C.dim), width));
    } else {
      for (const entry of state.leaderboard) {
        const ag = entry.agent;
        const rankStr = rpad(String(entry.rank) + '.', 3);
        const pnlStr = Leaderboard.formatPnl(ag.totalPnl);
        const streakStr = Leaderboard.formatStreak(ag.streak);
        const winRateColor = ag.winRate >= 60 ? C.green : ag.winRate >= 40 ? C.yellow : C.red;

        const lb =
          col(rankStr, C.bold) + ' ' +
          pad(col(ag.label, C.bold), 14) +
          col(rpad(Leaderboard.formatWinRate(ag.winRate), 7), winRateColor) +
          pnlColor(ag.totalPnl, rpad(pnlStr, 12)) +
          col(rpad(ag.volume.toFixed(2), 10), C.yellow) +
          col(rpad(String(ag.totalBets), 6), C.white) +
          streakColor(ag.streak, rpad(streakStr, 8));

        lines.push(row(lb, width));
      }
    }

    // ------ Footer ------
    lines.push(bottomBorder(width));
    lines.push(
      col(
        `  Press Ctrl+C to exit  |  Poll: ${Math.round(
          state.cycleCount > 0
            ? (Date.now() - state.lastAgentRefresh.getTime()) / 1000
            : 0,
        )}s ago  |  q to quit`,
        C.dim,
      ),
    );

    return lines.join('\n') + '\n';
  }

  destroy(): void {
    if (this.blessedScreen) {
      try {
        (this.blessedScreen as { destroy: Function }).destroy();
      } catch {
        // ignore
      }
    }
  }
}
