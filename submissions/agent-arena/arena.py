"""
arena.py — Arena logic: fetch positions, calculate P&L, rank agents.

Core data structures
--------------------
Position  — a single bet (open or resolved)
AgentStats — aggregated stats for one wallet
MarketInfo — pool state for one market
"""

from __future__ import annotations

import subprocess
import sys
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import mcp_client


# ── data classes ────────────────────────────────────────────────────


@dataclass
class Position:
    market_pda: str
    market_question: str
    side: str          # "Yes" or "No"
    amount: float      # SOL wagered
    unrealized_pnl: float = 0.0
    actual_pnl: float | None = None   # set when resolved
    outcome: str | None = None        # "won" / "lost" / None
    is_resolved: bool = False


@dataclass
class MarketInfo:
    pda: str
    question: str
    yes_pool: float       # SOL
    no_pool: float        # SOL
    total_pool: float     # SOL
    yes_pct: float        # 0-100
    no_pct: float         # 0-100
    status: str           # "Active", "Resolved", etc.
    closing_time: str     # ISO or epoch string
    hours_left: float
    positions: list[tuple[str, Position]] = field(default_factory=list)
    # (agent_name, Position) pairs — filled during dashboard assembly


@dataclass
class AgentStats:
    wallet: str
    name: str
    open_positions: list[Position] = field(default_factory=list)
    resolved_positions: list[Position] = field(default_factory=list)
    total_wagered: float = 0.0
    total_pnl: float = 0.0
    accuracy: float = 0.0     # 0-100
    win_streak: int = 0


# ── agent profile ──────────────────────────────────────────────────

PROFILE_URL = "https://baozi.bet/api/agents/profile/{wallet}"


def fetch_agent_name(wallet: str) -> str:
    """Fetch agent display name from Baozi API; fall back to truncated address."""
    try:
        result = subprocess.run(
            ["curl", "-s", "--max-time", "5", PROFILE_URL.format(wallet=wallet)],
            capture_output=True, text=True, timeout=8,
        )
        data = json.loads(result.stdout)
        name = data.get("name") or data.get("displayName") or data.get("username")
        if name:
            return str(name)
    except Exception:
        pass
    return _truncate_wallet(wallet)


def _truncate_wallet(wallet: str) -> str:
    if len(wallet) > 8:
        return wallet[:4] + "..." + wallet[-4:]
    return wallet


# ── market helpers ─────────────────────────────────────────────────


def _hours_left(raw: Any) -> float:
    if not raw:
        return 9999.0
    try:
        if isinstance(raw, (int, float)):
            ts = raw / 1000 if raw > 1e11 else raw
        else:
            s = str(raw).replace("Z", "+00:00")
            ts = datetime.fromisoformat(s).timestamp()
        return max(0.0, (ts - datetime.now(timezone.utc).timestamp()) / 3600)
    except Exception:
        return 9999.0


def _pool_sol(m: dict[str, Any]) -> float:
    v = m.get("totalPoolSol")
    if v is not None:
        return float(v)
    lamps = m.get("totalPool") or m.get("pool") or 0
    return float(lamps) / 1e9


def _yes_pct(m: dict[str, Any]) -> float:
    y = m.get("yesPercent")
    if y is not None:
        return float(y)
    outcomes = m.get("outcomes", [])
    for o in outcomes:
        if str(o.get("label", "")).upper() == "YES":
            p = o.get("probability") or o.get("odds", 0)
            return (p * 100) if p <= 1 else float(p)
    return 50.0


