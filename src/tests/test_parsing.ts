import { PublicKey, AccountInfo } from '@solana/web3.js';
import BN = require('bn.js');
import { BaoziMonitor } from '../ClaimAgent';
import assert = require('assert');

/**
 * 360 OMEGA TEST v4.7.6: Physical Layout Verification
 * Goal: Prove that the NEW offset 8 (User) and 40 (Market) are functional.
 */

async function runOmegaTest() {
    console.log("⚡ [OMEGA] Initiating Physical Layout Audit (v4.7.6)...");

    // 1. Prepare Binary Data based on baozi-mcp/src/handlers/positions.ts
    // Layout: Disc(8) + User(32) + Market(8) + Yes(8) + No(8) + Claimed(1)
    
    const discriminator = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);
    const user = new PublicKey('8hswmw8fVwErtwgZ6Y85dMR4L2Tytdpk54Jf9fmpKxHs');
    const marketId = new BN(12345);
    const yesAmount = new BN(1000000000); // 1 SOL
    const noAmount = new BN(0);
    const isClaimed = 0;

    const buffer = Buffer.alloc(65); // Minimum size based on decodePosition
    discriminator.copy(buffer, 0);
    user.toBuffer().copy(buffer, 8); // User at Offset 8
    marketId.toArrayLike(Buffer, 'le', 8).copy(buffer, 40); // Market at Offset 40
    yesAmount.toArrayLike(Buffer, 'le', 8).copy(buffer, 48);
    noAmount.toArrayLike(Buffer, 'le', 8).copy(buffer, 56);
    buffer.writeUInt8(isClaimed, 64);

    console.log(`📦 [OMEGA] Constructed V4.7.6 Payload: ${buffer.toString('hex')}`);

    // 2. Instantiate
    const monitor = new BaoziMonitor('http://localhost', 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ', user.toBase58());

    // 3. Inject
    const fakeAccountInfo: AccountInfo<Buffer> = {
        data: buffer,
        executable: false,
        lamports: 0,
        owner: new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'),
        rentEpoch: 0
    };

    const decoded = (monitor as any).decodeUserPosition(new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'), fakeAccountInfo);

    // 4. Assertions
    assert.ok(decoded, "Decoder failed!");
    assert.strictEqual(decoded.user.toBase58(), user.toBase58(), "User offset mismatch (should be 8)");
    assert.strictEqual(decoded.marketId.toString(), "12345", "Market offset mismatch (should be 40)");
    assert.strictEqual(decoded.yesAmount.toString(), "1000000000", "Amount mismatch");

    console.log("✅ [OMEGA] V4.7.6 Layout Confirmed. Logic is Physical.");
}

runOmegaTest().catch(err => {
    console.error("❌ [OMEGA] Test Failed:", err);
    process.exit(1);
});
