/**
 * Thin stdio MCP client for the @baozi.bet/mcp-server.
 *
 * Spawns the MCP server as a child process, sends initialize + tools/call,
 * collects the response, and returns the parsed result.
 *
 * Using the MCP server ensures parity with the 76 official tools —
 * no duplicated program decoding, no stale IDLs.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

const MCP_BIN = 'npx';
const MCP_ARGS = ['--yes', '@baozi.bet/mcp-server@latest'];
const TIMEOUT_MS = 60_000;

export async function callMcp(toolName, args = {}) {
  const env = { ...process.env };
  // Let SOLANA_RPC_URL flow through to the MCP server.
  // SOLANA_PRIVATE_KEY is NOT passed — scripts handle signing locally.

  const child = spawn(MCP_BIN, MCP_ARGS, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });

  let stderrBuf = '';
  child.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  const rl = createInterface({ input: child.stdout });
  const responses = new Map();
  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) responses.set(msg.id, msg);
    } catch {}
  });

  const send = (payload) => {
    child.stdin.write(JSON.stringify(payload) + '\n');
  };

  const waitFor = (id) => new Promise((resolve, reject) => {
    const started = Date.now();
    const iv = setInterval(() => {
      if (responses.has(id)) {
        clearInterval(iv);
        resolve(responses.get(id));
      } else if (Date.now() - started > TIMEOUT_MS) {
        clearInterval(iv);
        reject(new Error(`MCP call timeout after ${TIMEOUT_MS}ms\nstderr:\n${stderrBuf}`));
      }
    }, 20);
  });

  try {
    // 1. initialize
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'baozi-openclaw-cli', version: '1.0.0' },
      },
    });
    await waitFor(1);

    send({ jsonrpc: '2.0', method: 'notifications/initialized' });

    // 2. tools/call
    send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    });
    const result = await waitFor(2);

    if (result.error) {
      throw new Error(`MCP tool '${toolName}' error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // MCP content is an array of { type: 'text', text: '...' }
    const textContent = result.result?.content?.find?.((c) => c.type === 'text')?.text;
    if (!textContent) {
      return result.result;
    }

    // Most Baozi MCP tools return JSON strings in text content
    try {
      return JSON.parse(textContent);
    } catch {
      return textContent;
    }
  } finally {
    child.stdin.end();
    child.kill('SIGTERM');
    try { await once(child, 'exit'); } catch {}
  }
}
