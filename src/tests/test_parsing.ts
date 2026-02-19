import { PublicKey, AccountInfo } from '@solana/web3.js';
import BN = require('bn.js');
import { BaoziMonitor } from '../ClaimAgent';
import assert = require('assert');

/**
 * 360 OMEGA TEST: Structural Decoding Verification
 * Goal: Prove that binary data is correctly parsed into TypeScript objects.
 */

async function runOmegaTest() {
    console.log("⚡ [OMEGA] Initiating 360 Structural Audit...");

    // 1. Prepare Synthetic Binary Data (Anchor Layout)
    // Layout: Disc(8) + Owner(32) + Market(32) + Amount(8) + Claimed(1)
    
    const discriminator = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]); // The holy discriminator
    const owner = new PublicKey('8hswmw8fVwErtwgZ6Y85dMR4L2Tytdpk54Jf9fmpKxHs');
    const market = new PublicKey('So11111111111111111111111111111111111111112');
    const amount = new BN(5000000000); // 5 SOL
    const isClaimed = 0; // False

    const buffer = Buffer.alloc(81);
    discriminator.copy(buffer, 0);
    owner.toBuffer().copy(buffer, 8);
    market.toBuffer().copy(buffer, 40);
    amount.toArrayLike(Buffer, 'le', 8).copy(buffer, 72);
    buffer.writeUInt8(isClaimed, 80);

    console.log(`📦 [OMEGA] Constructed Payload: ${buffer.toString('hex')}`);

    // 2. Instantiate Monitor (Mocking connection string only, logic is real)
    const monitor = new BaoziMonitor('http://localhost', '11111111111111111111111111111111', owner.toBase58());

    // 3. Inject Data into Decoder (Private method access via 'any' casting for testing)
    const fakeAccountInfo: AccountInfo<Buffer> = {
        data: buffer,
        executable: false,
        lamports: 0,
        owner: new PublicKey('Baozi11111111111111111111111111111111111111'),
        rentEpoch: 0
    };

    const decoded = (monitor as any).decodeUserPosition(new PublicKey('11111111111111111111111111111111'), fakeAccountInfo);

    // 4. Assertions (The Truth)
    assert.ok(decoded, "Decoder returned null!");
    assert.strictEqual(decoded.owner.toBase58(), owner.toBase58(), "Owner mismatch");
    assert.strictEqual(decoded.market.toBase58(), market.toBase58(), "Market mismatch");
    assert.strictEqual(decoded.stakedAmount.toString(), amount.toString(), "Amount mismatch");
    assert.strictEqual(decoded.isClaimed, false, "Claimed flag mismatch");

    console.log("✅ [OMEGA] Decoder Verification Passed.");
    console.log(`   - Parsed Owner: ${decoded.owner.toBase58()}`);
    console.log(`   - Parsed Stake: ${decoded.stakedAmount.toString()}`);
}

runOmegaTest().catch(err => {
    console.error("❌ [OMEGA] Test Failed:", err);
    process.exit(1);
});
