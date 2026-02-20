#!/usr/bin/env python3
"""
agent.py — Agent Arena: Live AI Betting Competition Dashboard.

Monitors multiple AI agent wallets competing on Baozi prediction markets,
showing live positions, P&L, and rankings in a rich terminal UI.

Usage:
    python agent.py                        # live dashboard (default)
    python agent.py --wallets W1,W2,W3    # custom wallet list
    python agent.py --refresh 15          # refresh interval in seconds
    python agent.py --once                # run once, print, exit
    python agent.py --demo                # demo mode with mock data
"""

from __future__ import annotations

import argparse
import signal
import sys
import time
from datetime import datetime, timezone

from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

import arena

# Default wallets to track — includes our wallet + known Baozi creators.
# If fewer than 3 are reachable, the arena will auto-discover more from
# active Lab market creators via mcp_client.discover_wallets().
DEFAULT_WALLETS = [
    "GZgrz2vtbc1o1kjipM1X3EFAf2VM54j9MVxGWSGbGmai",  # CruzBot
    "DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj",  # known Baozi Labs creator
    "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",  # known Baozi Labs creator
]

REFRESH_DEFAULT = 30


# ── rendering ──────────────────────────────────────────────────────


def _pnl_color(val: float) -> str:
    if val > 0:
        return "green"
    if val < 0:
        return "red"
    return "white"


def _fmt_pnl(val: float) -> str:
    sign = "+" if val > 0 else ""
    return f"{sign}{val:.2f}"


def _fmt_hours(h: float) -> str:
    if h >= 9999:
        return "N/A"
    if h < 1:
        mins = int(h * 60)
        return f"{mins}m"
    if h < 24:
        return f"{h:.0f}h {int((h % 1) * 60)}m"
    days = int(h / 24)
    return f"{days}d {int(h % 24)}h"


def _truncate(wallet: str) -> str:
    if len(wallet) > 12:
        return wallet[:4] + "..."
    return wallet


