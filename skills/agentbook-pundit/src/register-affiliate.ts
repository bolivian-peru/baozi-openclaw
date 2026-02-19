/**
 * Register an affiliate code on-chain via MCP server.
 * This earns 1% lifetime commission on all volume from shared links.
 *
 * Usage: npx tsx src/register-affiliate.ts
 *
 * Requires:
 *   - PRIVATE_KEY in .env (to sign the transaction)
 *   - ~0.01 SOL for transaction fee
 *   - npx @baozi.bet/mcp-server available
 */
import { spawn } from 'child_process';
import { Keypair, Connection, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const wallet = keypair.publicKey.toBase58();

  console.log(`Registering affiliate for wallet: ${wallet}`);
  console.log(`RPC: ${rpcUrl}`);

  // Start MCP server
  console.log('Starting MCP server...');
  const mcp = spawn('npx', ['@baozi.bet/mcp-server'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for startup
  await new Promise(r => setTimeout(r, 3000));

  // Send JSON-RPC to build affiliate registration tx
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'build_register_affiliate_transaction',
      arguments: { walletAddress: wallet },
    },
  };

  const json = JSON.stringify(request);
  mcp.stdin!.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);

  // Read response
  const response = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MCP timeout')), 30000);
    let buffer = '';
    mcp.stdout!.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          clearTimeout(timer);
          resolve(JSON.stringify(parsed));
          return;
        } catch { /* not complete yet */ }
      }
    });
  });

  const result = JSON.parse(response);
  if (result.error) {
    console.error('MCP error:', result.error);
    mcp.kill();
    process.exit(1);
  }

  const txData = result.result;
  if (!txData?.transaction) {
    console.error('No transaction returned:', txData);
    mcp.kill();
    process.exit(1);
  }

  // Sign and send
  const conn = new Connection(rpcUrl, 'confirmed');
  const tx = Transaction.from(Buffer.from(txData.transaction, 'base64'));
  tx.sign(keypair);

  console.log('Submitting transaction...');
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction(sig, 'confirmed');

  console.log(`\nAffiliate registered!`);
  console.log(`TX: https://solscan.io/tx/${sig}`);
  console.log(`\nAdd to .env: AFFILIATE_CODE=${wallet}`);
  console.log('All shared market links will now include your affiliate code for 1% commission.');

  mcp.kill();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
