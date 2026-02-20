/**
 * One-time script to register an affiliate code on-chain.
 * Run: npm run affiliate -- <CODE>
 */
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config';

function parseToolText(raw: string): any {
  const parsed = JSON.parse(raw);
  const text = parsed?.result?.content?.[0]?.text;
  if (!text) throw new Error('Missing MCP tool response text');
  return JSON.parse(text);
}

async function registerAffiliate() {
  if (!config.privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const code = process.argv[2] || config.affiliateCode;
  if (!code) {
    console.error('❌ Missing affiliate code. Pass one via `npm run affiliate -- <CODE>` or AFFILIATE_CODE env var.');
    process.exit(1);
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(config.privateKey));
  const connection = new Connection(config.rpcUrl, 'confirmed');

  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);
  console.log(`Affiliate code: ${code}`);

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  if (balance < 3000000) {
    console.error('❌ Insufficient balance. Need at least ~0.003 SOL for tx fees/rent.');
    process.exit(1);
  }

  const proc = require('child_process');
  const input = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'build_register_affiliate_transaction',
      arguments: {
        wallet: keypair.publicKey.toBase58(),
        code,
      },
    },
  });

  console.log('Building affiliate registration transaction...');
  const result = proc.execSync(`echo '${input}' | npx @baozi.bet/mcp-server 2>/dev/null`, {
    encoding: 'utf8',
  });

  const toolResult = parseToolText(result);
  if (!toolResult.success) {
    console.error('❌ Failed to build transaction:', toolResult.error);
    process.exit(1);
  }

  const serialized = Buffer.from(toolResult.transaction.serialized, 'base64');
  const tx = Transaction.from(serialized);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  console.log('Sending transaction...');
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  console.log('✅ Affiliate code registered');
  console.log(`Code: ${code}`);
  console.log(`Tx: https://solscan.io/tx/${signature}`);
}

registerAffiliate().catch(err => {
  console.error('❌ Affiliate registration failed:', err?.message || err);
  process.exit(1);
});