def build_header(refresh_interval: int, countdown: int, demo: bool) -> Panel:
    """Build the header panel."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    mode = " [bold yellow](DEMO MODE)[/]" if demo else ""

    header_text = Text.from_markup(
        f"  [bold cyan]AGENT ARENA[/] — Live Competition{mode}\n"
        f"  Updated: {now}  |  Refresh in: {countdown}s"
    )
    return Panel(
        header_text,
        border_style="bright_cyan",
        padding=(0, 1),
    )


def build_leaderboard(agents: list[arena.AgentStats]) -> Panel:
    """Build the leaderboard table."""
    table = Table(
        show_header=True,
        header_style="bold white",
        border_style="cyan",
        expand=True,
        pad_edge=True,
    )
    table.add_column("Rk", style="bold", width=3, justify="center")
    table.add_column("Agent", style="bold white", width=14, no_wrap=True)
    table.add_column("Wallet", style="dim", width=9)
    table.add_column("#", justify="center", width=2)
    table.add_column("Acc", justify="center", width=5)
    table.add_column("W", justify="center", width=3)
    table.add_column("P&L SOL", justify="right", width=9)
    table.add_column("Vol SOL", justify="right", width=8)

    for i, agent in enumerate(agents, 1):
        rank_style = "bold yellow" if i == 1 else ("bold white" if i == 2 else "white")
        medal = {1: "#1", 2: "#2", 3: "#3"}.get(i, f"#{i}")
        pnl = _fmt_pnl(agent.total_pnl)
        pnl_style = _pnl_color(agent.total_pnl)
        acc = f"{agent.accuracy:.0f}%" if agent.accuracy > 0 else "-"
        streak = f"{agent.win_streak}W" if agent.win_streak > 0 else "-"
        open_count = str(len(agent.open_positions))

        table.add_row(
            Text(medal, style=rank_style),
            Text(agent.name, style="bold"),
            Text(_truncate(agent.wallet), style="dim"),
            open_count,
            acc,
            streak,
            Text(pnl, style=pnl_style),
            f"{agent.total_wagered:.1f}",
        )

    return Panel(
        table,
        title="[bold white]LEADERBOARD[/]",
        border_style="cyan",
        padding=(0, 0),
    )


def build_market_panel(market: arena.MarketInfo) -> Panel:
    """Build a panel for a single active market."""
    lines: list[str] = []

    pool_str = f"Pool: {market.total_pool:.1f} SOL"
    odds_str = f"YES: {market.yes_pct:.0f}%  |  NO: {market.no_pct:.0f}%"
    time_str = f"Closes: {_fmt_hours(market.hours_left)}"
    lines.append(f"  {pool_str}  |  {odds_str}  |  {time_str}")
    lines.append("")

    if market.positions:
        for agent_name, pos in market.positions:
            pnl_str = _fmt_pnl(pos.unrealized_pnl)
            pnl_clr = _pnl_color(pos.unrealized_pnl)
            side_clr = "green" if pos.side.lower() == "yes" else "red"
            lines.append(
                f"  [{side_clr}]{agent_name:14s}[/] -> "
                f"{pos.amount:.1f} SOL [{side_clr}]{pos.side.upper():3s}[/]  "
                f"(unrealized: [{pnl_clr}]{pnl_str} SOL[/])"
            )
    else:
        lines.append("  [dim]No tracked agents in this market[/]")

    content = Text.from_markup("\n".join(lines))
    question = market.question
    if len(question) > 70:
        question = question[:67] + "..."

    return Panel(
        content,
        title=f'[bold white]"{question}"[/]',
        border_style="bright_blue",
        padding=(0, 1),
    )


def build_dashboard(
    agents: list[arena.AgentStats],
    markets: list[arena.MarketInfo],
    refresh_interval: int,
    countdown: int,
    demo: bool,
) -> Group:
    """Compose the full dashboard as a Group of renderables."""
    parts: list[object] = []

    parts.append(build_header(refresh_interval, countdown, demo))
    parts.append(build_leaderboard(agents))

    # Market panels
    market_panels: list[Panel] = []
    for m in markets[:6]:
        market_panels.append(build_market_panel(m))

    if not market_panels:
        market_panels.append(Panel(
            Text.from_markup("  [dim]No active markets with tracked positions[/]"),
            title="[bold white]ACTIVE MARKETS[/]",
            border_style="bright_blue",
        ))

    markets_container = Panel(
        Group(*market_panels),
        title="[bold white]ACTIVE MARKETS[/]",
        border_style="cyan",
        padding=(0, 0),
    )
    parts.append(markets_container)

    # Agent detail: open positions for top agent
    if agents and agents[0].open_positions:
        top = agents[0]
        pos_table = Table(
            show_header=True,
            header_style="bold white",
            border_style="cyan",
            expand=True,
        )
        pos_table.add_column("Market", ratio=2, no_wrap=True)
        pos_table.add_column("Side", justify="center", width=5)
        pos_table.add_column("Amount", justify="right", width=10)
        pos_table.add_column("Unreal P&L", justify="right", width=12)

        for pos in top.open_positions:
            q = pos.market_question
            if len(q) > 45:
                q = q[:42] + "..."
            side_style = "green" if pos.side.lower() == "yes" else "red"
            pnl_style = _pnl_color(pos.unrealized_pnl)
            pos_table.add_row(
                q,
                Text(pos.side.upper(), style=side_style),
                f"{pos.amount:.2f} SOL",
                Text(f"{_fmt_pnl(pos.unrealized_pnl)} SOL", style=pnl_style),
            )
        detail_panel = Panel(
            pos_table,
            title=f"[bold white]{top.name} — Open Positions[/]",
            border_style="cyan",
            padding=(0, 0),
        )
        parts.append(detail_panel)

    return Group(*parts)


# ── fetch data ─────────────────────────────────────────────────────


def fetch_all_data(
    wallets: list[str],
    demo: bool = False,
) -> tuple[list[arena.AgentStats], list[arena.MarketInfo]]:
    """Fetch or generate all dashboard data."""
    if demo:
        return arena.demo_data()
    return arena.fetch_all_agents(wallets)


# ── main loop ──────────────────────────────────────────────────────


def run_once(
    wallets: list[str],
    demo: bool,
    console: Console,
) -> None:
    """Fetch data, render once, and exit."""
    agents, markets = fetch_all_data(wallets, demo)
    if not agents:
        console.print("[yellow]No agent data found.[/]")
        return
    layout = build_dashboard(agents, markets, 0, 0, demo)
    console.print(layout)


def run_loop(
    wallets: list[str],
    refresh_interval: int,
    demo: bool,
    console: Console,
) -> None:
    """Continuous refresh loop with Rich Live display."""
    # Graceful exit on Ctrl+C
    stop = False

    def _handler(sig: int, frame: object) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _handler)
    signal.signal(signal.SIGTERM, _handler)

    console.print(
        f"[bold cyan]Agent Arena[/] starting — "
        f"tracking {len(wallets)} wallet(s), "
        f"refresh every {refresh_interval}s  "
        f"[dim](Ctrl+C to quit)[/]\n"
    )

    with Live(console=console, refresh_per_second=1, screen=True) as live:
        while not stop:
            try:
                agents, markets = fetch_all_data(wallets, demo)
            except Exception as exc:
                console.print(f"[red]Error fetching data: {exc}[/]")
                agents, markets = [], []

            # Countdown loop
            for remaining in range(refresh_interval, 0, -1):
                if stop:
                    break
                layout = build_dashboard(
                    agents, markets, refresh_interval, remaining, demo
                )
                live.update(layout)
                time.sleep(1)

    console.print("\n[bold cyan]Agent Arena[/] stopped.")


# ── CLI ────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Agent Arena — Live AI Betting Competition Dashboard",
    )
    parser.add_argument(
        "--wallets",
        type=str,
        default=None,
        help="Comma-separated list of wallet addresses to track",
    )
    parser.add_argument(
        "--refresh",
        type=int,
        default=REFRESH_DEFAULT,
        help=f"Refresh interval in seconds (default: {REFRESH_DEFAULT})",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once, print dashboard, and exit",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Demo mode with mock data (no API needed)",
    )

    args = parser.parse_args()

    wallets = DEFAULT_WALLETS
    if args.wallets:
        wallets = [w.strip() for w in args.wallets.split(",") if w.strip()]

    # Auto-discover more wallets from active Lab market creators if we have < 3
    if not args.demo and len(wallets) < 3:
        console_pre = Console()
        console_pre.print("[dim]Discovering wallets from active markets...[/]")
        discovered = arena.mcp_client.discover_wallets(limit=50)
        for w in discovered:
            if w not in wallets:
                wallets.append(w)
            if len(wallets) >= 5:
                break

    if not wallets and not args.demo:
        print("Error: no wallets specified. Use --wallets or --demo.", file=sys.stderr)
        sys.exit(1)

    console = Console()

    if args.once:
        run_once(wallets, args.demo, console)
    else:
        run_loop(wallets, args.refresh, args.demo, console)


if __name__ == "__main__":
    main()
