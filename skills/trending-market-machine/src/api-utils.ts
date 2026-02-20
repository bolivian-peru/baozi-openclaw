/**
 * API Utils — Share Cards & AgentBook
 */
import { config } from './config';
import axios from 'axios';

export function getShareCardUrl(marketPda: string): string {
  const params = new URLSearchParams({
    market: marketPda,
    wallet: config.walletAddress || '',
  });
  // Note: config might not have affiliate code type yet, check config.ts
  return `${config.apiUrl}/share/card?${params.toString()}`;
}

export async function postToAgentBook(content: string, imageUrl?: string, marketPda?: string): Promise<boolean> {
  try {
    const body: any = {
      walletAddress: config.walletAddress,
      content,
    };
    if (imageUrl) body.imageUrl = imageUrl;
    if (marketPda) body.marketPda = marketPda;

    const resp = await axios.post(`${config.apiUrl}/agentbook/posts`, body);
    return resp.data.success;
  } catch (e: any) {
    console.error(`AgentBook post failed: ${e.message}`);
    return false;
  }
}

export async function preValidateMarket(proposal: any): Promise<boolean> {
  try {
    const resp = await axios.post(`${config.apiUrl}/markets/validate`, proposal);
    return resp.data.success;
  } catch (e) {
    return false; // Fail safe
  }
}
