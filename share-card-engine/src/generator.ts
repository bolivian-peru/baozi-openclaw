import { MarketEvent } from './detector';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export class ShareCardGenerator {
  private mcpClient: Client;
  private wallet: string;
  private refCode: string;

  constructor(mcpClient: Client, wallet: string, refCode: string) {
    this.mcpClient = mcpClient;
    this.wallet = wallet;
    this.refCode = refCode;
  }

  // Uses the Baozi MCP to generate a share card
  public async generateCard(event: MarketEvent): Promise<{ imageUrl: string, caption: string }> {
    let imageUrl = '';
    let marketUrl = '';

    try {
      const genRes = await this.mcpClient.callTool({
        name: 'generate_share_card',
        arguments: {
          market: event.market.pda,
          wallet: this.wallet,
          ref: this.refCode
        }
      }) as any;

      const content = genRes.content?.[0]?.text;
      if (content) {
        const data = JSON.parse(content);
        if (data.success) {
          imageUrl = data.imageUrl || '';
          marketUrl = data.marketUrl || '';
        }
      }
    } catch (e) {
      console.warn(`[WARN] MCP failed to generate share card for ${event.market.pda}`, e);
    }

    // Fallbacks just in case MCP tool glitches
    if (!imageUrl || imageUrl === 'undefined') {
      imageUrl = `https://baozi.bet/api/share/card?market=${event.market.pda}&wallet=${this.wallet}&ref=${this.refCode}`;
    }
    if (!marketUrl || marketUrl === 'undefined') {
      marketUrl = `https://baozi.bet/market/${event.market.pda}?ref=${this.refCode}`;
    }

    // Format the final caption integrating the context + proverb + link
    const caption = `${event.context}\n\nplace your bet → ${marketUrl}\n\n${event.proverb}`;

    return {
      imageUrl,
      caption
    };
  }
}
