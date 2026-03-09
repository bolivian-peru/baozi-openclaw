/**
 * Bet Transaction Builder
 *
 * Builds unsigned transactions for placing bets on Baozi markets.
 * Agent builds, user signs. No private keys in agent.
 */
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, } from '@solana/web3.js';
import { PROGRAM_ID, CONFIG_PDA, SEEDS, RPC_ENDPOINT, solToLamports, } from '../config.js';
// =============================================================================
// INSTRUCTION DISCRIMINATORS
// =============================================================================
// place_bet_sol discriminator: [137, 137, 247, 253, 233, 243, 48, 170]
const PLACE_BET_SOL_DISCRIMINATOR = Buffer.from([137, 137, 247, 253, 233, 243, 48, 170]);
// place_bet_sol_with_affiliate discriminator: [197, 186, 187, 145, 252, 239, 101, 96]
const PLACE_BET_SOL_WITH_AFFILIATE_DISCRIMINATOR = Buffer.from([197, 186, 187, 145, 252, 239, 101, 96]);
// =============================================================================
// PDA DERIVATION
// =============================================================================
/**
 * Derive position PDA from market ID and user
 */
function derivePositionPda(marketId, user) {
    const marketIdBuffer = Buffer.alloc(8);
    marketIdBuffer.writeBigUInt64LE(marketId);
    const [pda] = PublicKey.findProgramAddressSync([SEEDS.POSITION, marketIdBuffer, user.toBuffer()], PROGRAM_ID);
    return pda;
}
/**
 * Derive whitelist PDA from market ID
 */
function deriveWhitelistPda(marketId) {
    const marketIdBuffer = Buffer.alloc(8);
    marketIdBuffer.writeBigUInt64LE(marketId);
    const [pda] = PublicKey.findProgramAddressSync([SEEDS.WHITELIST, marketIdBuffer], PROGRAM_ID);
    return pda;
}
/**
 * Derive referred user PDA
 */
function deriveReferredUserPda(user) {
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from('referred'), user.toBuffer()], PROGRAM_ID);
    return pda;
}
// =============================================================================
// INSTRUCTION BUILDERS
// =============================================================================
/**
 * Create place_bet_sol instruction
 */
function createPlaceBetSolInstruction(params) {
    // Serialize instruction data
    // [discriminator(8)] [outcome(1)] [amount(8)]
    const data = Buffer.alloc(17);
    PLACE_BET_SOL_DISCRIMINATOR.copy(data, 0);
    data.writeUInt8(params.outcome ? 1 : 0, 8);
    data.writeBigUInt64LE(params.amount, 9);
    // For Anchor optional accounts, we MUST include the account in the same position
    // but pass PROGRAM_ID as placeholder when not using it
    const keys = [
        { pubkey: params.config, isSigner: false, isWritable: false },
        { pubkey: params.market, isSigner: false, isWritable: true },
        { pubkey: params.position, isSigner: false, isWritable: true },
        // Whitelist: pass actual PDA if needed, otherwise PROGRAM_ID as "None" placeholder
        { pubkey: params.whitelist || PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: params.user, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
    });
}
/**
 * Create place_bet_sol_with_affiliate instruction
 */
function createPlaceBetSolWithAffiliateInstruction(params) {
    // Serialize instruction data
    // [discriminator(8)] [outcome(1)] [amount(8)]
    const data = Buffer.alloc(17);
    PLACE_BET_SOL_WITH_AFFILIATE_DISCRIMINATOR.copy(data, 0);
    data.writeUInt8(params.outcome ? 1 : 0, 8);
    data.writeBigUInt64LE(params.amount, 9);
    // For Anchor optional accounts, we MUST include the account in the same position
    // but pass PROGRAM_ID as placeholder when not using it
    const keys = [
        { pubkey: params.config, isSigner: false, isWritable: false },
        { pubkey: params.market, isSigner: false, isWritable: true },
        { pubkey: params.position, isSigner: false, isWritable: true },
        { pubkey: params.affiliate, isSigner: false, isWritable: true },
        { pubkey: params.referredUser, isSigner: false, isWritable: true },
        // Whitelist: pass actual PDA if needed, otherwise PROGRAM_ID as "None" placeholder
        { pubkey: params.whitelist || PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: params.user, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data,
    });
}
// =============================================================================
// MAIN BUILDER FUNCTION
// =============================================================================
/**
 * Build an unsigned bet transaction
 *
 * @param params - Transaction parameters
 * @param connection - Optional connection (will create if not provided)
 * @returns Unsigned transaction ready for user signing
 */
export async function buildBetTransaction(params, connection) {
    const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
    // Derive PDAs
    const positionPda = derivePositionPda(params.marketId, params.userWallet);
    const whitelistPda = params.whitelistRequired
        ? deriveWhitelistPda(params.marketId)
        : null;
    // Convert amount to lamports
    const amountLamports = solToLamports(params.amountSol);
    // Create instruction
    let instruction;
    if (params.affiliatePda && params.affiliateOwner) {
        const referredUserPda = deriveReferredUserPda(params.userWallet);
        instruction = createPlaceBetSolWithAffiliateInstruction({
            config: CONFIG_PDA,
            market: params.marketPda,
            position: positionPda,
            affiliate: params.affiliatePda,
            referredUser: referredUserPda,
            whitelist: whitelistPda,
            user: params.userWallet,
            outcome: params.outcome === 'yes',
            amount: amountLamports,
        });
    }
    else {
        instruction = createPlaceBetSolInstruction({
            config: CONFIG_PDA,
            market: params.marketPda,
            position: positionPda,
            whitelist: whitelistPda,
            user: params.userWallet,
            outcome: params.outcome === 'yes',
            amount: amountLamports,
        });
    }
    // Build transaction
    const transaction = new Transaction();
    transaction.add(instruction);
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = params.userWallet;
    // Serialize without signatures (returns Buffer)
    const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    }).toString('base64');
    return {
        transaction,
        positionPda,
        serializedTx,
    };
}
// =============================================================================
// SIMULATION
// =============================================================================
/**
 * Simulate a bet transaction
 */
