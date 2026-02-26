/**
 * MCP Client for Baozi MCP Server
 * Communicates via stdio JSON-RPC with @baozi.bet/mcp-server
 */

import { spawn } from 'child_process';
import { config } from './config';

interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: Array<{ type: string; text: string }>;
    [key: string]: unknown;
  };
  error?: { code: number; message: string };
}

let requestId = 1;

export async function callMcpTool(
  toolName: string,
  toolArgs: Record<string, unknown> = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.mcpCommand, config.mcpArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });

    let buffer = '';
    let initialized = false;
    const currentId = requestId++;

    const sendRequest = (req: McpRequest) => {
      proc.stdin.write(JSON.stringify(req) + '\n');
    };

    proc.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as McpResponse;

          if (!initialized && msg.result !== undefined && msg.id === 0) {
            // Initialize complete — send tool call
            initialized = true;
            sendRequest({
              jsonrpc: '2.0',
              id: currentId,
              method: 'tools/call',
              params: { name: toolName, arguments: toolArgs },
            });
          } else if (msg.id === currentId) {
            proc.kill();
            if (msg.error) {
              reject(new Error(`MCP error: ${msg.error.message}`));
            } else {
              const content = msg.result?.content;
              if (Array.isArray(content) && content.length > 0) {
                resolve(content.map((c) => c.text).join('\n'));
              } else {
                resolve(JSON.stringify(msg.result));
              }
            }
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    });

    proc.stderr.on('data', () => {
      // Suppress stderr
    });

    // Send initialize
    sendRequest({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'agent-recruiter', version: '1.0.0' },
      },
    });

    proc.on('error', reject);
    setTimeout(() => {
      proc.kill();
      reject(new Error(`MCP timeout for tool: ${toolName}`));
    }, 30000);
  });
}

export async function listMarkets(limit = 10): Promise<string> {
  return callMcpTool('list_markets', { limit, status: 'active' });
}

export async function checkAffiliateCode(code: string): Promise<string> {
  return callMcpTool('check_affiliate_code', { code });
}

export async function formatAffiliateLink(code: string, path = '/'): Promise<string> {
  return callMcpTool('format_affiliate_link', {
    code,
    path,
  });
}

export async function getAgentNetworkStats(): Promise<string> {
  return callMcpTool('get_agent_network_stats', {});
}

export async function getReferrals(affiliateCode: string): Promise<string> {
  return callMcpTool('get_referrals', { code: affiliateCode });
}

export async function buildCreateCreatorProfile(
  walletAddress: string,
  displayName: string
): Promise<string> {
  return callMcpTool('build_create_creator_profile_transaction', {
    wallet_address: walletAddress,
    display_name: displayName,
  });
}

export async function buildRegisterAffiliate(
  walletAddress: string,
  affiliateCode: string
): Promise<string> {
  return callMcpTool('build_register_affiliate_transaction', {
    wallet_address: walletAddress,
    affiliate_code: affiliateCode,
  });
}

export async function getQuote(marketAddress: string, side: 'yes' | 'no', amount: number): Promise<string> {
  return callMcpTool('get_quote', {
    market_address: marketAddress,
    side,
    sol_amount: amount,
  });
}
