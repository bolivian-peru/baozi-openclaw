#!/usr/bin/env python3
"""
reputation.py — SQLite-backed reputation tracker for prediction calls.

stores call history, computes hit rate, win streaks, and P&L.
"""

import os
import sqlite3
from datetime import datetime, timezone
from typing import Any


DB_PATH = os.environ.get("CALLS_DB", "calls.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY,
    wallet TEXT,
    question TEXT,
    market_pda TEXT,
    side TEXT,
    bet_amount REAL,
    market_type TEXT,
    event_time TEXT,
    close_time TEXT,
    created_at TEXT,
    resolution TEXT,
    pnl REAL,
    share_card_url TEXT
);
"""


def _connect(db_path: str | None = None) -> sqlite3.Connection:
    """open (and optionally create) the calls database."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    conn.commit()
    return conn


def add_call(
    wallet: str,
    question: str,
    market_pda: str,
    side: str,
    bet_amount: float,
    market_type: str,
    event_time: str,
    close_time: str,
    share_card_url: str = "",
    db_path: str | None = None,
) -> int:
    """insert a new call and return its row id."""
    conn = _connect(db_path)
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        """INSERT INTO calls
           (wallet, question, market_pda, side, bet_amount,
            market_type, event_time, close_time, created_at,
            resolution, pnl, share_card_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)""",
        (wallet, question, market_pda, side, bet_amount,
         market_type, event_time, close_time, now, share_card_url),
    )
    conn.commit()
    row_id = cur.lastrowid
    conn.close()
    return row_id  # type: ignore[return-value]


def resolve_call(
    call_id: int,
    resolution: str,
    pnl: float,
    db_path: str | None = None,
) -> None:
    """mark a call as resolved with outcome and P&L."""
    conn = _connect(db_path)
    conn.execute(
        "UPDATE calls SET resolution = ?, pnl = ? WHERE id = ?",
        (resolution, pnl, call_id),
    )
    conn.commit()
    conn.close()


def get_all_calls(wallet: str | None = None, db_path: str | None = None) -> list[dict[str, Any]]:
    """return all calls, optionally filtered by wallet."""
    conn = _connect(db_path)
    if wallet:
        rows = conn.execute(
            "SELECT * FROM calls WHERE wallet = ? ORDER BY created_at DESC", (wallet,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM calls ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_calls(
    n: int = 5,
    wallet: str | None = None,
    db_path: str | None = None,
) -> list[dict[str, Any]]:
    """return the n most recent calls."""
    conn = _connect(db_path)
    if wallet:
        rows = conn.execute(
            "SELECT * FROM calls WHERE wallet = ? ORDER BY created_at DESC LIMIT ?",
            (wallet, n),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM calls ORDER BY created_at DESC LIMIT ?", (n,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def compute_reputation(wallet: str | None = None, db_path: str | None = None) -> dict[str, Any]:
    """compute reputation stats for a wallet (or all wallets)."""
    calls = get_all_calls(wallet, db_path)

    total = len(calls)
    resolved = [c for c in calls if c["resolution"] is not None]
    correct = [c for c in resolved if c["resolution"] == "correct"]
    incorrect = [c for c in resolved if c["resolution"] == "incorrect"]
    pending = [c for c in calls if c["resolution"] is None]

    hit_rate = (len(correct) / len(resolved) * 100) if resolved else 0.0

    total_wagered = sum(c["bet_amount"] for c in calls if c["bet_amount"])
    total_pnl = sum(c["pnl"] for c in resolved if c["pnl"] is not None)

    # win streak (most recent consecutive wins)
    win_streak = 0
    for c in sorted(resolved, key=lambda x: x["created_at"], reverse=True):
        if c["resolution"] == "correct":
            win_streak += 1
        else:
            break

    recent = get_recent_calls(5, wallet, db_path)

    return {
        "total_calls": total,
        "resolved": len(resolved),
        "correct": len(correct),
        "incorrect": len(incorrect),
        "pending": len(pending),
        "hit_rate": hit_rate,
        "total_wagered": total_wagered,
        "total_pnl": total_pnl,
        "win_streak": win_streak,
        "recent_calls": recent,
    }


def format_reputation(stats: dict[str, Any]) -> str:
    """format reputation stats into a display string."""
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("  CALLS TRACKER — REPUTATION DASHBOARD")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"  Total calls:      {stats['total_calls']}")
    lines.append(f"  Resolved:         {stats['resolved']}")
    lines.append(f"  Correct:          {stats['correct']}")
    lines.append(f"  Incorrect:        {stats['incorrect']}")
    lines.append(f"  Pending:          {stats['pending']}")
    lines.append(f"  Hit rate:         {stats['hit_rate']:.1f}%")
    lines.append("")
    lines.append(f"  SOL wagered:      {stats['total_wagered']:.4f} SOL")
    pnl = stats["total_pnl"]
    pnl_sign = "+" if pnl >= 0 else ""
    lines.append(f"  Total P&L:        {pnl_sign}{pnl:.4f} SOL")
    lines.append(f"  Win streak:       {stats['win_streak']}")
    lines.append("")

    lines.append("  RECENT CALLS:")
    lines.append("  " + "-" * 56)
    if not stats["recent_calls"]:
        lines.append("  (no calls yet)")
    for c in stats["recent_calls"]:
        status = c["resolution"] or "pending"
        status_icon = {"correct": "[+]", "incorrect": "[-]", "pending": "[?]"}.get(
            status, "[?]"
        )
        q = c["question"][:45]
        side = c["side"]
        amt = c["bet_amount"]
        pnl_str = ""
        if c["pnl"] is not None:
            s = "+" if c["pnl"] >= 0 else ""
            pnl_str = f" | P&L: {s}{c['pnl']:.4f}"
        lines.append(f"  {status_icon} {q}")
        lines.append(f"      {side} @ {amt:.4f} SOL{pnl_str}")
    lines.append("")
    lines.append("=" * 60)
    return "\n".join(lines)


def format_calls_list(calls: list[dict[str, Any]]) -> str:
    """format a list of calls for display."""
    if not calls:
        return "\n  (no calls recorded yet)\n"

    lines: list[str] = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("  CALLS TRACKER — ALL CALLS")
    lines.append("=" * 60)

    for i, c in enumerate(calls, 1):
        status = c["resolution"] or "pending"
        status_icon = {"correct": "[+]", "incorrect": "[-]", "pending": "[?]"}.get(
            status, "[?]"
        )
        lines.append("")
        lines.append(f"  #{i} {status_icon} {c['question'][:55]}")
        lines.append(f"      Side: {c['side']} | Bet: {c['bet_amount']:.4f} SOL | Type: {c['market_type']}")
        lines.append(f"      Market: {c['market_pda'][:20]}..." if c["market_pda"] else "      Market: (none)")
        lines.append(f"      Created: {c['created_at'][:19]}")
        if c["resolution"]:
            pnl_s = ""
            if c["pnl"] is not None:
                s = "+" if c["pnl"] >= 0 else ""
                pnl_s = f" | P&L: {s}{c['pnl']:.4f} SOL"
            lines.append(f"      Result: {c['resolution']}{pnl_s}")
        if c.get("share_card_url"):
            lines.append(f"      Share: {c['share_card_url']}")

    lines.append("")
    lines.append("=" * 60)
    return "\n".join(lines)
