/**
 * One-time script to create the on-chain CreatorProfile.
 * Run: npm run profile
 */
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { config } from './config';

async function createProfile() {
  if (!config.privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const keypair = Keypair.fromSecretKey(bs58.decode(config.privateKey));
  const connection = new Connection(config.rpcUrl, 'confirmed');

  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  if (balance < 5000000) { // 0.005 SOL minimum
    console.error('❌ Insufficient balance. Need at least 0.005 SOL for account rent + tx fee.');
    process.exit(1);
  }

  // Get the transaction from Baozi MCP
  console.log('Building CreatorProfile transaction...');

  // Use the MCP server via HTTP or direct call
  // For simplicity, we'll construct the API call
  const proc = require('child_process');
  const input = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'build_create_creator_profile_transaction',
      arguments: {
        wallet: keypair.publicKey.toBase58(),
        display_name: 'Captain',
        creator_fee_bps: 50,
        creator_wallet: keypair.publicKey.toBase58(),
      },
    },
  });

  const result = proc.execSync(`echo '${input}' | npx @baozi.bet/mcp-server 2>/dev/null`, {
    encoding: 'utf8',
  });

  const parsed = JSON.parse(result);
  const toolResult = JSON.parse(parsed.result.content[0].text);

  if (!toolResult.success) {
    console.error('❌ Failed to build transaction:', toolResult.error);
    process.exit(1);
  }

  console.log(`CreatorProfile PDA: ${toolResult.creatorProfilePda}`);

  // Deserialize and sign
  const serialized = Buffer.from(toolResult.transaction.serialized, 'base64');
  const tx = Transaction.from(serialized);

  // Set recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;

  // Sign
  tx.sign(keypair);

  // Send
  console.log('Sending transaction...');
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log(`Transaction sent: ${signature}`);
  console.log('Confirming...');

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log(`✅ CreatorProfile created!`);
  console.log(`   PDA: ${toolResult.creatorProfilePda}`);
  console.log(`   Tx: https://solscan.io/tx/${signature}`);
}

createProfile().catch(console.error);
