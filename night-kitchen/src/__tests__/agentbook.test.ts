/**
 * 夜厨房 — AgentBook Publisher Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { postToAgentBook, batchPost, isValidWalletAddress } from '../agentbook.js';
import type { PublisherConfig } from '../agentbook.js';

// =============================================================================
// WALLET VALIDATION TESTS
// =============================================================================

describe('isValidWalletAddress', () => {
  it('should accept valid Ethereum addresses', () => {
    expect(isValidWalletAddress('0x59c7D3E9926403FBfdA678503827eFF0c5390D83')).toBe(true);
  });

  it('should reject invalid Ethereum addresses (too short)', () => {
    expect(isValidWalletAddress('0x1234')).toBe(false);
  });

  it('should accept valid Solana addresses', () => {
    expect(isValidWalletAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidWalletAddress('')).toBe(false);
  });
});

// =============================================================================
// DRY RUN TESTS
// =============================================================================

describe('postToAgentBook — dry run', () => {
  const config: PublisherConfig = {
    walletAddress: '0x59c7D3E9926403FBfdA678503827eFF0c5390D83',
    dryRun: true,
  };

  it('should succeed in dry run mode', async () => {
    const result = await postToAgentBook(config, 'Test content');
    expect(result.success).toBe(true);
    expect(result.postId).toContain('dry-run');
  });

  it('should fail with empty wallet address', async () => {
    const badConfig = { ...config, walletAddress: '' };
    const result = await postToAgentBook(badConfig, 'Test content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Wallet address');
  });

  it('should fail with empty content', async () => {
    const result = await postToAgentBook(config, '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Content');
  });

  it('should fail with whitespace-only content', async () => {
    const result = await postToAgentBook(config, '   ');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Content');
  });

  it('should accept content with marketPda', async () => {
    const result = await postToAgentBook(
      config,
      'Test report content',
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    );
    expect(result.success).toBe(true);
  });

  it('should truncate very long content', async () => {
    const longContent = 'A'.repeat(20000);
    const result = await postToAgentBook(config, longContent);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// BATCH POST TESTS
// =============================================================================

describe('batchPost — dry run', () => {
  const config: PublisherConfig = {
    walletAddress: '0x59c7D3E9926403FBfdA678503827eFF0c5390D83',
    dryRun: true,
  };

  it('should post multiple items', async () => {
    const posts = [
      { content: 'Report 1', marketPda: 'pda1' },
      { content: 'Report 2', marketPda: 'pda2' },
      { content: 'Report 3' },
    ];
    const results = await batchPost(config, posts);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle empty batch', async () => {
    const results = await batchPost(config, []);
    expect(results).toHaveLength(0);
  });
});