export async function simulateBetTransaction(transaction, userWallet, connection) {
    const conn = connection || new Connection(RPC_ENDPOINT, 'confirmed');
    try {
        // Use the legacy simulation API for Transaction objects
        const simulation = await conn.simulateTransaction(transaction);
        if (simulation.value.err) {
            return {
                success: false,
                logs: simulation.value.logs || [],
                unitsConsumed: simulation.value.unitsConsumed,
                error: JSON.stringify(simulation.value.err),
            };
        }
        return {
            success: true,
            logs: simulation.value.logs || [],
            unitsConsumed: simulation.value.unitsConsumed,
        };
    }
    catch (err) {
        return {
            success: false,
            logs: [],
            error: err instanceof Error ? err.message : 'Unknown simulation error',
        };
    }
}
// =============================================================================
// MARKET DATA EXTRACTION
// =============================================================================
/**
 * Extract market_id from market account data
 * V4.7.6 Market struct layout:
 * - discriminator (8 bytes)
 * - market_id (u64, 8 bytes) <-- First field!
 * - question (string: 4 byte len + content)
 * - ...rest of fields
 */
export function extractMarketIdFromData(data) {
    // market_id is at offset 8 (right after discriminator)
    return data.readBigUInt64LE(8);
}
/**
 * Extract layer and access_gate from market data to determine if whitelist is needed
 * Returns { layer, accessGate }
 *
 * Layer values: 0 = Official, 1 = Lab, 2 = Private
 * AccessGate values: 0 = Public, 1 = Whitelist, 2 = InviteHash
 *
 * IMPORTANT: Only Private markets (layer=2) can have whitelist.
 * Lab and Official markets are ALWAYS public.
 */
export function extractMarketAccessInfo(data) {
    // V4.7.6 Market struct layout after market_id:
    // market_id (8) + question (4+len) + closing_time (8) + resolution_time (8) +
    // auto_stop_buffer (8) + yes_pool (8) + no_pool (8) + snapshot_yes_pool (8) +
    // snapshot_no_pool (8) + status (1) + winning_outcome (1+1 option) +
    // currency_type (1) + _reserved_usdc_vault (33) + creator_bond (8) +
    // total_claimed (8) + platform_fee_collected (8) + last_bet_time (8) +
    // bump (1) + layer (1) + resolution_mode (1) + access_gate (1)
    let offset = 8; // Skip discriminator
    // market_id
    offset += 8;
    // question (string: 4 byte len + content)
    const questionLen = data.readUInt32LE(offset);
    offset += 4 + questionLen;
    // closing_time, resolution_time, auto_stop_buffer (3 * 8 = 24)
    offset += 24;
    // yes_pool, no_pool, snapshot_yes_pool, snapshot_no_pool (4 * 8 = 32)
    offset += 32;
    // status (enum, 1 byte)
    offset += 1;
    // winning_outcome (Option<bool>: 1 byte discriminant + 1 byte value if Some)
    const hasWinningOutcome = data.readUInt8(offset);
    offset += 1;
    if (hasWinningOutcome === 1) {
        offset += 1;
    }
    // currency_type (enum, 1 byte)
    offset += 1;
    // _reserved_usdc_vault (33 bytes)
    offset += 33;
    // creator_bond (8)
    offset += 8;
    // total_claimed (8)
    offset += 8;
    // platform_fee_collected (8)
    offset += 8;
    // last_bet_time (8)
    offset += 8;
    // bump (1)
    offset += 1;
    // layer (enum, 1 byte) - 0=Official, 1=Lab, 2=Private
    const layer = data.readUInt8(offset);
    offset += 1;
    // resolution_mode (enum, 1 byte)
    offset += 1;
    // access_gate (enum, 1 byte) - 0=Public, 1=Whitelist, 2=InviteHash
    const accessGate = data.readUInt8(offset);
    return { layer, accessGate };
}
/**
 * Determine if whitelist is required for betting
 * ONLY Private markets (layer=2) with AccessGate::Whitelist need whitelist
 * Lab (layer=1) and Official (layer=0) markets are ALWAYS public
 */
export function isWhitelistRequired(data) {
    const { layer, accessGate } = extractMarketAccessInfo(data);
    // Only Private markets (layer=2) can have whitelist
    // Lab (1) and Official (0) are ALWAYS public regardless of access_gate
    if (layer !== 2) {
        return false;
    }
    // For Private markets, check if access_gate is Whitelist (1)
    return accessGate === 1;
}
// Keep old function for backwards compatibility but use new logic
export function extractAccessGateFromData(data) {
    const { accessGate } = extractMarketAccessInfo(data);
    return accessGate;
}
// =============================================================================
// HELPER: FETCH MARKET AND BUILD
// =============================================================================
/**
 * Fetch market data and build bet transaction
 * Convenience function that handles market fetching and market_id extraction
 */
