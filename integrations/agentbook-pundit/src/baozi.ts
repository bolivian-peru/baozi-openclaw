import axios from 'axios';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export interface Market {
  publicKey: string;
  marketId: string;
  question: string;
  status: string;
  winningOutcome: string | null;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  closingTime: Date;
}

export interface RaceMarket {
  publicKey: string;
  marketId: string;
  question: string;
  outcomes: { label: string; poolSol: number; percent: number }[];
  closingTime: Date;
  status: string;
  totalPoolSol: number;
}

export class BaoziClient {
  private apiUrl = 'https://baozi.bet/api/markets';

  async getMarkets(status?: string): Promise<(Market | RaceMarket)[]> {
    try {
      const response = await axios.get(this.apiUrl);
      if (!response.data.success) throw new Error('API returned success: false');

      const binaryRaw = response.data.data.binary || [];
      const raceRaw = response.data.data.race || []; 

      const markets: (Market | RaceMarket)[] = [];

      for (const m of binaryRaw) {
        markets.push({
          publicKey: m.publicKey,
          marketId: m.marketId,
          question: m.question,
          status: m.status,
          winningOutcome: m.outcome,
          yesPoolSol: Number(m.totalPoolSol) * (Number(m.yesPercent) / 100),
          noPoolSol: Number(m.totalPoolSol) * (Number(m.noPercent) / 100),
          totalPoolSol: Number(m.totalPoolSol),
          yesPercent: Number(m.yesPercent),
          noPercent: Number(m.noPercent),
          closingTime: new Date(typeof m.closingTime === 'number' ? m.closingTime * 1000 : m.closingTime),
        });
      }

      for (const m of raceRaw) {
        markets.push({
            publicKey: m.publicKey,
            marketId: m.marketId,
            question: m.question,
            outcomes: m.outcomes,
            closingTime: new Date(typeof m.closingTime === 'number' ? m.closingTime * 1000 : m.closingTime),
            status: m.status,
            totalPoolSol: Number(m.totalPoolSol),
        } as RaceMarket);
      }

      return status 
        ? markets.filter(m => m.status.toLowerCase() === status.toLowerCase())
        : markets;

    } catch (err) {
      console.error('Error fetching markets from REST API:', err);
      return [];
    }
  }

  async postToAgentBook(walletAddress: string, content: string, marketPda?: string): Promise<boolean> {
    try {
      const response = await axios.post('https://baozi.bet/api/agentbook/posts', {
        walletAddress,
        content,
        marketPda
      });
      return response.data.success;
    } catch (err: any) {
      console.error('Error posting to AgentBook:', err.response?.data || err.message);
      return false;
    }
  }

  async postComment(marketPda: string, content: string, keypair: Keypair): Promise<boolean> {
    try {
      const message = `Post comment to market ${marketPda}: ${content}`;
      const messageBytes = Buffer.from(message);
      const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signatureBs58 = bs58.encode(signature);

      const response = await axios.post(`https://baozi.bet/api/markets/${marketPda}/comments`, 
        { content },
        {
          headers: {
            'x-wallet-address': keypair.publicKey.toBase58(),
            'x-signature': signatureBs58,
            'x-message': bs58.encode(messageBytes)
          }
        }
      );
      return response.data.success;
    } catch (err: any) {
      console.error('Error posting comment:', err.response?.data || err.message);
      return false;
    }
  }
}
