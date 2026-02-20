/**
 * One-time script to create the on-chain CreatorProfile.
 * Run: npm run profile
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

async function createProfile() {
  if (!config.privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(config.privateKey));
  const connection = new Connection(config.rpcUrl, 'confirmed');

  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  if (balance < 5000000) {
    console.error('❌ Insufficient balance. Need at least 0.005 SOL for account rent + tx fee.');
    process.exit(1);
  }

  console.log('Building CreatorProfile transaction...');

  const proc = require('child_process');
  const input = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'build_create_creator_profile_transaction',
      arguments: {
        wallet: keypair.publicKey.toBase58(),
        display_name: process.env.CREATOR_DISPLAY_NAME || 'Captain',
        creator_fee_bps: Number(process.env.CREATOR_FEE_BPS || 50),
        creator_wallet: keypair.publicKey.toBase58(),
      },
    },
  });

  const result = proc.execSync(`echo '${input}' | npx @baozi.bet/mcp-server 2>/dev/null`, {
    encoding: 'utf8',
  });

  const toolResult = parseToolText(result);

  if (!toolResult.success) {
    console.error('❌ Failed to build transaction:', toolResult.error);
    process.exit(1);
  }

  console.log(`CreatorProfile PDA: ${toolResult.creatorProfilePda}`);

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

  console.log(`Transaction sent: ${signature}`);
  console.log('Confirming...');

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

  console.log('✅ CreatorProfile created!');
  console.log(`   PDA: ${toolResult.creatorProfilePda}`);
  console.log(`   Tx: https://solscan.io/tx/${signature}`);
}

createProfile().catch(err => {
  console.error('❌ CreatorProfile creation failed:', err?.message || err);
  process.exit(1);
});
