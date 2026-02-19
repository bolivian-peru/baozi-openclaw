import { Connection, PublicKey, GetProgramAccountsFilter, AccountInfo } from '@solana/web3.js';
import axios from 'axios';
import BN = require('bn.js'); // BigNumber for amounts
import bs58 from 'bs58'; // Solana-native encoding

/**
 * ClaimAgent v2.0: The Watchtower of Baozi.bet
 * Protocol: Full-Fidelity RPC Integration
 * Target: Baozi UserPosition Accounts (Anchor Disc: [251, 248, 209, 245, 83, 234, 17, 27])
 */

// Interface matching the assumed on-chain structure
interface UserPosition {
    pubkey: PublicKey;
    owner: PublicKey;
    market: PublicKey;
    stakedAmount: BN;
    isClaimed: boolean;
}

export class BaoziMonitor {
    private connection: Connection;
    private programId: PublicKey;
    private walletAddress: PublicKey;
    private webhookUrl: string | undefined;

    // Anchor Discriminator for UserPosition account provided by maintainer
    // sha256("account:UserPosition")[..8]
    private static DISCRIMINATOR = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);

    constructor(rpcUrl: string, programId: string, walletAddress: string, webhookUrl?: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.programId = new PublicKey(programId);
        this.walletAddress = new PublicKey(walletAddress);
        this.webhookUrl = webhookUrl;
    }

    /**
     * Executes a real RPC call to fetch UserPosition accounts owned by the wallet.
     * Uses memcmp filters for server-side filtering (efficient).
     */
    async scanUserPositions(): Promise<UserPosition[]> {
        console.log(`🔍 [Monitor] Querying RPC for positions owned by ${this.walletAddress.toBase58()}...`);

        const filters: GetProgramAccountsFilter[] = [
            {
                memcmp: {
                    offset: 0, // Discriminator is at the start
                    bytes: bs58.encode(BaoziMonitor.DISCRIMINATOR),
                }
            },
            {
                memcmp: {
                    offset: 8, // Owner follows the 8-byte discriminator
                    bytes: this.walletAddress.toBase58(),
                }
            }
        ];

        try {
            const accounts = await this.connection.getProgramAccounts(this.programId, { filters });
            console.log(`✅ [Monitor] RPC Success. Found ${accounts.length} raw accounts.`);

            const positions: UserPosition[] = [];
            for (const acc of accounts) {
                const pos = this.decodeUserPosition(acc.pubkey, acc.account);
                if (pos) positions.push(pos);
            }
            return positions;

        } catch (error) {
            console.error('❌ [Monitor] RPC Failure (Network or Config):', error);
            throw error; // Re-throw to fail the process if RPC is down
        }
    }

    /**
     * Decodes the raw buffer into a TypeScript object.
     * Layout Assumption (Standard Anchor):
     * [0..8]: Discriminator
     * [8..40]: Owner (Pubkey)
     * [40..72]: Market (Pubkey)
     * [72..80]: Amount (u64/BN)
     * [80]: Claimed Flag (bool/u8)
     */
    private decodeUserPosition(pubkey: PublicKey, account: AccountInfo<Buffer>): UserPosition | null {
        try {
            const data = account.data;
            if (data.length < 81) {
                console.warn(`⚠️ [Decoder] Account ${pubkey.toBase58()} too small (${data.length} bytes). Skipping.`);
                return null;
            }

            // Verify discriminator again (sanity check)
            const disc = data.slice(0, 8);
            if (!disc.equals(BaoziMonitor.DISCRIMINATOR)) return null;

            const owner = new PublicKey(data.slice(8, 40));
            const market = new PublicKey(data.slice(40, 72));
            const stakedAmount = new BN(data.slice(72, 80), 'le'); // Little Endian u64
            const isClaimed = data[80] !== 0;

            return { pubkey, owner, market, stakedAmount, isClaimed };

        } catch (err) {
            console.error(`❌ [Decoder] Failed to parse account ${pubkey.toBase58()}`, err);
            return null;
        }
    }

    /**
     * Filters positions that are NOT claimed and sends alerts.
     */
    async processUnclaimedPositions(positions: UserPosition[]) {
        const unclaimed = positions.filter(p => !p.isClaimed && p.stakedAmount.gt(new BN(0)));
        console.log(`📊 [Logic] Found ${unclaimed.length} active/unclaimed positions.`);

        for (const pos of unclaimed) {
            const msg = `🎰 Baozi Alert: Active Position Detected!\nAddress: ${pos.pubkey.toBase58()}\nMarket: ${pos.market.toBase58()}\nStake: ${pos.stakedAmount.toString()} lamports`;
            console.log(msg);
            
            if (this.webhookUrl) {
                await this.sendWebhook(msg);
            }
        }
    }

    private async sendWebhook(content: string) {
        try {
            await axios.post(this.webhookUrl!, { content });
            console.log('📨 [Webhook] Alert sent successfully.');
        } catch (err) {
            console.error('❌ [Webhook] Failed to send alert:', err);
        }
    }
}

// --- CLI ENTRYPOINT (Real Execution Test) ---
if (require.main === module) {
    (async () => {
        // Default to mainnet public RPC if not provided
        const RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
        
        // Baozi Program ID (Placeholder - needs real ID from docs if public, or keep as config)
        // Using a known program ID or the one implied by the bounty context
        const PROGRAM_ID = process.env.BAOZI_PROGRAM_ID || 'Baozi11111111111111111111111111111111111111'; 
        
        // My Wallet (or a known whale wallet for testing read-only access)
        const WALLET = process.argv[2] || '8hswmw8fVwErtwgZ6Y85dMR4L2Tytdpk54Jf9fmpKxHs'; 

        console.log(`🚀 [Boot] Starting ClaimAgent v2.0...`);
        console.log(`   RPC: ${RPC}`);
        console.log(`   Target Program: ${PROGRAM_ID}`);
        console.log(`   Target Wallet: ${WALLET}`);

        const monitor = new BaoziMonitor(RPC, PROGRAM_ID, WALLET, process.env.WEBHOOK_URL);
        
        try {
            const positions = await monitor.scanUserPositions();
            await monitor.processUnclaimedPositions(positions);
            console.log('🏁 [Boot] Scan Complete.');
        } catch (err) {
            console.error('💥 [Boot] Critical Failure:', err);
            process.exit(1);
        }
    })();
}
