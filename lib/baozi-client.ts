
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import bs58 from 'bs58';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const PROGRAM_ID = new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
// Discriminator for Market account (from baozi-mcp src/config.ts)
const MARKET_DISCRIMINATOR = Buffer.from([219, 190, 213, 55, 0, 227, 198, 154]);

// Helper
function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

export interface Market {
    id: string; // Pubkey
    question: string;
    outcomes: string[];
    closingTime: string;
    totalPool: number;
    status: 'Active' | 'Closed' | 'Resolved' | 'Unknown';
    layer: string;
}

export class BaoziClient {
    private connection: Connection;

    constructor() {
        // Use provided RPC or fallback to mainnet public
        const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    async listMarkets(): Promise<Market[]> {
        try {
            console.log("Fetching markets from Solana mainnet...");
            const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: bs58.encode(MARKET_DISCRIMINATOR),
                        },
                    },
                ],
            });

            console.log(`Found ${accounts.length} market accounts.`);

            const markets: Market[] = [];

            for (const { pubkey, account } of accounts) {
                const market = this.decodeMarket(account.data, pubkey);
                if (market && market.status === 'Active') {
                    markets.push(market);
                }
            }

            // Sort by closing time (soonest first)
            markets.sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());

            return markets;
        } catch (error) {
            console.error("Failed to list markets:", error);
            // Fallback to empty list or throwing, but let's try to not break the agent completely if RPC fails
            return [];
        }
    }

    private decodeMarket(data: Buffer, pubkey: PublicKey): Market | null {
        try {
            let offset = 8; // Skip discriminator

            // market_id (u64)
            offset += 8;

            // question (String: 4 byte len + UTF-8 bytes)
            const questionLen = data.readUInt32LE(offset);
            offset += 4;
            const question = data.slice(offset, offset + questionLen).toString('utf8');
            offset += questionLen;

            // closing_time (i64)
            const closingTimeBigInt = data.readBigInt64LE(offset);
            offset += 8;

            // resolution_time (i64)
            offset += 8;

            // auto_stop_buffer (i64)
            offset += 8;

            // yes_pool (u64)
            const yesPool = data.readBigUInt64LE(offset);
            offset += 8;

            // no_pool (u64)
            const noPool = data.readBigUInt64LE(offset);
            offset += 8;

            // snapshot pools etc.
            offset += 16;

            // status (enum, 1 byte)
            const statusCode = data.readUInt8(offset);
            offset += 1;

            // winning outcome, currency type, etc.
            // We just need status for filteringActive

            // We need to jump to 'layer'
            // winning_outcome (1 + 0/1)
            const hasWinningOutcome = data.readUInt8(offset);
            offset += 1 + (hasWinningOutcome === 1 ? 1 : 0);

            // currency_type (1)
            offset += 1;

            // reserved (33)
            offset += 33;

            // creator_bond (8)
            offset += 8;
            // total_claimed (8)
            offset += 8;
            // platform_fee (8)
            offset += 8;
            // last_bet_time (8)
            offset += 8;
            // bump (1)
            offset += 1;

            // layer (1)
            const layerCode = data.readUInt8(offset);

            // Map status
            const statusMap: Record<number, string> = {
                0: 'Active',
                1: 'Closed',
                2: 'Resolved',
                3: 'Cancelled',
                4: 'Paused',
                5: 'ResolvedPending',
                6: 'Disputed'
            };
            const status = statusMap[statusCode] || 'Unknown';

            // Map layer
            const layerMap: Record<number, string> = {
                0: 'Official',
                1: 'Lab',
                2: 'Private'
            };
            const layer = layerMap[layerCode] || 'Unknown';

            const totalPool = lamportsToSol(yesPool + noPool);
            const closingTime = new Date(Number(closingTimeBigInt) * 1000).toISOString();

            return {
                id: pubkey.toBase58(),
                question,
                outcomes: ['Yes', 'No'], // Currently Baozi boolean markets are Yes/No. Race markets have different discriminator.
                closingTime,
                totalPool,
                status: status as any,
                layer
            };

        } catch (e) {
            console.error("Error decoding market:", e);
            return null;
        }
    }

    async postToAgentBook(content: string, marketId?: string): Promise<boolean> {
        const walletAddress = process.env.WALLET_PUBLIC_KEY;

        if (!walletAddress) {
             console.log(`[Mock Post] AgentBook:
             Content: ${content}
             Market: ${marketId || 'None'}
             (Set WALLET_PUBLIC_KEY env var to post for real)`);
             return true;
        }

        try {
            console.log(`Posting to AgentBook as ${walletAddress}...`);
            const response = await axios.post('https://baozi.bet/api/agentbook/posts', {
                walletAddress,
                content,
                marketPda: marketId
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                console.log('✅ Successfully posted to AgentBook!');
                return true;
            } else {
                console.error('❌ Failed to post:', response.data.error);
                return false;
            }
        } catch (error: any) {
            console.error('❌ Error posting to AgentBook:', error.response?.data || error.message);
            return false;
        }
    }
}
