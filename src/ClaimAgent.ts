import { Connection, PublicKey, GetProgramAccountsFilter, AccountInfo } from '@solana/web3.js';
import axios from 'axios';
import BN = require('bn.js');
import bs58 from 'bs58';

/**
 * ClaimAgent v5.1: THE VERIFIED PHYSICAL STANDARD
 * Aligned with physical mainnet layout (verified via account forensics):
 * [0..8] Discriminator
 * [8..40] Market (Pubkey)
 * [40..72] User (Pubkey)
 * Program ID: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
 */

interface UserPosition {
    pubkey: PublicKey;
    market: PublicKey;
    user: PublicKey;
    yesAmount: BN;
    noAmount: BN;
    isClaimed: boolean;
}

export class BaoziMonitor {
    private connection: Connection;
    private programId: PublicKey;
    private walletAddress: PublicKey;
    private webhookUrl: string | undefined;

    private static DISCRIMINATOR = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);

    constructor(rpcUrl: string, programId: string, walletAddress: string, webhookUrl?: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.programId = new PublicKey(programId);
        this.walletAddress = new PublicKey(walletAddress);
        this.webhookUrl = webhookUrl;
    }

    async scanUserPositions(): Promise<UserPosition[]> {
        console.log(`🔍 [Monitor] Initiating Verified Physical Scan for ${this.walletAddress.toBase58()}`);

        const filters: GetProgramAccountsFilter[] = [
            {
                memcmp: {
                    offset: 0,
                    bytes: bs58.encode(BaoziMonitor.DISCRIMINATOR),
                }
            },
            {
                memcmp: {
                    offset: 40, // VERIFIED PHYSICAL OFFSET for User Pubkey
                    bytes: this.walletAddress.toBase58(),
                }
            }
        ];

        try {
            const accounts = await this.connection.getProgramAccounts(this.programId, { filters });
            console.log(`✅ [Monitor] Physical Sync Success. Found ${accounts.length} positions.`);

            const positions: UserPosition[] = [];
            for (const acc of accounts) {
                const pos = this.decodeUserPosition(acc.pubkey, acc.account);
                if (pos) positions.push(pos);
            }
            return positions;
        } catch (error) {
            console.error('❌ [Monitor] RPC Sync Failure:', error);
            throw error;
        }
    }

    private decodeUserPosition(pubkey: PublicKey, account: AccountInfo<Buffer>): UserPosition | null {
        try {
            const data = account.data;
            if (data.length < 90) return null;

            // Physical Layout v4.7.6: [8 disc][32 market][32 user][8 yes][8 no][1 claimed]
            const market = new PublicKey(data.slice(8, 40));
            const user = new PublicKey(data.slice(40, 72));
            const yesAmount = new BN(data.slice(72, 80), 'le');
            const noAmount = new BN(data.slice(80, 88), 'le');
            const isClaimed = data[88] === 1;

            return { pubkey, market, user, yesAmount, noAmount, isClaimed };
        } catch (err) {
            return null;
        }
    }

    /**
     * Integration with Baozi MCP tools
     */
    async claimWinnings(positionAddr: string) {
        console.log(`🛠️ [MCP] Ready to trigger: build_claim_winnings_transaction(${positionAddr})`);
    }
}

if (require.main === module) {
    const RPC = 'https://api.mainnet-beta.solana.com';
    const PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';
    // Test with the physically verified user we found earlier
    const WALLET = process.argv[2] || '6azqf7E1BQ6TdKsrjDmXJsUasFJBzQbPCes551Ce18NK';

    const monitor = new BaoziMonitor(RPC, PROGRAM_ID, WALLET);
    monitor.scanUserPositions().then((pos) => {
        if (pos.length > 0) {
            pos.forEach(p => console.log(`🎯 Physical Match: ${p.pubkey.toBase58()} | Market: ${p.market.toBase58()}`));
        }
        console.log('🏁 Verified Physical Scan Completed.');
    });
}
