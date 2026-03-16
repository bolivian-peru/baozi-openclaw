/**
 * Tests for Intel Marketplace Core Functions
 */

import * as assert from 'assert';
import * as intel from '../src/index';
import * as db from '../src/database';

const TEST_WALLET = 'TestWallet' + Math.random().toString(36).substring(7);
const TEST_BUYER = 'TestBuyer' + Math.random().toString(36).substring(7);

describe('Intel Marketplace', () => {
  before(() => {
    db.initDatabase();
  });

  describe('Analyst Registration', () => {
    it('should register a new analyst', async () => {
      const result = await intel.registerAnalyst(
        TEST_WALLET,
        'TestAnalyst',
        'TEST' + Math.random().toString(36).substring(4).toUpperCase()
      );
      
      assert(result.success, 'Registration should succeed');
      assert(result.analyst, 'Should return analyst');
      assert(result.analyst?.displayName === 'TestAnalyst');
    });

    it('should reject invalid affiliate codes', async () => {
      const result = await intel.registerAnalyst(
        TEST_WALLET,
        'TestAnalyst2',
        'AB' // Too short
      );
      
      assert(!result.success, 'Should reject short codes');
      assert(result.error?.includes('3-10'));
    });
  });

  describe('Profile & Stats', () => {
    it('should get analyst profile with stats', () => {
      const profile = intel.getAnalystProfile(TEST_WALLET);
      
      assert(profile, 'Should return profile');
      assert(profile?.wallet === TEST_WALLET);
      assert(profile?.stats, 'Should include stats');
      assert(typeof profile?.stats.totalAnalyses === 'number');
    });
  });

  describe('Publish Analysis', () => {
    it('should reject analysis from unregistered analyst', async () => {
      const result = await intel.publishAnalysis(
        'UnknownWallet',
        'Market123',
        'Will X happen?',
        'A'.repeat(300),
        'YES',
        75,
        0.01
      );
      
      assert(!result.success, 'Should reject unknown analyst');
    });

    it('should publish valid analysis', async () => {
      const result = await intel.publishAnalysis(
        TEST_WALLET,
        'MarketTest123',
        'Will BTC hit $100k?',
        'Based on analysis of market conditions and historical data, this outcome appears likely. ' +
        'The fundamentals support continued growth. ' +
        'Technical indicators show strong momentum. ' +
        'On-chain metrics suggest accumulation. ' +
        'Institutional interest remains robust.',
        'YES',
        72,
        0.05
      );
      
      assert(result.success, 'Should publish successfully');
      assert(result.analysis, 'Should return analysis');
      assert(result.analysis?.recommendedSide === 'YES');
      assert(result.analysis?.confidence === 72);
    });

    it('should reject short thesis', async () => {
      const result = await intel.publishAnalysis(
        TEST_WALLET,
        'MarketTest123',
        'Will X happen?',
        'Too short',
        'YES',
        50,
        0.01
      );
      
      assert(!result.success, 'Should reject short thesis');
    });
  });

  describe('List Intel', () => {
    it('should list intel for a market', () => {
      const listings = intel.listIntel('MarketTest123');
      
      assert(Array.isArray(listings), 'Should return array');
      assert(listings.length > 0, 'Should have listings');
      
      const listing = listings[0];
      assert(listing.analyst, 'Should include analyst');
      assert(listing.priceSol > 0, 'Should have price');
    });
  });

  describe('Purchase', () => {
    it('should create payment request', async () => {
      const listings = intel.listIntel('MarketTest123');
      const analysisId = listings[0].id;
      
      const result = await intel.getPaymentRequest(analysisId, TEST_BUYER);
      
      assert(result.success, 'Should create request');
      assert(result.request, 'Should include request');
      assert(result.request?.amount > 0, 'Should have amount');
    });

    it('should process purchase', async () => {
      const listings = intel.listIntel('MarketTest123');
      const analysisId = listings[0].id;
      
      const paymentReq = await intel.getPaymentRequest(analysisId, TEST_BUYER);
      const purchase = await intel.purchaseIntel(
        paymentReq.request!,
        TEST_BUYER,
        'test_tx_123'
      );
      
      assert(purchase.success, 'Purchase should succeed');
      assert(purchase.analysis, 'Should return analysis');
      assert(purchase.analysis?.thesis.length > 0, 'Should include thesis');
    });
  });

  describe('Reputation', () => {
    it('should update resolution', async () => {
      const listings = intel.listIntel('MarketTest123');
      const analysisId = listings[0].id;
      
      const result = await intel.updateAnalysisResolution(analysisId, 'YES');
      
      assert(result.success, 'Should update');
      assert(result.correct === true, 'Should be correct');
    });

    it('should reflect in stats', () => {
      const profile = intel.getAnalystProfile(TEST_WALLET);
      
      assert(profile?.stats.totalAnalyses === 1, 'Should have 1 analysis');
      assert(profile?.stats.correct === 1, 'Should have 1 correct');
      assert(profile?.stats.accuracy === 1, 'Should have 100% accuracy');
    });
  });

  describe('Leaderboard', () => {
    it('should return sorted leaderboard', () => {
      const leaders = intel.getLeaderboard(10);
      
      assert(Array.isArray(leaders), 'Should return array');
      
      // Check sorted by accuracy
      for (let i = 1; i < leaders.length; i++) {
        assert(
          leaders[i-1].stats.accuracy >= leaders[i].stats.accuracy,
          'Should be sorted by accuracy'
        );
      }
    });
  });
});
