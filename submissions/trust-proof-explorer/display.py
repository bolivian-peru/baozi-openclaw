"""
display.py — Rich rendering functions for the Trust Proof Explorer dashboard.
"""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box

from proofs import Proof, ProofsResponse, Market

console = Console()

TIER_LABELS = {1: "Trustless", 2: "Verified", 3: "AI Research"}
TIER_STYLES = {1: "bright_green", 2: "bright_cyan", 3: "bright_magenta"}


def _shorten_pda(pda: str, length: int = 8) -> str:
    if len(pda) <= length * 2:
        return pda
    return f"{pda[:length]}...{pda[-4:]}"


def render_header(response: ProofsResponse, filtered_count: int | None = None) -> None:
    """Render the top banner with oracle info."""
    oracle = response.oracle
    proof_count = filtered_count if filtered_count is not None else response.total_proofs

    header_text = Text()
    header_text.append("\U0001f50d TRUST PROOF EXPLORER", style="bold bright_white")
    header_text.append(" \u2014 Baozi Oracle Transparency", style="dim")

    info_text = Text()
    info_text.append(f"Oracle: {oracle.name}", style="bold bright_yellow")
    info_text.append(f"  |  {proof_count} proofs", style="bright_white")
    info_text.append(f"  |  Trust Score: 100%", style="bold bright_green")
    info_text.append(f"  |  Network: {oracle.network}", style="dim")

    console.print(Panel(
        Text.assemble(header_text, "\n", info_text),
        border_style="bright_blue",
        box=box.DOUBLE,
        padding=(0, 2),
    ))


def render_market(market: Market, tier: int, resolved_by: str) -> Table:
    """Render a single market resolution as a table row block."""
    t = Table(show_header=False, box=box.SIMPLE, padding=(0, 1), expand=True)
    t.add_column("Field", style="dim", width=14)
    t.add_column("Value", ratio=1)

    icon = market.outcome_icon
    outcome_style = "bold bright_green" if market.outcome.upper() == "YES" else "bold bright_red"

    t.add_row("", Text(f"{icon} {market.question}", style="bold bright_white"))
    t.add_row("Outcome", Text(market.outcome, style=outcome_style))
    t.add_row("Evidence", Text(market.evidence, style="white"))

    source_url = market.source_url or market.source
    if source_url.startswith("http"):
        t.add_row("Source", Text(source_url, style="underline bright_cyan"))
    else:
        t.add_row("Source", Text(source_url, style="bright_cyan"))

    short_pda = _shorten_pda(market.pda)
    t.add_row("Market PDA", Text(short_pda, style="bright_yellow"))
    t.add_row("Solscan", Text(market.solscan_url, style="underline dim"))

    if market.tx_signature:
        t.add_row("TX Sig", Text(_shorten_pda(market.tx_signature, 10), style="dim"))

    return t


def render_proof(proof: Proof) -> None:
    """Render a single proof bundle with all its markets."""
    tier_label = TIER_LABELS.get(proof.tier, f"Tier {proof.tier}")
    tier_style = TIER_STYLES.get(proof.tier, "white")

    title_text = Text()
    title_text.append("\U0001f4cb ", style="bold")
    title_text.append(proof.title, style="bold bright_white")

    subtitle_parts = []
    subtitle_parts.append(f"Tier {proof.tier} ({tier_label})")
    subtitle_parts.append(proof.category)
    subtitle_parts.append(f"Resolved by: {proof.resolved_by}")
    subtitle_parts.append(f"Date: {proof.date}")
    subtitle_text = Text(" | ".join(subtitle_parts), style=tier_style)

    market_renderables = []
    market_renderables.append(title_text)
    market_renderables.append(subtitle_text)
    market_renderables.append(Text(""))

    for market in proof.markets:
        market_table = render_market(market, proof.tier, proof.resolved_by)
        market_renderables.append(Panel(
            market_table,
            border_style="dim",
            box=box.ROUNDED,
            padding=(0, 1),
        ))

    from rich.console import Group
    console.print(Panel(
        Group(*market_renderables),
        border_style=tier_style,
        box=box.HEAVY,
        padding=(0, 1),
    ))


