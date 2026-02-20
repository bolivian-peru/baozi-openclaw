import { MarketEvent } from './detector';
import fetch from 'node-fetch';

export class ShareCardGenerator {
  private wallet: string;
  private refCode: string;

  constructor(wallet: string, refCode: string) {
    this.wallet = wallet;
    this.refCode = refCode;
  }

  // Uses the Baozi API to generate a share card
  public async generateCard(event: MarketEvent): Promise<{ imageUrl: string, caption: string }> {
    // Bounty requires hitting the generation API endpoint
    // Documented API: GET https://baozi.bet/api/share/card?market=PDA&wallet=WALLET&ref=CODE

    const url = `https://baozi.bet/api/share/card?market=${event.market.pda}&wallet=${this.wallet}&ref=${this.refCode}`;

    // In a real scenario, this endpoint returns the image buffer or a CDN link.
    // For this engine we assume the URL itself is the public CDN link to the image,
    // or we fetch the JSON containing { imageUrl } as hinted in requirements.

    let imageUrl = '';
    try {
      const resp = await fetch(url);
      if (resp.headers.get('content-type')?.includes('application/json')) {
        const data = await resp.json() as { imageUrl: string };
        imageUrl = data.imageUrl;
      } else {
        // Fallback: The API returns the image directly, so we just use the API URL as the src
        imageUrl = url;
      }
    } catch (e) {
      console.warn(`[WARN] Failed to hit generation API for ${event.market.pda}, using fallback link.`);
      imageUrl = url;
    }

    const marketLink = `https://baozi.bet/market/${event.market.pda}?ref=${this.refCode}`;

    // Format the final caption integrating the context + proverb + link
    const caption = `${event.context}\n\nplace your bet → ${marketLink}\n\n${event.proverb}`;

    return {
      imageUrl,
      caption
    };
  }
}