def parse_market(m: dict[str, Any]) -> MarketInfo:
    """Parse raw MCP market dict into a MarketInfo."""
    total = _pool_sol(m)
    y_pct = _yes_pct(m)
    n_pct = 100.0 - y_pct
    yes_pool = total * (y_pct / 100) if total > 0 else 0.0
    no_pool = total * (n_pct / 100) if total > 0 else 0.0

    closing = m.get("closingTime") or m.get("closeTime") or m.get("endTime") or ""
    status = m.get("status", "Active")
    if m.get("isBettingOpen"):
        status = "Active"

    return MarketInfo(
        pda=m.get("publicKey", ""),
        question=m.get("question", "Unknown market"),
        yes_pool=yes_pool,
        no_pool=no_pool,
        total_pool=total,
        yes_pct=y_pct,
        no_pct=n_pct,
        status=status,
        closing_time=str(closing),
        hours_left=_hours_left(closing),
    )


# ── P&L calculation ───────────────────────────────────────────────

FEE_RATE = 0.03  # 3% platform fee


def calc_unrealized_pnl(
    side: str,
    amount: float,
    market: MarketInfo,
) -> float:
    """Pari-mutuel unrealized P&L estimate."""
    if market.total_pool <= 0 or amount <= 0:
        return 0.0

    if side.lower() == "yes":
        pool = market.yes_pool if market.yes_pool > 0 else 0.01
    else:
        pool = market.no_pool if market.no_pool > 0 else 0.01

    payout_if_win = (market.total_pool / pool) * amount * (1 - FEE_RATE)
    return payout_if_win - amount


# ── fetch & compute agent stats ───────────────────────────────────


def _parse_position(
    raw: dict[str, Any],
    market_cache: dict[str, MarketInfo],
) -> Position:
    """Parse a raw position dict into a Position with P&L."""
    market_pda = raw.get("market") or raw.get("marketPda") or raw.get("publicKey", "")
    side = raw.get("side") or raw.get("outcome") or "Yes"
    amount_raw = raw.get("amount") or raw.get("stake") or raw.get("size") or 0
    amount = float(amount_raw)
    # Convert lamports to SOL if needed
    if amount > 1000:
        amount = amount / 1e9

    question = raw.get("question") or raw.get("marketQuestion") or ""
    is_resolved = raw.get("isResolved", False) or raw.get("settled", False)

    pos = Position(
        market_pda=market_pda,
        market_question=question,
        side=side,
        amount=amount,
        is_resolved=is_resolved,
    )

    if is_resolved:
        payout = raw.get("payout") or raw.get("winnings") or 0
        payout_f = float(payout)
        if payout_f > 1000:
            payout_f = payout_f / 1e9
        pos.actual_pnl = payout_f - amount
        pos.outcome = "won" if payout_f > amount else "lost"
    else:
        # Calculate unrealized P&L from market state
        market = market_cache.get(market_pda)
        if market:
            pos.unrealized_pnl = calc_unrealized_pnl(side, amount, market)
            if not pos.market_question:
                pos.market_question = market.question

    return pos


def fetch_agent_stats(
    wallet: str,
    name: str | None = None,
    market_cache: dict[str, MarketInfo] | None = None,
) -> AgentStats:
    """Fetch positions for a wallet and compute stats."""
    if market_cache is None:
        market_cache = {}

    agent_name = name or fetch_agent_name(wallet)
    raw_positions = mcp_client.get_positions(wallet)

    stats = AgentStats(wallet=wallet, name=agent_name)

    for raw in raw_positions:
        pos = _parse_position(raw, market_cache)
        if pos.is_resolved:
            stats.resolved_positions.append(pos)
        else:
            stats.open_positions.append(pos)

    # Aggregates
    stats.total_wagered = sum(p.amount for p in stats.open_positions + stats.resolved_positions)
    open_pnl = sum(p.unrealized_pnl for p in stats.open_positions)
    resolved_pnl = sum(p.actual_pnl or 0 for p in stats.resolved_positions)
    stats.total_pnl = open_pnl + resolved_pnl

    # Accuracy
    resolved_count = len(stats.resolved_positions)
    if resolved_count > 0:
        wins = sum(1 for p in stats.resolved_positions if p.outcome == "won")
        stats.accuracy = (wins / resolved_count) * 100
    else:
        stats.accuracy = 0.0

    # Win streak (most recent consecutive wins)
    streak = 0
    for p in reversed(stats.resolved_positions):
        if p.outcome == "won":
            streak += 1
        else:
            break
    stats.win_streak = streak

    return stats


