#!/usr/bin/env python3
"""
mcp_client.py — reusable MCP JSON-RPC client for baozi.bet MCP server.

spawns `npx @baozi.bet/mcp-server` as a subprocess, sends JSON-RPC 2.0
messages via stdin, and parses newline-delimited JSON responses from stdout.
"""

import json
import subprocess
import sys
from typing import Any


class MCPClient:
    """lightweight MCP JSON-RPC 2.0 client that communicates via subprocess."""

    def __init__(
        self,
        server_cmd: list[str] | None = None,
        client_name: str = "calls-tracker",
        client_version: str = "1.0.0",
        protocol_version: str = "2024-11-05",
        timeout: int = 30,
    ) -> None:
        self.server_cmd = server_cmd or ["npx", "--yes", "@baozi.bet/mcp-server"]
        self.client_name = client_name
        self.client_version = client_version
        self.protocol_version = protocol_version
        self.timeout = timeout
        self._next_id = 1

    def _alloc_id(self) -> int:
        """return the next JSON-RPC message id."""
        rid = self._next_id
        self._next_id += 1
        return rid

    def _build_init(self) -> dict[str, Any]:
        """build the initialize handshake message."""
        return {
            "jsonrpc": "2.0",
            "id": self._alloc_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": self.protocol_version,
                "capabilities": {},
                "clientInfo": {
                    "name": self.client_name,
                    "version": self.client_version,
                },
            },
        }

    def _build_call(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """build a tools/call message."""
        return {
            "jsonrpc": "2.0",
            "id": self._alloc_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

    def _send_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """spawn server, send messages via stdin, collect parsed responses."""
        payload = "".join(json.dumps(m) + "\n" for m in messages)

        try:
            proc = subprocess.Popen(
                self.server_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            out, err = proc.communicate(input=payload, timeout=self.timeout)
        except subprocess.TimeoutExpired as exc:
            print(f"[mcp] timeout after {self.timeout}s", file=sys.stderr)
            raise RuntimeError(f"MCP server timed out after {self.timeout}s") from exc
        except FileNotFoundError as exc:
            print("[mcp] npx not found — is Node.js installed?", file=sys.stderr)
            raise RuntimeError("npx not found — install Node.js") from exc
        except Exception as exc:
            print(f"[mcp] subprocess error: {exc}", file=sys.stderr)
            raise RuntimeError(f"MCP subprocess failed: {exc}") from exc

        responses: list[dict[str, Any]] = []
        for line in out.strip().split("\n"):
            if not line.strip():
                continue
            try:
                responses.append(json.loads(line))
            except json.JSONDecodeError:
                continue

        return responses

    def call_tool(self, tool_name: str, arguments: dict[str, Any] | None = None) -> Any:
        """
        call a single MCP tool and return the parsed result.

        sends initialize + tools/call, parses the response for the call id,
        extracts the text content, and attempts to JSON-parse it.
        """
        self._next_id = 1  # reset per invocation
        init_msg = self._build_init()
        call_msg = self._build_call(tool_name, arguments or {})
        call_id = call_msg["id"]

        responses = self._send_messages([init_msg, call_msg])

        for resp in responses:
            if resp.get("id") != call_id:
                continue
            if "error" in resp:
                err = resp["error"]
                raise RuntimeError(f"MCP error {err.get('code')}: {err.get('message')}")

            result = resp.get("result", {})
            content_list = result.get("content", [])
            for item in content_list:
                if item.get("type") == "text":
                    text = item["text"]
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return text
            return result

        raise RuntimeError(f"no response for call id {call_id}")

    # -----------------------------------------------------------------------
    # convenience wrappers for baozi MCP tools
    # -----------------------------------------------------------------------

    def validate_market_question(self, question: str) -> Any:
        """validate a market question before creation."""
        return self.call_tool("validate_market_question", {"question": question})

    def build_create_lab_market_transaction(
        self,
        question: str,
        closing_time: str,
        wallet: str,
        *,
        outcomes: list[str] | None = None,
    ) -> Any:
        """build an unsigned transaction to create a Lab market."""
        args: dict[str, Any] = {
            "question": question,
            "closingTime": closing_time,
            "wallet": wallet,
        }
        if outcomes:
            args["outcomes"] = outcomes
        return self.call_tool("build_create_lab_market_transaction", args)

    def build_bet_transaction(
        self,
        market_pda: str,
        wallet: str,
        side: str,
        amount: float,
    ) -> Any:
        """build an unsigned bet transaction."""
        return self.call_tool("build_bet_transaction", {
            "marketPda": market_pda,
            "wallet": wallet,
            "side": side,
            "amount": amount,
        })

    def generate_share_card(self, market_pda: str, wallet: str) -> Any:
        """generate a share card for a market position."""
        return self.call_tool("generate_share_card", {
            "market": market_pda,
            "wallet": wallet,
        })

    def get_market(self, market_pda: str) -> Any:
        """get market details including resolution status."""
        return self.call_tool("get_market", {"marketPda": market_pda})

    def get_positions(self, wallet: str) -> Any:
        """get positions for a wallet."""
        return self.call_tool("get_positions", {"wallet": wallet})

    def list_markets(self, limit: int = 100) -> Any:
        """list active markets."""
        return self.call_tool("list_markets", {"limit": limit})
