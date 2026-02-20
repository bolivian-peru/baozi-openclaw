"""
mcp_client.py — Baozi MCP JSON-RPC wrapper.

Spawns `npx @baozi.bet/mcp-server` as a subprocess and sends JSON-RPC
requests over stdin/stdout.  Each public method sends init + tool call,
parses the response, and returns typed Python data.
"""

from __future__ import annotations

import json
import subprocess
import sys
from typing import Any


MCP_CMD = ["npx", "--yes", "@baozi.bet/mcp-server"]
MCP_TIMEOUT = 30  # seconds per subprocess call


def _rpc_call(tool_name: str, arguments: dict[str, Any]) -> Any:
    """Send an initialize + tools/call request and return the parsed result."""
    init = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "agent-arena", "version": "1.0"},
        },
    }) + "\n"

    call = json.dumps({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }) + "\n"

    try:
        proc = subprocess.Popen(
            MCP_CMD,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        out, err = proc.communicate(input=init + call, timeout=MCP_TIMEOUT)
    except FileNotFoundError:
        print("[mcp] npx not found — is Node.js installed?", file=sys.stderr)
        return None
    except subprocess.TimeoutExpired:
        proc.kill()
        print(f"[mcp] timeout calling {tool_name}", file=sys.stderr)
        return None
    except Exception as exc:
        print(f"[mcp] subprocess error: {exc}", file=sys.stderr)
        return None

    for line in out.strip().split("\n"):
        try:
            obj = json.loads(line)
            if obj.get("id") == 2:
                content = obj.get("result", {}).get("content", [])
                if content:
                    return json.loads(content[0].get("text", "null"))
        except (json.JSONDecodeError, KeyError, IndexError):
            continue

    return None


# ── public API ──────────────────────────────────────────────────────


def list_markets(
    layer: str = "Lab",
    status: str = "Active",
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Return active markets from Baozi."""
    data = _rpc_call("list_markets", {
        "layer": layer,
        "status": status,
        "limit": limit,
    })
    if isinstance(data, dict):
        return data.get("markets", [])
    if isinstance(data, list):
        return data
    return []


def get_market(market_pda: str) -> dict[str, Any] | None:
    """Return pool state and odds for a single market."""
    return _rpc_call("get_market", {"market": market_pda})


def get_positions(wallet: str) -> list[dict[str, Any]]:
    """Return all positions for a wallet address."""
    data = _rpc_call("get_positions", {"wallet": wallet})
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("positions", [])
    return []


def get_quote(
    market_pda: str,
    side: str = "Yes",
    amount: float = 1.0,
) -> dict[str, Any] | None:
    """Get a quote (implied odds) for a hypothetical bet."""
    return _rpc_call("get_quote", {
        "market": market_pda,
        "side": side,
        "amount": amount,
    })


def discover_wallets(limit: int = 100) -> list[str]:
    """Discover unique creator wallets from Lab markets."""
    markets = list_markets(limit=limit)
    wallets: list[str] = []
    seen: set[str] = set()
    for m in markets:
        creator = m.get("creator") or m.get("authority") or m.get("wallet")
        if creator and creator not in seen:
            seen.add(creator)
            wallets.append(creator)
    return wallets
