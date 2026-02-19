import { PublicKey, AccountInfo } from '@solana/web3.js';
import BN = require('bn.js');
import { BaoziMonitor } from '../ClaimAgent';
import assert = require('assert');

/**
 * 360 OMEGA TEST v5.0: FULL ALIGNMENT
 * Layout: [8 disc][32 market][32 user][8 yes][8 no][1 claimed][1 bump]
 */

async function runOmegaTest() {
    console.log("⚡ [OMEGA] Initiating Full Alignment Audit (v5.0)...");

    const discriminator = Buffer.from([251, 248, 209, 245, 83, 234, 17, 27]);
    const market = new PublicKey('So11111111111111111111111111111111111111112');
    const user = new PublicKey('8hswmw8fVwErtwgZ6Y85dMR4L2Tytdpk54Jf9fmpKxHs');
    const yesAmount = new BN(1000000000);
    const noAmount = new BN(0);
    const isClaimed = 0;

    const buffer = Buffer.alloc(90);
    discriminator.copy(buffer, 0);
    market.toBuffer().copy(buffer, 8); // Market at Offset 8
    user.toBuffer().copy(buffer, 40);   // User at Offset 40 (As required by Maintainer)
    yesAmount.toArrayLike(Buffer, 'le', 8).copy(buffer, 72);
    noAmount.toArrayLike(Buffer, 'le', 8).copy(buffer, 80);
    buffer.writeUInt8(isClaimed, 88);

    console.log(`📦 [OMEGA] Constructed Payload (v5.0): ${buffer.toString('hex')}`);

    const monitor = new BaoziMonitor('http://localhost', 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ', user.toBase58());

    const fakeAccountInfo: AccountInfo<Buffer> = {
        data: buffer,
        executable: false,
        lamports: 0,
        owner: new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'),
        rentEpoch: 0
    };

    const decoded = (monitor as any).decodeUserPosition(new PublicKey('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ'), fakeAccountInfo);

    assert.ok(decoded, "Decoder failed!");
    assert.strictEqual(decoded.user.toBase58(), user.toBase58(), "User offset mismatch (should be 40)");
    assert.strictEqual(decoded.market.toBase58(), market.toBase58(), "Market offset mismatch (should be 8)");
    assert.strictEqual(decoded.yesAmount.toString(), "1000000000", "Amount mismatch");

    console.log("✅ [OMEGA] V5.0 Full Alignment Confirmed.");
}

runOmegaTest().catch(err => {
    console.error("❌ [OMEGA] Test Failed:", err);
    process.exit(1);
});