def fetch_all_agents(
    wallets: list[str],
    names: dict[str, str] | None = None,
) -> tuple[list[AgentStats], list[MarketInfo]]:
    """Fetch data for all wallets in parallel. Returns (agents, markets)."""
    if names is None:
        names = {}

    # 1) Fetch markets and build cache
    raw_markets = mcp_client.list_markets()
    market_cache: dict[str, MarketInfo] = {}
    markets: list[MarketInfo] = []
    for m in raw_markets:
        info = parse_market(m)
        if info.pda:
            market_cache[info.pda] = info
        markets.append(info)

    # 2) Fetch agent names in parallel if not provided
    wallet_names: dict[str, str] = dict(names)
    missing = [w for w in wallets if w not in wallet_names]
    if missing:
        with ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(fetch_agent_name, w): w for w in missing}
            for f in as_completed(futures):
                w = futures[f]
                try:
                    wallet_names[w] = f.result()
                except Exception:
                    wallet_names[w] = _truncate_wallet(w)

    # 3) Fetch positions in parallel
    agents: list[AgentStats] = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(fetch_agent_stats, w, wallet_names.get(w), market_cache): w
            for w in wallets
        }
        for f in as_completed(futures):
            try:
                agents.append(f.result())
            except Exception as exc:
                w = futures[f]
                print(f"[arena] error fetching {w}: {exc}", file=sys.stderr)
                agents.append(AgentStats(
                    wallet=w,
                    name=wallet_names.get(w, _truncate_wallet(w)),
                ))

    # 4) Rank by P&L descending
    agents.sort(key=lambda a: a.total_pnl, reverse=True)

    # 5) Attach agent positions to markets
    for agent in agents:
        for pos in agent.open_positions:
            if pos.market_pda in market_cache:
                market_cache[pos.market_pda].positions.append((agent.name, pos))

    active_markets = [m for m in markets if m.status == "Active" and m.positions]

    return agents, active_markets


# ── demo mode mock data ───────────────────────────────────────────


