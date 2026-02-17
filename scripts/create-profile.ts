#!/usr/bin/env npx tsx
/**
 * Create CreatorProfile by calling the Baozi MCP server.
 * Uses the official MCP SDK client to communicate via stdio.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Keypair, Connection, VersionedTransaction, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { loadConfig } from "../lib/config.js";

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
  const config = loadConfig();
  const keypair = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey));
  const walletAddress = keypair.publicKey.toBase58();

  log("🥟 Creating CreatorProfile via MCP Server");
  log(`Wallet: ${walletAddress}`);

  // Start MCP server as a subprocess
  log("Starting MCP server...");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["@baozi.bet/mcp-server"],
  });

  const client = new Client(
    { name: "agentbook-pundit", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  log("Connected to MCP server.");

  // Call build_create_creator_profile_transaction
  log("Calling build_create_creator_profile_transaction...");
  const result = await client.callTool({
    name: "build_create_creator_profile_transaction",
    arguments: {
      creator_wallet: walletAddress,
      display_name: "AgentBookPundit",
      creator_fee_bps: 50,
    },
  });

  log(`MCP response received.`);

  // Extract transaction from result
  const content = result.content as Array<{ type: string; text?: string }>;
  const textContent = content?.find((c) => c.type === "text")?.text;

  if (!textContent) {
    log("No text content in response:");
    console.log(JSON.stringify(result, null, 2));
    await client.close();
    return;
  }

  log(`Response text: ${textContent.slice(0, 300)}...`);

  // Parse the text content for transaction
  let txBase64: string | undefined;
  try {
    const parsed = JSON.parse(textContent);
    if (parsed.transaction?.serialized) {
      txBase64 = parsed.transaction.serialized;
    } else if (typeof parsed.transaction === "string") {
      txBase64 = parsed.transaction;
    } else if (parsed.serializedTransaction) {
      txBase64 = parsed.serializedTransaction;
    }
  } catch {
    // Might be raw base64
    if (textContent.length > 200 && !textContent.includes(" ")) {
      txBase64 = textContent.trim();
    } else {
      log(`Response is not a transaction: ${textContent}`);
      await client.close();
      return;
    }
  }

  if (!txBase64) {
    log("Could not extract transaction from response:");
    console.log(textContent);
    await client.close();
    return;
  }

  // Sign and send
  log("Signing transaction...");
  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const txBuffer = Buffer.from(txBase64, "base64");

  let signature: string;
  try {
    const vtx = VersionedTransaction.deserialize(txBuffer);
    vtx.sign([keypair]);
    signature = await connection.sendRawTransaction(vtx.serialize());
  } catch {
    const tx = Transaction.from(txBuffer);
    tx.sign(keypair);
    signature = await connection.sendRawTransaction(tx.serialize());
  }

  log(`Transaction sent! Signature: ${signature}`);
  log("Waiting for confirmation...");
  await connection.confirmTransaction(signature, "confirmed");
  log(`✅ CreatorProfile created!`);
  log(`Explorer: https://solscan.io/tx/${signature}`);

  await client.close();
}

main().catch((err) => {
  log(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(err);
  process.exit(1);
});
