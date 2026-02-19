import { Connection, PublicKey, GetProgramAccountsFilter, AccountInfo } from '@solana/web3.js';
import axios from 'axios';
import BN = require('bn.js');
import bs58 from 'bs58';

/**
 * ClaimAgent v4.0: PHYSICAL_STANDARD
 * Verified against: baozi-mcp (v4.7.6)
 * Program ID: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
 */

interface UserPosition {
    pubkey: PublicKey;
    user: PublicKey;
    marketId: BN;
    yesAmount: BN;
    noAmount: BN;
    isClaimed: boolean;
}

export class BaoziMonitor {
    private connection: Connection;
    private programId: PublicKey;
    private walletAddress: PublicKey;
    private webhookUrl: string | undefined;

    // Physical Disc: sha256("account:UserPosition")[..8]
    private static DISCRIMINATOR = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);

    constructor(rpcUrl: string, programId: string, walletAddress: string, webhookUrl?: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.programId = new PublicKey(programId);
        this.walletAddress = new PublicKey(walletAddress);
        this.webhookUrl = webhookUrl;
    }

    async scanUserPositions(): Promise<UserPosition[]> {
        console.log(`🔍 [Monitor] Initiating Physical Scan: ${this.walletAddress.toBase58()}`);

        const filters: GetProgramAccountsFilter[] = [
            {
                memcmp: {
                    offset: 0,
                    bytes: bs58.encode(BaoziMonitor.DISCRIMINATOR),
                }
            },
            {
                memcmp: {
                    offset: 8, // Offset 8 confirmed via baozi-mcp/src/handlers/positions.ts
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
            if (data.length < 65) return null;

            // Layout Alignment: [8 disc][32 user][8 market_id][8 yes][8 no][1 claimed]
            const user = new PublicKey(data.slice(8, 40));
            const marketId = new BN(data.slice(40, 48), 'le');
            const yesAmount = new BN(data.slice(48, 56), 'le');
            const noAmount = new BN(data.slice(56, 64), 'le');
            const isClaimed = data[64] === 1;

            return { pubkey, user, marketId, yesAmount, noAmount, isClaimed };
        } catch (err) {
            return null;
        }
    }
}

if (require.main === module) {
    const RPC = 'https://api.mainnet-beta.solana.com';
    const PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';
    const WALLET = '8hswmw8fVwErtwgZ6Y85dMR4L2Tytdpk54Jf9fmpKxHs';

    const monitor = new BaoziMonitor(RPC, PROGRAM_ID, WALLET);
    monitor.scanUserPositions().then(() => console.log('🏁 Physical Scan Sequence Completed.'));
}