def demo_data() -> tuple[list[AgentStats], list[MarketInfo]]:
    """Return realistic mock data — fully offline, no API calls."""

    # Markets
    m1 = MarketInfo(
        pda="BTC110kMar2026xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        question="Will BTC hit $110k by March 1?",
        yes_pool=28.0,
        no_pool=17.2,
        total_pool=45.2,
        yes_pct=62.0,
        no_pct=38.0,
        status="Active",
        closing_time="2026-03-01T00:00:00Z",
        hours_left=2.25,
    )

    m2 = MarketInfo(
        pda="ETH5kFeb2026xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        question="Will ETH break $5,000 before Feb 28?",
        yes_pool=14.3,
        no_pool=18.5,
        total_pool=32.8,
        yes_pct=43.6,
        no_pct=56.4,
        status="Active",
        closing_time="2026-02-28T23:59:59Z",
        hours_left=18.5,
    )

    # Agents
    alpha = AgentStats(
        wallet="A1phHunt3rxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        name="AlphaHunter",
        open_positions=[
            Position(
                market_pda=m1.pda, market_question=m1.question,
                side="Yes", amount=5.0,
                unrealized_pnl=calc_unrealized_pnl("Yes", 5.0, m1),
            ),
            Position(
                market_pda=m2.pda, market_question=m2.question,
                side="No", amount=3.0,
                unrealized_pnl=calc_unrealized_pnl("No", 3.0, m2),
            ),
        ],
        resolved_positions=[
            Position(
                market_pda="resolved1", market_question="SOL above $200 by Jan?",
                side="Yes", amount=4.0, actual_pnl=3.5, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved2", market_question="DOGE to $1 by Dec?",
                side="No", amount=2.5, actual_pnl=1.8, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved3", market_question="Fed rate cut in Jan?",
                side="Yes", amount=3.0, actual_pnl=2.2, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved4", market_question="XRP ETF approved?",
                side="Yes", amount=2.0, actual_pnl=-2.0, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved5", market_question="Nasdaq new ATH Jan?",
                side="Yes", amount=5.0, actual_pnl=4.2, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved6", market_question="AI bill passed?",
                side="No", amount=3.5, actual_pnl=2.8, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved7", market_question="Inflation below 2.5%?",
                side="Yes", amount=2.0, actual_pnl=1.5, outcome="won", is_resolved=True,
            ),
        ],
        total_wagered=45.2,
        total_pnl=12.5,
        accuracy=85.7,
        win_streak=3,
    )

    sage = AgentStats(
        wallet="Cr3pS4g3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        name="CryptoSage",
        open_positions=[
            Position(
                market_pda=m1.pda, market_question=m1.question,
                side="Yes", amount=3.5,
                unrealized_pnl=calc_unrealized_pnl("Yes", 3.5, m1),
            ),
        ],
        resolved_positions=[
            Position(
                market_pda="resolved8", market_question="BTC $100k by Jan?",
                side="Yes", amount=6.0, actual_pnl=4.1, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved9", market_question="ETH merge date?",
                side="No", amount=4.0, actual_pnl=-4.0, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved10", market_question="SOL flips BNB?",
                side="Yes", amount=3.0, actual_pnl=2.3, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved11", market_question="AVAX above $50?",
                side="Yes", amount=2.5, actual_pnl=1.8, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved12", market_question="Fed holds rates?",
                side="No", amount=3.5, actual_pnl=-3.5, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved13", market_question="Spot ETH ETF Q1?",
                side="Yes", amount=4.0, actual_pnl=3.2, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved14", market_question="Memecoin crash?",
                side="Yes", amount=2.0, actual_pnl=1.5, outcome="won", is_resolved=True,
            ),
        ],
        total_wagered=38.1,
        total_pnl=8.2,
        accuracy=71.4,
        win_streak=2,
    )

    bear = AgentStats(
        wallet="Be4rB0txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        name="BearBot",
        open_positions=[
            Position(
                market_pda=m1.pda, market_question=m1.question,
                side="No", amount=3.0,
                unrealized_pnl=calc_unrealized_pnl("No", 3.0, m1),
            ),
            Position(
                market_pda=m2.pda, market_question=m2.question,
                side="Yes", amount=2.5,
                unrealized_pnl=calc_unrealized_pnl("Yes", 2.5, m2),
            ),
        ],
        resolved_positions=[
            Position(
                market_pda="resolved15", market_question="BTC crash below $80k?",
                side="Yes", amount=4.0, actual_pnl=-4.0, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved16", market_question="Market cap drop 20%?",
                side="Yes", amount=3.0, actual_pnl=-3.0, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved17", market_question="DeFi TVL down Q4?",
                side="Yes", amount=2.0, actual_pnl=1.4, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved18", market_question="Stablecoin depeg?",
                side="Yes", amount=3.5, actual_pnl=2.5, outcome="won", is_resolved=True,
            ),
            Position(
                market_pda="resolved19", market_question="Binance delists?",
                side="No", amount=2.5, actual_pnl=-2.5, outcome="lost", is_resolved=True,
            ),
            Position(
                market_pda="resolved20", market_question="SOL below $100?",
                side="Yes", amount=3.0, actual_pnl=-3.0, outcome="lost", is_resolved=True,
            ),
        ],
        total_wagered=22.8,
        total_pnl=-2.1,
        accuracy=33.3,
        win_streak=0,
    )

    agents = [alpha, sage, bear]

    # Attach positions to markets
    for agent in agents:
        for pos in agent.open_positions:
            for m in [m1, m2]:
                if pos.market_pda == m.pda:
                    m.positions.append((agent.name, pos))

    active_markets = [m1, m2]

    return agents, active_markets
