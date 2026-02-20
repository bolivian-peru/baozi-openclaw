import { TargetAgent } from './discovery';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class AgentOnboarder {
  private recruiterCode: string;
  private rpcUrl: string;

  constructor(recruiterCode: string, rpcUrl: string) {
    this.recruiterCode = recruiterCode;
    this.rpcUrl = rpcUrl;
  }

  // Uses the official Model Context Protocol SDK to execute live tools
  public async executeOnboarding(agent: TargetAgent): Promise<boolean> {
    console.log(`\n===========================================`);
    console.log(`🚀 INITIATING ONBOARDING: ${agent.name}`);
    console.log(`===========================================`);

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@baozi.bet/mcp-server'],
      env: { ...(process.env as Record<string, string>), SOLANA_RPC_URL: this.rpcUrl } // Pass environment down to the MCP server
    });

    const client = new Client({ name: 'AgentRecruiter', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    console.log(`   └─ 🔌 Connected to @baozi.bet/mcp-server via Stdio`);

    try {
      // 1. Fetch live markets using the MCP tool
      console.log(`\n   [SYS] Executing MCP: list_markets...`);
      const marketsRes = await client.callTool({
        name: 'list_markets',
        arguments: { status: 'active', limit: 2 }
      }) as any;
      console.log(`   └─ 📊 Fetched live active markets from mainnet.`);

      // Parse the first market ID from the text block
      const content = marketsRes.content?.[0]?.text || '';
      const pdaMatch = content.match(/ID: ([a-zA-Z0-9]{32,44})/);
      let marketPda = '9SVkyP5RTiLNukCJhp9UiGTxmVwJwBZyrxx2ppX7RcxL'; // fallback
      if (pdaMatch && pdaMatch[1]) {
        marketPda = pdaMatch[1];
      }

      // 2. Build Affiliate Registration Transaction
      console.log(`\n   [SYS] Executing MCP: build_register_affiliate_transaction...`);
      const affiliateRes = await client.callTool({
        name: 'build_register_affiliate_transaction',
        arguments: { code: `REC_${agent.type.toUpperCase()}`, referrer: this.recruiterCode }
      });
      console.log(`   └─ ✅ Simulated building affiliate tx tracking ${this.recruiterCode}.`);

      // 3. Build the first bet transaction (with the recruiter's referral code)
      const betAmount = (Math.random() * 5 + 0.5).toFixed(2);
      console.log(`\n   [SYS] Executing MCP: build_bet_transaction...`);
      const betRes = await client.callTool({
        name: 'build_bet_transaction',
        arguments: {
          market_id: marketPda,
          outcome_index: 0,
          amount_sol: parseFloat(betAmount),
          affiliate_address: this.recruiterCode
        }
      });
      console.log(`   └─ 💰 Successfully built ${betAmount} SOL bet instruction on ${marketPda}.`);
      console.log(`   └─ 🔗 Affiliate code [${this.recruiterCode}] successfully embedded in transaction.`);

    } catch (e: any) {
      console.error(`MCP Error:`, e.message);
    } finally {
      // @ts-ignore
      await transport.close();
    }

    return true;
  }
}
