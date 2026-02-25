from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional


AMOUNT_RE = re.compile(r"(?:\$\s?([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9][0-9,]*(?:\.[0-9]+)?)\s?(USDC|USDT|USD|SOL|ETH|BTC))", re.I)


@dataclass(frozen=True)
class Opportunity:
    source_url: str
    title: str
    body: str
    labels: List[str]
    created_at: str


@dataclass(frozen=True)
class FilterResult:
    accepted: bool
    amount_usd: Optional[Decimal]
    reason: str


def _extract_amount(text: str) -> Optional[Decimal]:
    m = AMOUNT_RE.search(text or "")
    if not m:
        return None
    raw = (m.group(1) or m.group(2) or "").replace(",", "")
    try:
        return Decimal(raw)
    except Exception:
        return None


def strict_bounty_filter(opp: Opportunity, min_usd: Decimal = Decimal("10")) -> FilterResult:
    label_set = {x.lower().strip() for x in opp.labels}
    if "bounty" not in label_set:
        return FilterResult(False, None, "missing bounty label")

    amt = _extract_amount(f"{opp.title}\n{opp.body}")
    if amt is None:
        return FilterResult(False, None, "missing explicit amount")
    if amt < min_usd:
        return FilterResult(False, amt, "below minimum")
    return FilterResult(True, amt, "ok")


if __name__ == "__main__":
    demo = Opportunity(
        source_url="https://github.com/bolivian-peru/baozi-openclaw/issues/40",
        title="[Bounty] Improve hunter reliability - $120",
        body="Need strict amount extraction and label checks.",
        labels=["bounty", "automation"],
        created_at="2026-02-24T00:00:00Z",
    )
    print(strict_bounty_filter(demo))