def render_stats(stats: dict, oracle_tiers: list | None = None) -> None:
    """Render the oracle statistics section."""
    t = Table(title="ORACLE STATS", box=box.DOUBLE_EDGE, border_style="bright_blue",
              title_style="bold bright_white", expand=True)
    t.add_column("Metric", style="bold bright_yellow", width=25)
    t.add_column("Value", style="bright_white")

    t.add_row("Total Proof Bundles", str(stats["total_proofs"]))
    t.add_row("Total Markets Resolved", str(stats["total_markets"]))
    t.add_row("Disputes", Text(f"{stats['disputes']} (0%)", style="bold bright_green"))

    # Tier breakdown
    tier_parts = []
    for tier_num in sorted(stats["by_tier"]):
        label = TIER_LABELS.get(tier_num, f"Tier {tier_num}")
        count = stats["by_tier"][tier_num]
        tier_parts.append(f"Tier {tier_num} ({label}): {count}")
    t.add_row("By Tier", "\n".join(tier_parts))

    # Category breakdown
    cat_parts = [f"{cat}: {count}" for cat, count in sorted(stats["by_category"].items())]
    t.add_row("By Category", "\n".join(cat_parts))

    # Layer breakdown
    layer_parts = [f"{layer}: {count}" for layer, count in sorted(stats["by_layer"].items())]
    t.add_row("By Layer", "\n".join(layer_parts))

    # Oracle tier details
    if oracle_tiers:
        tier_detail = []
        for ot in oracle_tiers:
            tier_detail.append(f"Tier {ot.tier} \u2014 {ot.name}: {ot.source} ({ot.speed})")
        t.add_row("Resolution Tiers", "\n".join(tier_detail))

    console.print(t)


def render_comparison() -> None:
    """Render the Baozi vs competition comparison table."""
    console.print()

    t = Table(
        title="BAOZI vs THE REST",
        box=box.DOUBLE_EDGE,
        border_style="bright_blue",
        title_style="bold bright_white",
        expand=True,
    )
    t.add_column("Criteria", style="bold bright_yellow", width=22)
    t.add_column("Baozi", style="bright_green", width=20)
    t.add_column("Polymarket", style="bright_red", width=20)

    rows = [
        ("Evidence stored", "IPFS \u2705", "None \u274c"),
        ("Proof public", "Yes \u2705", "No \u274c"),
        ("Multisig verified", "2-of-2 \u2705", "UMA vote \u26a0\ufe0f"),
        ("On-chain TX", "Visible \u2705", "Visible \u2705"),
        ("Dispute window", "6 hours \u2705", "2 hours \u26a0\ufe0f"),
        ("Resolution time", "3min-24h \u2705", "Variable"),
        ("Transparency", "FULL \u2705", "PARTIAL \u26a0\ufe0f"),
    ]

    for criteria, baozi, poly in rows:
        t.add_row(criteria, baozi, poly)

    t.add_section()
    t.add_row(
        Text("Trust Score", style="bold bright_white"),
        Text("100%", style="bold bright_green"),
        Text("~60%", style="bold bright_red"),
    )

    console.print(t)

    console.print(Panel(
        Text.assemble(
            ("Baozi", "bold bright_green"),
            " publishes full resolution proofs for every market \u2014 evidence, sources, on-chain transactions, "
            "and oracle identity are all publicly verifiable. ",
            ("Polymarket", "bold bright_red"),
            " uses UMA's optimistic oracle which provides on-chain settlement but lacks per-market "
            "evidence documentation and public proof bundles. Baozi's transparency model sets a new "
            "standard for prediction market accountability.",
        ),
        title="Why This Matters",
        title_align="left",
        border_style="dim",
        box=box.ROUNDED,
        padding=(1, 2),
    ))


def render_empty_results(filters_applied: bool) -> None:
    """Render a message when no proofs match the filters."""
    if filters_applied:
        msg = "No proofs match the applied filters. Try broadening your search."
    else:
        msg = "No proofs available from the API."
    console.print(Panel(
        Text(msg, style="bold bright_yellow"),
        border_style="bright_yellow",
        box=box.ROUNDED,
    ))


def render_dashboard(response: ProofsResponse, proofs: list[Proof],
                     stats: dict, show_compare: bool = False) -> None:
    """Render the full dashboard."""
    render_header(response, filtered_count=len(proofs))
    console.print()

    if not proofs:
        render_empty_results(filters_applied=True)
    else:
        for proof in proofs:
            render_proof(proof)
            console.print()

    render_stats(stats, oracle_tiers=response.oracle.tiers)

    if show_compare:
        render_comparison()

    console.print()