export async function fetchAndBuildBetTransaction(params) {
    const conn = params.connection || new Connection(RPC_ENDPOINT, 'confirmed');
    try {
        const marketPubkey = new PublicKey(params.marketPda);
        const userPubkey = new PublicKey(params.userWallet);
        // Fetch market account to get market_id
        const accountInfo = await conn.getAccountInfo(marketPubkey);
        if (!accountInfo) {
            return {
                transaction: null,
                marketId: 0n,
                error: 'Market not found',
            };
        }
        const data = accountInfo.data;
        // Extract market_id (first field after discriminator)
        const marketId = extractMarketIdFromData(data);
        // Check if whitelist is required (only for Private markets with Whitelist access_gate)
        // Lab and Official markets are ALWAYS public - never need whitelist
        const whitelistRequired = isWhitelistRequired(data);
        // Build affiliate PDAs if provided
        let affiliatePda;
        let affiliateOwner;
        if (params.affiliatePda && params.affiliateOwner) {
            affiliatePda = new PublicKey(params.affiliatePda);
            affiliateOwner = new PublicKey(params.affiliateOwner);
        }
        // Build the transaction
        const result = await buildBetTransaction({
            marketPda: marketPubkey,
            marketId,
            userWallet: userPubkey,
            outcome: params.outcome,
            amountSol: params.amountSol,
            affiliatePda,
            affiliateOwner,
            whitelistRequired,
        }, conn);
        return {
            transaction: result,
            marketId,
        };
    }
    catch (err) {
        return {
            transaction: null,
            marketId: 0n,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmV0LXRyYW5zYWN0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2J1aWxkZXJzL2JldC10cmFuc2FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQUNILE9BQU8sRUFDTCxVQUFVLEVBQ1YsU0FBUyxFQUNULFdBQVcsRUFDWCxzQkFBc0IsRUFDdEIsYUFBYSxHQUNkLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUNMLFVBQVUsRUFDVixVQUFVLEVBQ1YsS0FBSyxFQUNMLFlBQVksRUFDWixhQUFhLEdBQ2QsTUFBTSxjQUFjLENBQUM7QUFFdEIsZ0ZBQWdGO0FBQ2hGLDZCQUE2QjtBQUM3QixnRkFBZ0Y7QUFFaEYsdUVBQXVFO0FBQ3ZFLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRXpGLHNGQUFzRjtBQUN0RixNQUFNLDBDQUEwQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQXVCeEcsZ0ZBQWdGO0FBQ2hGLGlCQUFpQjtBQUNqQixnRkFBZ0Y7QUFFaEY7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLFFBQWdCLEVBQUUsSUFBZTtJQUMxRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUM1QyxDQUFD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LE9BQU87WUFDTCxXQUFXLEVBQUUsTUFBTTtZQUNuQixRQUFRO1NBQ1QsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTztZQUNMLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLEdBQUcsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7U0FDNUQsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCZXQgVHJhbnNhY3Rpb24gQnVpbGRlclxuICpcbiAqIEJ1aWxkcyB1bnNpZ25lZCB0cmFuc2FjdGlvbnMgZm9yIHBsYWNpbmcgYmV0cyBvbiBCYW96aSBtYXJrZXRzLlxuICogQWdlbnQgYnVpbGRzLCB1c2VyIHNpZ25zLiBObyBwcml2YXRlIGtleXMgaW4gYWdlbnQuXG4gKi9cbmltcG9ydCB7XG4gIENvbm5lY3Rpb24sXG4gIFB1YmxpY0tleSxcbiAgVHJhbnNhY3Rpb24sXG4gIFRyYW5zYWN0aW9uSW5zdHJ1Y3Rpb24sXG4gIFN5c3RlbVByb2dyYW0sXG59IGZyb20gJ0Bzb2xhbmEvd2ViMy5qcyc7XG5pbXBvcnQge1xuICBQUk9HUkFNX0lELFxuICBDT05GSUdfUERBLFxuICBTRUVEUyxcbiAgUlBDX0VORFBPSU5ULFxuICBzb2xUb0xhbXBvcnRzLFxufSBmcm9tICcuLi9jb25maWcuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSU5TVFJVQ1RJT04gRElTQ1JJTUlOQVRPUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIHBsYWNlX2JldF9zb2wgZGlzY3JpbWluYXRvcjogWzEzNywgMTM3LCAyNDcsIDI1MywgMjMzLCAyNDMsIDQ4LCAxNzBdXG5jb25zdCBQTEFDRV9CRVRfU09MX0RJU0NSSU1JTkFUT1IgPSBCdWZmZXIuZnJvbShbMTM3LCAxMzcsIDI0NywgMjUzLCAyMzMsIDI0MywgNDgsIDE3MF0pO1xuXG4vLyBwbGFjZV9iZXRfc29sX3dpdGhfYWZmaWxpYXRlIGRpc2NyaW1pbmF0b3I6IFsxOTcsIDE4NiwgMTg3LCAxNDUsIDI1MiwgMjM5LCAxMDEsIDk2XVxuY29uc3QgUExBQ0VfQkVUX1NPTF9XSVRIX0FGRklMSUFURV9ESVNDUklNSU5BVE9SID0gQnVmZmVyLmZyb20oWzE5NywgMTg2LCAxODcsIDE0NSwgMjUyLCAyMzksIDEwMSwgOTZdKTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRZUEVTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIEJ1aWxkQmV0VHJhbnNhY3Rpb25QYXJhbXMge1xuICBtYXJrZXRQZGE6IFB1YmxpY0tleTtcbiAgbWFya2V0SWQ6IGJpZ2ludDtcbiAgdXNlcldhbGxldDogUHVibGljS2V5O1xuICBvdXRjb21lOiAneWVzJyB8ICdubyc7XG4gIGFtb3VudFNvbDogbnVtYmVyO1xuICBhZmZpbGlhdGVQZGE/OiBQdWJsaWNLZXk7XG4gIGFmZmlsaWF0ZU93bmVyPzogUHVibGljS2V5O1xuICB3aGl0ZWxpc3RSZXF1aXJlZD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRCZXRUcmFuc2FjdGlvblJlc3VsdCB7XG4gIHRyYW5zYWN0aW9uOiBUcmFuc2FjdGlvbjtcbiAgcG9zaXRpb25QZGE6IFB1YmxpY0tleTtcbiAgc2VyaWFsaXplZFR4OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQREEgREVSSVZBVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBEZXJpdmUgcG9zaXRpb24gUERBIGZyb20gbWFya2V0IElEIGFuZCB1c2VyXG4gKi9cbmZ1bmN0aW9uIGRlcml2ZVBvc2l0aW9uUGRhKG1hcmtldElkOiBiaWdpbnQsIHVzZXI6IFB1YmxpY0tleSk6IFB1YmxpY0tleSB7XG4gIGNvbnN0IG1hcmtldElkQnVmZmVyID0gQnVmZmVyLmFsbG9jKDgpO1xuICBtYXJrZXRJZEJ1ZmZlci53cml0ZUJpZ1VJbnQ2NExFKG1hcmtldElkKTtcbiAgY29uc3QgW3BkYV0gPSBQdWJsaWNLZXkuZmluZFByb2dyYW1BZGRyZXNzU3luYyhcbiAgICBbU0VFRFMuUE9TSVRJT04sIG1hcmtldElkQnVmZmVyLCB1c2VyLnRvQnVmZmVyKCldLFxuICAgIFBST0dSQU1fSURcbiAgKTtcbiAgcmV0dXJuIHBkYTtcbn1cblxuLyoqXG4gKiBEZXJpdmUgd2hpdGVsaXN0IFBEQSBmcm9tIG1hcmtldCBJRFxuICovXG5mdW5jdGlvbiBkZXJpdmVXaGl0ZWxpc3RQZGEobWFya2V0SWQ6IGJpZ2ludCk6IFB1YmxpY0tleSB7XG4gIGNvbnN0IG1hcmtldElkQnVmZmVyID0gQnVmZmVyLmFsbG9jKDgpO1xuICBtYXJrZXRJZEJ1ZmZlci53cml0ZUJpZ1VJbnQ2NExFKG1hcmtldElkKTtcbiAgY29uc3QgW3BkYV0gPSBQdWJsaWNLZXkuZmluZFByb2dyYW1BZGRyZXNzU3luYyhcbiAgICBbU0VFRFMuV0hJVEVMSVNULCBtYXJrZXRJZEJ1ZmZlcl0sXG4gICAgUFJPR1JBTV9JRFxuICApO1xuICByZXR1cm4gcGRhO1xufVxuXG4vKipcbiAqIERlcml2ZSByZWZlcnJlZCB1c2VyIFBEQVxuICovXG5mdW5jdGlvbiBkZXJpdmVSZWZlcnJlZFVzZXJQZGEodXNlcjogUHVibGljS2V5KTogUHVibGljS2V5IHtcbiAgY29uc3QgW3BkYV0gPSBQdWJsaWNLZXkuZmluZFByb2dyYW1BZGRyZXNzU3luYyhcbiAgICBbQnVmZmVyLmZyb20oJ3JlZmVycmVkJyksIHVzZXIudG9CdWZmZXIoKV0sXG4gICAgUFJPR1JBTV9JRFxuICApO1xuICByZXR1cm4gcGRhO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSU5TVFJVQ1RJT04gQlVJTERFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlIHBsYWNlX2JldF9zb2wgaW5zdHJ1Y3Rpb25cbiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxhY2VCZXRTb2xJbnN0cnVjdGlvbihwYXJhbXM6IHtcbiAgY29uZmlnOiBQdWJsaWNLZXk7XG4gIG1hcmtldDogUHVibGljS2V5O1xuICBwb3NpdGlvbjogUHVibGljS2V5O1xuICB3aGl0ZWxpc3Q6IFB1YmxpY0tleSB8IG51bGw7XG4gIHVzZXI6IFB1YmxpY0tleTtcbiAgb3V0Y29tZTogYm9vbGVhbjtcbiAgYW1vdW50OiBiaWdpbnQ7XG59KTogVHJhbnNhY3Rpb25JbnN0cnVjdGlvbiB7XG4gIC8vIFNlcmlhbGl6ZSBpbnN0cnVjdGlvbiBkYXRhXG4gIC8vIFtkaXNjcmltaW5hdG9yKDgpXSBbb3V0Y29tZSgxKV0gW2Ftb3VudCg4KV1cbiAgY29uc3QgZGF0YSA9IEJ1ZmZlci5hbGxvYygxNyk7XG4gIFBMQUNFX0JFVF9TT0xfRElTQ1JJTUlOQVRPUi5jb3B5KGRhdGEsIDApO1xuICBkYXRhLndyaXRlVUludDgocGFyYW1zLm91dGNvbWUgPyAxIDogMCwgOCk7XG4gIGRhdGEud3JpdGVCaWdVSW50NjRMRShwYXJhbXMuYW1vdW50LCA5KTtcblxuICAvLyBGb3IgQW5jaG9yIG9wdGlvbmFsIGFjY291bnRzLCB3ZSBNVVNUIGluY2x1ZGUgdGhlIGFjY291bnQgaW4gdGhlIHNhbWUgcG9zaXRpb25cbiAgLy8gYnV0IHBhc3MgUFJPR1JBTV9JRCBhcyBwbGFjZWhvbGRlciB3aGVuIG5vdCB1c2luZyBpdFxuICBjb25zdCBrZXlzID0gW1xuICAgIHsgcHVia2V5OiBwYXJhbXMuY29uZmlnLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IGZhbHNlIH0sXG4gICAgeyBwdWJrZXk6IHBhcmFtcy5tYXJrZXQsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIHsgcHVia2V5OiBwYXJhbXMucG9zaXRpb24sIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIC8vIFdoaXRlbGlzdDogcGFzcyBhY3R1YWwgUERBIGlmIG5lZWRlZCwgb3RoZXJ3aXNlIFBST0dSQU1fSUQgYXMgXCJOb25lXCIgcGxhY2Vob2xkZXJcbiAgICB7IHB1YmtleTogcGFyYW1zLndoaXRlbGlzdCB8fCBQUk9HUkFNX0lELCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IGZhbHNlIH0sXG4gICAgeyBwdWJrZXk6IHBhcmFtcy51c2VyLCBpc1NpZ25lcjogdHJ1ZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIHsgcHVia2V5OiBTeXN0ZW1Qcm9ncmFtLnByb2dyYW1JZCwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiBmYWxzZSB9LFxuICBdO1xuXG4gIHJldHVybiBuZXcgVHJhbnNhY3Rpb25JbnN0cnVjdGlvbih7XG4gICAgcHJvZ3JhbUlkOiBQUk9HUkFNX0lELFxuICAgIGtleXMsXG4gICAgZGF0YSxcbiAgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHBsYWNlX2JldF9zb2xfd2l0aF9hZmZpbGlhdGUgaW5zdHJ1Y3Rpb25cbiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxhY2VCZXRTb2xXaXRoQWZmaWxpYXRlSW5zdHJ1Y3Rpb24ocGFyYW1zOiB7XG4gIGNvbmZpZzogUHVibGljS2V5O1xuICBtYXJrZXQ6IFB1YmxpY0tleTtcbiAgcG9zaXRpb246IFB1YmxpY0tleTtcbiAgYWZmaWxpYXRlOiBQdWJsaWNLZXk7XG4gIHJlZmVycmVkVXNlcjogUHVibGljS2V5O1xuICB3aGl0ZWxpc3Q6IFB1YmxpY0tleSB8IG51bGw7XG4gIHVzZXI6IFB1YmxpY0tleTtcbiAgb3V0Y29tZTogYm9vbGVhbjtcbiAgYW1vdW50OiBiaWdpbnQ7XG59KTogVHJhbnNhY3Rpb25JbnN0cnVjdGlvbiB7XG4gIC8vIFNlcmlhbGl6ZSBpbnN0cnVjdGlvbiBkYXRhXG4gIC8vIFtkaXNjcmltaW5hdG9yKDgpXSBbb3V0Y29tZSgxKV0gW2Ftb3VudCg4KV1cbiAgY29uc3QgZGF0YSA9IEJ1ZmZlci5hbGxvYygxNyk7XG4gIFBMQUNFX0JFVF9TT0xfV0lUSF9BRkZJTElBVEVfRElTQ1JJTUlOQVRPUi5jb3B5KGRhdGEsIDApO1xuICBkYXRhLndyaXRlVUludDgocGFyYW1zLm91dGNvbWUgPyAxIDogMCwgOCk7XG4gIGRhdGEud3JpdGVCaWdVSW50NjRMRShwYXJhbXMuYW1vdW50LCA5KTtcblxuICAvLyBGb3IgQW5jaG9yIG9wdGlvbmFsIGFjY291bnRzLCB3ZSBNVVNUIGluY2x1ZGUgdGhlIGFjY291bnQgaW4gdGhlIHNhbWUgcG9zaXRpb25cbiAgLy8gYnV0IHBhc3MgUFJPR1JBTV9JRCBhcyBwbGFjZWhvbGRlciB3aGVuIG5vdCB1c2luZyBpdFxuICBjb25zdCBrZXlzID0gW1xuICAgIHsgcHVia2V5OiBwYXJhbXMuY29uZmlnLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IGZhbHNlIH0sXG4gICAgeyBwdWJrZXk6IHBhcmFtcy5tYXJrZXQsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIHsgcHVia2V5OiBwYXJhbXMucG9zaXRpb24sIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogdHJ1ZSB9LFxuICAgIHsgcHVia2V5OiBwYXJhbXMuYWZmaWxpYXRlLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IHRydWUgfSxcbiAgICB7IHB1YmtleTogcGFyYW1zLnJlZmVycmVkVXNlciwgaXNTaWduZXI6IGZhbHNlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gICAgLy8gV2hpdGVsaXN0OiBwYXNzIGFjdHVhbCBQREEgaWYgbmVlZGVkLCBvdGhlcndpc2UgUFJPR1JBTV9JRCBhcyBcIk5vbmVcIiBwbGFjZWhvbGRlclxuICAgIHsgcHVia2V5OiBwYXJhbXMud2hpdGVsaXN0IHx8IFBST0dSQU1fSUQsIGlzU2lnbmVyOiBmYWxzZSwgaXNXcml0YWJsZTogZmFsc2UgfSxcbiAgICB7IHB1YmtleTogcGFyYW1zLnVzZXIsIGlzU2lnbmVyOiB0cnVlLCBpc1dyaXRhYmxlOiB0cnVlIH0sXG4gICAgeyBwdWJrZXk6IFN5c3RlbVByb2dyYW0ucHJvZ3JhbUlkLCBpc1NpZ25lcjogZmFsc2UsIGlzV3JpdGFibGU6IGZhbHNlIH0sXG4gIF07XG5cbiAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbkluc3RydWN0aW9uKHtcbiAgICBwcm9ncmFtSWQ6IFBST0dSQU1fSUQsXG4gICAga2V5cyxcbiAgICBkYXRhLFxuICB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1BSU4gQlVJTERFUiBGVU5DVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZCBhbiB1bnNpZ25lZCBiZXQgdHJhbnNhY3Rpb25cbiAqXG4gKiBAcGFyYW0gcGFyYW1zIC0gVHJhbnNhY3Rpb24gcGFyYW1ldGVyc1xuICogQHBhcmFtIGNvbm5lY3Rpb24gLSBPcHRpb25hbCBjb25uZWN0aW9uICh3aWxsIGNyZWF0ZSBpZiBub3QgcHJvdmlkZWQpXG4gKiBAcmV0dXJucyBVbnNpZ25lZCB0cmFuc2FjdGlvbiByZWFkeSBmb3IgdXNlciBzaWduaW5nXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZEJldFRyYW5zYWN0aW9uKFxuICBwYXJhbXM6IEJ1aWxkQmV0VHJhbnNhY3Rpb25QYXJhbXMsXG4gIGNvbm5lY3Rpb24/OiBDb25uZWN0aW9uXG4pOiBQcm9taXNlPEJ1aWxkQmV0VHJhbnNhY3Rpb25SZXN1bHQ+IHtcbiAgY29uc3QgY29ubiA9IGNvbm5lY3Rpb24gfHwgbmV3IENvbm5lY3Rpb24oUlBDX0VORFBPSU5ULCAnY29uZmlybWVkJyk7XG5cbiAgLy8gRGVyaXZlIFBEQXNcbiAgY29uc3QgcG9zaXRpb25QZGEgPSBkZXJpdmVQb3NpdGlvblBkYShwYXJhbXMubWFya2V0SWQsIHBhcmFtcy51c2VyV2FsbGV0KTtcbiAgY29uc3Qgd2hpdGVsaXN0UGRhID0gcGFyYW1zLndoaXRlbGlzdFJlcXVpcmVkXG4gICAgPyBkZXJpdmVXaGl0ZWxpc3RQZGEocGFyYW1zLm1hcmtldElkKVxuICAgIDogbnVsbDtcblxuICAvLyBDb252ZXJ0IGFtb3VudCB0byBsYW1wb3J0c1xuICBjb25zdCBhbW91bnRMYW1wb3J0cyA9IHNvbFRvTGFtcG9ydHMocGFyYW1zLmFtb3VudFNvbCk7XG5cbiAgLy8gQ3JlYXRlIGluc3RydWN0aW9uXG4gIGxldCBpbnN0cnVjdGlvbjogVHJhbnNhY3Rpb25JbnN0cnVjdGlvbjtcblxuICBpZiAocGFyYW1zLmFmZmlsaWF0ZVBkYSAmJiBwYXJhbXMuYWZmaWxpYXRlT3duZXIpIHtcbiAgICBjb25zdCByZWZlcnJlZFVzZXJQZGEgPSBkZXJpdmVSZWZlcnJlZFVzZXJQZGEocGFyYW1zLnVzZXJXYWxsZXQpO1xuICAgIGluc3RydWN0aW9uID0gY3JlYXRlUGxhY2VCZXRTb2xXaXRoQWZmaWxpYXRlSW5zdHJ1Y3Rpb24oe1xuICAgICAgY29uZmlnOiBDT05GSUdfUERBLFxuICAgICAgbWFya2V0OiBwYXJhbXMubWFya2V0UGRhLFxuICAgICAgcG9zaXRpb246IHBvc2l0aW9uUGRhLFxuICAgICAgYWZmaWxpYXRlOiBwYXJhbXMuYWZmaWxpYXRlUGRhLFxuICAgICAgcmVmZXJyZWRVc2VyOiByZWZlcnJlZFVzZXJQZGEsXG4gICAgICB3aGl0ZWxpc3Q6IHdoaXRlbGlzdFBkYSxcbiAgICAgIHVzZXI6IHBhcmFtcy51c2VyV2FsbGV0LFxuICAgICAgb3V0Y29tZTogcGFyYW1zLm91dGNvbWUgPT09ICd5ZXMnLFxuICAgICAgYW1vdW50OiBhbW91bnRMYW1wb3J0cyxcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpbnN0cnVjdGlvbiA9IGNyZWF0ZVBsYWNlQmV0U29sSW5zdHJ1Y3Rpb24oe1xuICAgICAgY29uZmlnOiBDT05GSUdfUERBLFxuICAgICAgbWFya2V0OiBwYXJhbXMubWFya2V0UGRhLFxuICAgICAgcG9zaXRpb246IHBvc2l0aW9uUGRhLFxuICAgICAgd2hpdGVsaXN0OiB3aGl0ZWxpc3RQZGEsXG4gICAgICB1c2VyOiBwYXJhbXMudXNlcldhbGxldCxcbiAgICAgIG91dGNvbWU6IHBhcmFtcy5vdXRjb21lID09PSAneWVzJyxcbiAgICAgIGFtb3VudDogYW1vdW50TGFtcG9ydHMsXG4gICAgfSk7XG4gIH1cblxuICAvLyBCdWlsZCB0cmFuc2FjdGlvblxuICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbigpO1xuICB0cmFuc2FjdGlvbi5hZGQoaW5zdHJ1Y3Rpb24pO1xuXG4gIC8vIEdldCByZWNlbnQgYmxvY2toYXNoXG4gIGNvbnN0IHsgYmxvY2toYXNoLCBsYXN0VmFsaWRCbG9ja0hlaWdodCB9ID0gYXdhaXQgY29ubi5nZXRMYXRlc3RCbG9ja2hhc2goJ2ZpbmFsaXplZCcpO1xuICB0cmFuc2FjdGlvbi5yZWNlbnRCbG9ja2hhc2ggPSBibG9ja2hhc2g7XG4gIHRyYW5zYWN0aW9uLmZlZVBheWVyID0gcGFyYW1zLnVzZXJXYWxsZXQ7XG5cbiAgLy8gU2VyaWFsaXplIHdpdGhvdXQgc2lnbmF0dXJlcyAocmV0dXJucyBCdWZmZXIpXG4gIGNvbnN0IHNlcmlhbGl6ZWRUeCA9IHRyYW5zYWN0aW9uLnNlcmlhbGl6ZSh7XG4gICAgcmVxdWlyZUFsbFNpZ25hdHVyZXM6IGZhbHNlLFxuICAgIHZlcmlmeVNpZ25hdHVyZXM6IGZhbHNlLFxuICB9KS50b1N0cmluZygnYmFzZTY0Jyk7XG5cbiAgcmV0dXJuIHtcbiAgICB0cmFuc2FjdGlvbixcbiAgICBwb3NpdGlvblBkYSxcbiAgICBzZXJpYWxpemVkVHgsXG4gIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTSU1VTEFUSU9OXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFNpbXVsYXRlIGEgYmV0IHRyYW5zYWN0aW9uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaW11bGF0ZUJldFRyYW5zYWN0aW9uKFxuICB0cmFuc2FjdGlvbjogVHJhbnNhY3Rpb24sXG4gIHVzZXJXYWxsZXQ6IFB1YmxpY0tleSxcbiAgY29ubmVjdGlvbj86IENvbm5lY3Rpb25cbik6IFByb21pc2U8e1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBsb2dzOiBzdHJpbmdbXTtcbiAgdW5pdHNDb25zdW1lZD86IG51bWJlcjtcbiAgZXJyb3I/OiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGNvbm4gPSBjb25uZWN0aW9uIHx8IG5ldyBDb25uZWN0aW9uKFJQQ19FTkRQT0lOVCwgJ2NvbmZpcm1lZCcpO1xuXG4gIHRyeSB7XG4gICAgLy8gVXNlIHRoZSBsZWdhY3kgc2ltdWxhdGlvbiBBUEkgZm9yIFRyYW5zYWN0aW9uIG9iamVjdHNcbiAgICBjb25zdCBzaW11bGF0aW9uID0gYXdhaXQgY29ubi5zaW11bGF0ZVRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcblxuICAgIGlmIChzaW11bGF0aW9uLnZhbHVlLmVycikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGxvZ3M6IHNpbXVsYXRpb24udmFsdWUubG9ncyB8fCBbXSxcbiAgICAgICAgdW5pdHNDb25zdW1lZDogc2ltdWxhdGlvbi52YWx1ZS51bml0c0NvbnN1bWVkLFxuICAgICAgICBlcnJvcjogSlNPTi5zdHJpbmdpZnkoc2ltdWxhdGlvbi52YWx1ZS5lcnIpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGxvZ3M6IHNpbXVsYXRpb24udmFsdWUubG9ncyB8fCBbXSxcbiAgICAgIHVuaXRzQ29uc3VtZWQ6IHNpbXVsYXRpb24udmFsdWUudW5pdHNDb25zdW1lZCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBsb2dzOiBbXSxcbiAgICAgIGVycm9yOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gc2ltdWxhdGlvbiBlcnJvcicsXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTUFSS0VUIERBVEEgRVhUUkFDVElPTlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeHRyYWN0IG1hcmtldF9pZCBmcm9tIG1hcmtldCBhY2NvdW50IGRhdGFcbiAqIFY0LjcuNiBNYXJrZXQgc3RydWN0IGxheW91dDpcbiAqIC0gZGlzY3JpbWluYXRvciAoOCBieXRlcylcbiAqIC0gbWFya2V0X2lkICh1NjQsIDggYnl0ZXMpIDwtLSBGaXJzdCBmaWVsZCFcbiAqIC0gcXVlc3Rpb24gKHN0cmluZzogNCBieXRlIGxlbiArIGNvbnRlbnQpXG4gKiAtIC4uLnJlc3Qgb2YgZmllbGRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0TWFya2V0SWRGcm9tRGF0YShkYXRhOiBCdWZmZXIpOiBiaWdpbnQge1xuICAvLyBtYXJrZXRfaWQgaXMgYXQgb2Zmc2V0IDggKHJpZ2h0IGFmdGVyIGRpc2NyaW1pbmF0b3IpXG4gIHJldHVybiBkYXRhLnJlYWRCaWdVSW50NjRMRSg4KTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGxheWVyIGFuZCBhY2Nlc3NfZ2F0ZSBmcm9tIG1hcmtldCBkYXRhIHRvIGRldGVybWluZSBpZiB3aGl0ZWxpc3QgaXMgbmVlZGVkXG4gKiBSZXR1cm5zIHsgbGF5ZXIsIGFjY2Vzc0dhdGUgfVxuICpcbiAqIExheWVyIHZhbHVlczogMCA9IE9mZmljaWFsLCAxID0gTGFiLCAyID0gUHJpdmF0ZVxuICogQWNjZXNzR2F0ZSB2YWx1ZXM6IDAgPSBQdWJsaWMsIDEgPSBXaGl0ZWxpc3QsIDIgPSBJbnZpdGVIYXNoXG4gKlxuICogSU1QT1JUQU5UOiBPbmx5IFByaXZhdGUgbWFya2V0cyAobGF5ZXI9MikgY2FuIGhhdmUgd2hpdGVsaXN0LlxuICogTGFiIGFuZCBPZmZpY2lhbCBtYXJrZXRzIGFyZSBBTFdBWVMgcHVibGljLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdE1hcmtldEFjY2Vzc0luZm8oZGF0YTogQnVmZmVyKTogeyBsYXllcjogbnVtYmVyOyBhY2Nlc3NHYXRlOiBudW1iZXIgfSB7XG4gIC8vIFY0LjcuNiBNYXJrZXQgc3RydWN0IGxheW91dCBhZnRlciBtYXJrZXRfaWQ6XG4gIC8vIG1hcmtldF9pZCAoOCkgKyBxdWVzdGlvbiAoNCtsZW4pICsgY2xvc2luZ190aW1lICg4KSArIHJlc29sdXRpb25fdGltZSAoOCkgK1xuICAvLyBhdXRvX3N0b3BfYnVmZmVyICg4KSArIHllc19wb29sICg4KSArIG5vX3Bvb2wgKDgpICsgc25hcHNob3RfeWVzX3Bvb2wgKDgpICtcbiAgLy8gc25hcHNob3Rfbm9fcG9vbCAoOCkgKyBzdGF0dXMgKDEpICsgd2lubmluZ19vdXRjb21lICgxKzEgb3B0aW9uKSArXG4gIC8vIGN1cnJlbmN5X3R5cGUgKDEpICsgX3Jlc2VydmVkX3VzZGNfdmF1bHQgKDMzKSArIGNyZWF0b3JfYm9uZCAoOCkgK1xuICAvLyB0b3RhbF9jbGFpbWVkICg4KSArIHBsYXRmb3JtX2ZlZV9jb2xsZWN0ZWQgKDgpICsgbGFzdF9iZXRfdGltZSAoOCkgK1xuICAvLyBidW1wICgxKSArIGxheWVyICgxKSArIHJlc29sdXRpb25fbW9kZSAoMSkgKyBhY2Nlc3NfZ2F0ZSAoMSlcblxuICBsZXQgb2Zmc2V0ID0gODsgLy8gU2tpcCBkaXNjcmltaW5hdG9yXG5cbiAgLy8gbWFya2V0X2lkXG4gIG9mZnNldCArPSA4O1xuXG4gIC8vIHF1ZXN0aW9uIChzdHJpbmc6IDQgYnl0ZSBsZW4gKyBjb250ZW50KVxuICBjb25zdCBxdWVzdGlvbkxlbiA9IGRhdGEucmVhZFVJbnQzMkxFKG9mZnNldCk7XG4gIG9mZnNldCArPSA0ICsgcXVlc3Rpb25MZW47XG5cbiAgLy8gY2xvc2luZ190aW1lLCByZXNvbHV0aW9uX3RpbWUsIGF1dG9fc3RvcF9idWZmZXIgKDMgKiA4ID0gMjQpXG4gIG9mZnNldCArPSAyNDtcblxuICAvLyB5ZXNfcG9vbCwgbm9fcG9vbCwgc25hcHNob3RfeWVzX3Bvb2wsIHNuYXBzaG90X25vX3Bvb2wgKDQgKiA4ID0gMzIpXG4gIG9mZnNldCArPSAzMjtcblxuICAvLyBzdGF0dXMgKGVudW0sIDEgYnl0ZSlcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gd2lubmluZ19vdXRjb21lIChPcHRpb248Ym9vbD46IDEgYnl0ZSBkaXNjcmltaW5hbnQgKyAxIGJ5dGUgdmFsdWUgaWYgU29tZSlcbiAgY29uc3QgaGFzV2lubmluZ091dGNvbWUgPSBkYXRhLnJlYWRVSW50OChvZmZzZXQpO1xuICBvZmZzZXQgKz0gMTtcbiAgaWYgKGhhc1dpbm5pbmdPdXRjb21lID09PSAxKSB7XG4gICAgb2Zmc2V0ICs9IDE7XG4gIH1cblxuICAvLyBjdXJyZW5jeV90eXBlIChlbnVtLCAxIGJ5dGUpXG4gIG9mZnNldCArPSAxO1xuXG4gIC8vIF9yZXNlcnZlZF91c2RjX3ZhdWx0ICgzMyBieXRlcylcbiAgb2Zmc2V0ICs9IDMzO1xuXG4gIC8vIGNyZWF0b3JfYm9uZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gdG90YWxfY2xhaW1lZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gcGxhdGZvcm1fZmVlX2NvbGxlY3RlZCAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gbGFzdF9iZXRfdGltZSAoOClcbiAgb2Zmc2V0ICs9IDg7XG5cbiAgLy8gYnVtcCAoMSlcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gbGF5ZXIgKGVudW0sIDEgYnl0ZSkgLSAwPU9mZmljaWFsLCAxPUxhYiwgMj1Qcml2YXRlXG4gIGNvbnN0IGxheWVyID0gZGF0YS5yZWFkVUludDgob2Zmc2V0KTtcbiAgb2Zmc2V0ICs9IDE7XG5cbiAgLy8gcmVzb2x1dGlvbl9tb2RlIChlbnVtLCAxIGJ5dGUpXG4gIG9mZnNldCArPSAxO1xuXG4gIC8vIGFjY2Vzc19nYXRlIChlbnVtLCAxIGJ5dGUpIC0gMD1QdWJsaWMsIDE9V2hpdGVsaXN0LCAyPUludml0ZUhhc2hcbiAgY29uc3QgYWNjZXNzR2F0ZSA9IGRhdGEucmVhZFVJbnQ4KG9mZnNldCk7XG5cbiAgcmV0dXJuIHsgbGF5ZXIsIGFjY2Vzc0dhdGUgfTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgd2hpdGVsaXN0IGlzIHJlcXVpcmVkIGZvciBiZXR0aW5nXG4gKiBPTkxZIFByaXZhdGUgbWFya2V0cyAobGF5ZXI9Mikgd2l0aCBBY2Nlc3NHYXRlOjpXaGl0ZWxpc3QgbmVlZCB3aGl0ZWxpc3RcbiAqIExhYiAobGF5ZXI9MSkgYW5kIE9mZmljaWFsIChsYXllcj0wKSBtYXJrZXRzIGFyZSBBTFdBWVMgcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1doaXRlbGlzdFJlcXVpcmVkKGRhdGE6IEJ1ZmZlcik6IGJvb2xlYW4ge1xuICBjb25zdCB7IGxheWVyLCBhY2Nlc3NHYXRlIH0gPSBleHRyYWN0TWFya2V0QWNjZXNzSW5mbyhkYXRhKTtcblxuICAvLyBPbmx5IFByaXZhdGUgbWFya2V0cyAobGF5ZXI9MikgY2FuIGhhdmUgd2hpdGVsaXN0XG4gIC8vIExhYiAoMSkgYW5kIE9mZmljaWFsICgwKSBhcmUgQUxXQVlTIHB1YmxpYyByZWdhcmRsZXNzIG9mIGFjY2Vzc19nYXRlXG4gIGlmIChsYXllciAhPT0gMikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEZvciBQcml2YXRlIG1hcmtldHMsIGNoZWNrIGlmIGFjY2Vzc19nYXRlIGlzIFdoaXRlbGlzdCAoMSlcbiAgcmV0dXJuIGFjY2Vzc0dhdGUgPT09IDE7XG59XG5cbi8vIEtlZXAgb2xkIGZ1bmN0aW9uIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBidXQgdXNlIG5ldyBsb2dpY1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY2Nlc3NHYXRlRnJvbURhdGEoZGF0YTogQnVmZmVyKTogbnVtYmVyIHtcbiAgY29uc3QgeyBhY2Nlc3NHYXRlIH0gPSBleHRyYWN0TWFya2V0QWNjZXNzSW5mbyhkYXRhKTtcbiAgcmV0dXJuIGFjY2Vzc0dhdGU7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIRUxQRVI6IEZFVENIIE1BUktFVCBBTkQgQlVJTERcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRmV0Y2ggbWFya2V0IGRhdGEgYW5kIGJ1aWxkIGJldCB0cmFuc2FjdGlvblxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIG1hcmtldCBmZXRjaGluZyBhbmQgbWFya2V0X2lkIGV4dHJhY3Rpb25cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQW5kQnVpbGRCZXRUcmFuc2FjdGlvbihwYXJhbXM6IHtcbiAgbWFya2V0UGRhOiBzdHJpbmc7XG4gIHVzZXJXYWxsZXQ6IHN0cmluZztcbiAgb3V0Y29tZTogJ3llcycgfCAnbm8nO1xuICBhbW91bnRTb2w6IG51bWJlcjtcbiAgYWZmaWxpYXRlUGRhPzogc3RyaW5nO1xuICBhZmZpbGlhdGVPd25lcj86IHN0cmluZztcbiAgY29ubmVjdGlvbj86IENvbm5lY3Rpb247XG59KTogUHJvbWlzZTx7XG4gIHRyYW5zYWN0aW9uOiBCdWlsZEJldFRyYW5zYWN0aW9uUmVzdWx0IHwgbnVsbDtcbiAgbWFya2V0SWQ6IGJpZ2ludDtcbiAgZXJyb3I/OiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGNvbm4gPSBwYXJhbXMuY29ubmVjdGlvbiB8fCBuZXcgQ29ubmVjdGlvbihSUENfRU5EUE9JTlQsICdjb25maXJtZWQnKTtcblxuICB0cnkge1xuICAgIGNvbnN0IG1hcmtldFB1YmtleSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLm1hcmtldFBkYSk7XG4gICAgY29uc3QgdXNlclB1YmtleSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLnVzZXJXYWxsZXQpO1xuXG4gICAgLy8gRmV0Y2ggbWFya2V0IGFjY291bnQgdG8gZ2V0IG1hcmtldF9pZFxuICAgIGNvbnN0IGFjY291bnRJbmZvID0gYXdhaXQgY29ubi5nZXRBY2NvdW50SW5mbyhtYXJrZXRQdWJrZXkpO1xuICAgIGlmICghYWNjb3VudEluZm8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zYWN0aW9uOiBudWxsLFxuICAgICAgICBtYXJrZXRJZDogMG4sXG4gICAgICAgIGVycm9yOiAnTWFya2V0IG5vdCBmb3VuZCcsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhY2NvdW50SW5mby5kYXRhO1xuXG4gICAgLy8gRXh0cmFjdCBtYXJrZXRfaWQgKGZpcnN0IGZpZWxkIGFmdGVyIGRpc2NyaW1pbmF0b3IpXG4gICAgY29uc3QgbWFya2V0SWQgPSBleHRyYWN0TWFya2V0SWRGcm9tRGF0YShkYXRhKTtcblxuICAgIC8vIENoZWNrIGlmIHdoaXRlbGlzdCBpcyByZXF1aXJlZCAob25seSBmb3IgUHJpdmF0ZSBtYXJrZXRzIHdpdGggV2hpdGVsaXN0IGFjY2Vzc19nYXRlKVxuICAgIC8vIExhYiBhbmQgT2ZmaWNpYWwgbWFya2V0cyBhcmUgQUxXQVlTIHB1YmxpYyAtIG5ldmVyIG5lZWQgd2hpdGVsaXN0XG4gICAgY29uc3Qgd2hpdGVsaXN0UmVxdWlyZWQgPSBpc1doaXRlbGlzdFJlcXVpcmVkKGRhdGEpO1xuXG4gICAgLy8gQnVpbGQgYWZmaWxpYXRlIFBEQXMgaWYgcHJvdmlkZWRcbiAgICBsZXQgYWZmaWxpYXRlUGRhOiBQdWJsaWNLZXkgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGFmZmlsaWF0ZU93bmVyOiBQdWJsaWNLZXkgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAocGFyYW1zLmFmZmlsaWF0ZVBkYSAmJiBwYXJhbXMuYWZmaWxpYXRlT3duZXIpIHtcbiAgICAgIGFmZmlsaWF0ZVBkYSA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLmFmZmlsaWF0ZVBkYSk7XG4gICAgICBhZmZpbGlhdGVPd25lciA9IG5ldyBQdWJsaWNLZXkocGFyYW1zLmFmZmlsaWF0ZU93bmVyKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgdHJhbnNhY3Rpb25cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidWlsZEJldFRyYW5zYWN0aW9uKFxuICAgICAge1xuICAgICAgICBtYXJrZXRQZGE6IG1hcmtldFB1YmtleSxcbiAgICAgICAgbWFya2V0SWQsXG4gICAgICAgIHVzZXJXYWxsZXQ6IHVzZXJQdWJrZXksXG4gICAgICAgIG91dGNvbWU6IHBhcmFtcy5vdXRjb21lLFxuICAgICAgICBhbW91bnRTb2w6IHBhcmFtcy5hbW91bnRTb2wsXG4gICAgICAgIGFmZmlsaWF0ZVBkYSxcbiAgICAgICAgYWZmaWxpYXRlT3duZXIsXG4gICAgICAgIHdoaXRlbGlzdFJlcXVpcmVkLFxuICAgICAgfSxcbiAgICAgIGNvbm5cbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRyYW5zYWN0aW9uOiByZXN1bHQsXG4gICAgICBtYXJrZXRJZCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHJhbnNhY3Rpb246IG51bGwsXG4gICAgICBtYXJrZXRJZDogMG4sXG4gICAgICBlcnJvcjogZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcbiAgICB9O1xuICB9XG59XG4iXX0=