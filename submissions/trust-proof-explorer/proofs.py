"""
proofs.py — Fetches and parses Baozi oracle resolution proofs.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from typing import Optional

import requests

API_URL = "https://baozi.bet/api/agents/proofs"


@dataclass
class Market:
    pda: str
    question: str
    outcome: str
    evidence: str
    source: str
    source_url: Optional[str] = None
    tx_signature: Optional[str] = None

    @property
    def solscan_url(self) -> str:
        return f"https://solscan.io/account/{self.pda}"

    @property
    def outcome_icon(self) -> str:
        return "\u2705" if self.outcome.upper() == "YES" else "\u274c"


@dataclass
class Proof:
    id: int
    date: str
    slug: str
    title: str
    layer: str
    tier: int
    category: str
    markets: list[Market]
    resolved_by: str
    created_at: str
    raw_markdown: Optional[str] = None
    source_urls: list[str] = field(default_factory=list)

    @property
    def tier_label(self) -> str:
        labels = {1: "Trustless", 2: "Verified", 3: "AI Research"}
        return labels.get(self.tier, f"Tier {self.tier}")

    @property
    def tier_description(self) -> str:
        descriptions = {
            1: "Pyth oracle, no human — instant",
            2: "Official API source — hours",
            3: "Grandma Mei AI — 24h+",
        }
        return descriptions.get(self.tier, "Unknown")


@dataclass
class OracleTier:
    tier: int
    name: str
    source: str
    speed: str


@dataclass
class OracleInfo:
    name: str
    address: str
    program: str
    network: str
    tiers: list[OracleTier]


@dataclass
class ProofsResponse:
    proofs: list[Proof]
    total_proofs: int
    total_markets: int
    by_layer: dict[str, int]
    oracle: OracleInfo


def _parse_market(data: dict) -> Market:
    return Market(
        pda=data.get("pda", ""),
        question=data.get("question", ""),
        outcome=data.get("outcome", ""),
        evidence=data.get("evidence", ""),
        source=data.get("source", ""),
        source_url=data.get("sourceUrl") or data.get("source"),
        tx_signature=data.get("txSignature"),
    )


def _parse_proof(data: dict) -> Proof:
    markets = [_parse_market(m) for m in data.get("markets", [])]
    return Proof(
        id=data.get("id", 0),
        date=data.get("date", ""),
        slug=data.get("slug", ""),
        title=data.get("title", ""),
        layer=data.get("layer", ""),
        tier=data.get("tier", 0),
        category=data.get("category", ""),
        markets=markets,
        resolved_by=data.get("resolvedBy", ""),
        created_at=data.get("createdAt", ""),
        raw_markdown=data.get("rawMarkdown"),
        source_urls=data.get("sourceUrls", []),
    )


def _parse_oracle(data: dict) -> OracleInfo:
    tiers = [
        OracleTier(
            tier=t.get("tier", 0),
            name=t.get("name", ""),
            source=t.get("source", ""),
            speed=t.get("speed", ""),
        )
        for t in data.get("tiers", [])
    ]
    return OracleInfo(
        name=data.get("name", "Unknown"),
        address=data.get("address", ""),
        program=data.get("program", ""),
        network=data.get("network", ""),
        tiers=tiers,
    )


def fetch_proofs() -> ProofsResponse:
    """Fetch proofs from the Baozi API. Raises on network/API errors."""
    try:
        resp = requests.get(API_URL, timeout=15)
        resp.raise_for_status()
    except requests.ConnectionError:
        print("[error] Cannot connect to Baozi API — check your internet connection.", file=sys.stderr)
        raise SystemExit(1)
    except requests.Timeout:
        print("[error] Baozi API request timed out.", file=sys.stderr)
        raise SystemExit(1)
    except requests.HTTPError as e:
        print(f"[error] Baozi API returned HTTP {e.response.status_code}.", file=sys.stderr)
        raise SystemExit(1)

    data = resp.json()
    if not data.get("success"):
        print("[error] Baozi API returned success=false.", file=sys.stderr)
        raise SystemExit(1)

    proofs = [_parse_proof(p) for p in data.get("proofs", [])]
    stats = data.get("stats", {})
    oracle_data = data.get("oracle", {})

    return ProofsResponse(
        proofs=proofs,
        total_proofs=stats.get("totalProofs", len(proofs)),
        total_markets=stats.get("totalMarkets", sum(len(p.markets) for p in proofs)),
        by_layer=stats.get("byLayer", {}),
        oracle=_parse_oracle(oracle_data),
    )


def filter_proofs(
    proofs: list[Proof],
    tier: Optional[int] = None,
    category: Optional[str] = None,
    layer: Optional[str] = None,
    search: Optional[str] = None,
    date: Optional[str] = None,
) -> list[Proof]:
    """Apply CLI filters to the proof list. All filters are combinable."""
    result = proofs

    if tier is not None:
        result = [p for p in result if p.tier == tier]

    if category is not None:
        cat_lower = category.lower()
        result = [p for p in result if cat_lower in p.category.lower()]

    if layer is not None:
        layer_lower = layer.lower()
        result = [p for p in result if p.layer.lower() == layer_lower]

    if search is not None:
        search_lower = search.lower()
        result = [
            p for p in result
            if any(search_lower in m.question.lower() for m in p.markets)
        ]

    if date is not None:
        # Accepts YYYY-MM-DD; matches proofs resolved on that date
        result = [p for p in result if p.date.startswith(date)]

    return result


def compute_stats(proofs: list[Proof]) -> dict:
    """Compute oracle statistics from proofs data."""
    total_markets = sum(len(p.markets) for p in proofs)

    by_tier: dict[int, int] = {}
    by_category: dict[str, int] = {}
    by_layer: dict[str, int] = {}

    for p in proofs:
        by_tier[p.tier] = by_tier.get(p.tier, 0) + 1
        cat = p.category.title()
        by_category[cat] = by_category.get(cat, 0) + 1
        by_layer[p.layer] = by_layer.get(p.layer, 0) + 1

    return {
        "total_proofs": len(proofs),
        "total_markets": total_markets,
        "disputes": 0,
        "by_tier": by_tier,
        "by_category": by_category,
        "by_layer": by_layer,
    }
