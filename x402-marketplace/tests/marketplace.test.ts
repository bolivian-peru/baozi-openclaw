/**
 * x402 Agent Intel Marketplace — Test Suite
 */

import { AgentIntelMarketplace } from '../src/marketplace';
import { AnalystAgent } from '../src/agents/analyst-agent';
import { BuyerAgent } from '../src/agents/buyer-agent';
import { X402PaymentProtocol, X402Error, generateMockSignature } from '../src/x402';
import { ReputationTracker } from '../src/reputation';

describe('AgentIntelMarketplace', () => {
  let marketplace: AgentIntelMarketplace;

  beforeEach(() => {
    marketplace = new AgentIntelMarketplace({
      facilitatorWallet: 'TEST_FACILITATOR_WALLET',
    });
  });

  describe('Analyst Registration', () => {
    it('should register a new analyst', async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
        bio: 'Test analyst bio',
      });

      expect(profile.id).toBeDefined();
      expect(profile.displayName).toBe('TestAnalyst');
      expect(profile.affiliateCode).toBe('TEST');
      expect(profile.wallet).toBe('ANALYST_WALLET_12345678901234567890');
    });

    it('should reject duplicate wallet registration', async () => {
      await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'Analyst1',
        affiliateCode: 'CODE1',
      });

      await expect(marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'Analyst2',
        affiliateCode: 'CODE2',
      })).rejects.toThrow('Wallet already registered');
    });

    it('should reject duplicate affiliate codes', async () => {
      await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_AAAAAAAAAAAAAAAAAAAAAA',
        displayName: 'Analyst1',
        affiliateCode: 'SAME_CODE',
      });

      await expect(marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_BBBBBBBBBBBBBBBBBBBBBB',
        displayName: 'Analyst2',
        affiliateCode: 'SAME_CODE',
      })).rejects.toThrow('Affiliate code already taken');
    });

    it('should validate analyst input', async () => {
      await expect(marketplace.registerAnalyst({
        wallet: 'short',
        displayName: 'A',
        affiliateCode: 'TEST',
      })).rejects.toThrow();
    });
  });

  describe('Analysis Publishing', () => {
    let analystId: string;

    beforeEach(async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
      });
      analystId = profile.id;
    });

    it('should publish a market analysis', async () => {
      const analysis = await marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'A'.repeat(200), // Min 200 chars
        recommendedSide: 'YES',
        confidence: 75,
        priceSOL: 0.01,
      });

      expect(analysis.id).toBeDefined();
      expect(analysis.marketPda).toBe('BTC110k2025_PDA_abc123');
      expect(analysis.recommendedSide).toBe('YES');
      expect(analysis.confidence).toBe(75);
      expect(analysis.priceSOL).toBe(0.01);
      expect(analysis.status).toBe('active');
    });

    it('should reject analysis for non-existent market', async () => {
      await expect(marketplace.publishAnalysis({
        analystId,
        marketPda: 'NONEXISTENT_MARKET',
        thesis: 'A'.repeat(200),
        recommendedSide: 'YES',
        confidence: 75,
        priceSOL: 0.01,
      })).rejects.toThrow('Market not found');
    });

    it('should reject duplicate active analysis for same market', async () => {
      await marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'A'.repeat(200),
        recommendedSide: 'YES',
        confidence: 75,
        priceSOL: 0.01,
      });

      await expect(marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'B'.repeat(200),
        recommendedSide: 'NO',
        confidence: 80,
        priceSOL: 0.02,
      })).rejects.toThrow('Active analysis already exists');
    });

    it('should validate confidence range', async () => {
      await expect(marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'A'.repeat(200),
        recommendedSide: 'YES',
        confidence: 101,
        priceSOL: 0.01,
      })).rejects.toThrow();
    });
  });

  describe('Marketplace Browsing', () => {
    beforeEach(async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
      });

      await marketplace.publishAnalysis({
        analystId: profile.id,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'This is a detailed thesis about BTC reaching 110k. '.repeat(5),
        recommendedSide: 'YES',
        confidence: 75,
        priceSOL: 0.01,
      });

      await marketplace.publishAnalysis({
        analystId: profile.id,
        marketPda: 'ETH5k2025_PDA_def456',
        thesis: 'Ethereum analysis for reaching 5000 dollars by June. '.repeat(5),
        recommendedSide: 'NO',
        confidence: 85,
        priceSOL: 0.02,
      });
    });

    it('should list available analyses', () => {
      const listings = marketplace.browseAnalyses();
      expect(listings.length).toBe(2);
      expect(listings[0].preview.length).toBeLessThanOrEqual(103); // 100 chars + '...'
    });

    it('should filter by market PDA', () => {
      const listings = marketplace.browseAnalyses({
        marketPda: 'BTC110k2025_PDA_abc123',
      });
      expect(listings.length).toBe(1);
      expect(listings[0].analysis.marketPda).toBe('BTC110k2025_PDA_abc123');
    });

    it('should filter by maximum price', () => {
      const listings = marketplace.browseAnalyses({
        maxPrice: 0.015,
      });
      expect(listings.length).toBe(1);
      expect(listings[0].analysis.priceSOL).toBeLessThanOrEqual(0.015);
    });

    it('should filter by side', () => {
      const listings = marketplace.browseAnalyses({ side: 'YES' });
      expect(listings.length).toBe(1);
      expect(listings[0].analysis.recommendedSide).toBe('YES');
    });
  });

  describe('Purchase Flow (x402)', () => {
    let analystId: string;
    let analysisId: string;

    beforeEach(async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
      });
      analystId = profile.id;

      const analysis = await marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'Detailed BTC thesis for testing the purchase flow. '.repeat(5),
        recommendedSide: 'YES',
        confidence: 80,
        priceSOL: 0.01,
      });
      analysisId = analysis.id;
    });

    it('should return 402 payment request', () => {
      const response = marketplace.requestAnalysis(analysisId, 'BUYER_WALLET_xyz');
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Required']).toBe('true');
      expect(response.paymentRequest.amount).toBe(0.01);
      expect(response.paymentRequest.currency).toBe('SOL');
    });

    it('should complete purchase with valid payment', async () => {
      // First request (creates payment request)
      marketplace.requestAnalysis(analysisId, 'BUYER_WALLET_xyz');

      // Then submit payment
      const result = await marketplace.purchaseAnalysis({
        analysisId,
        buyerWallet: 'BUYER_WALLET_xyz',
        buyerAgentId: 'buyer-001',
        transactionSignature: generateMockSignature(),
      });

      expect(result.analysis.thesis).toBeDefined();
      expect(result.analysis.thesis.length).toBeGreaterThan(100);
      expect(result.affiliateLink).toContain('TEST');
      expect(result.purchase.amountSOL).toBe(0.01);
    });

    it('should reject purchase without prior payment request', async () => {
      await expect(marketplace.purchaseAnalysis({
        analysisId,
        buyerWallet: 'BUYER_WALLET_xyz',
        buyerAgentId: 'buyer-001',
        transactionSignature: generateMockSignature(),
      })).rejects.toThrow();
    });

    it('should track purchase count', async () => {
      marketplace.requestAnalysis(analysisId, 'BUYER1_WALLET_aaaaaaa');
      await marketplace.purchaseAnalysis({
        analysisId,
        buyerWallet: 'BUYER1_WALLET_aaaaaaa',
        buyerAgentId: 'buyer-001',
        transactionSignature: generateMockSignature(),
      });

      const listings = marketplace.browseAnalyses();
      const listing = listings.find(l => l.analysis.id === analysisId);
      expect(listing?.analysis.purchaseCount).toBe(1);
    });
  });

  describe('Affiliate Betting', () => {
    let analystId: string;
    let analysisId: string;

    beforeEach(async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
      });
      analystId = profile.id;

      const analysis = await marketplace.publishAnalysis({
        analystId,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'BTC analysis for affiliate betting test flow. '.repeat(6),
        recommendedSide: 'YES',
        confidence: 80,
        priceSOL: 0.01,
      });
      analysisId = analysis.id;

      // Buyer purchases analysis
      marketplace.requestAnalysis(analysisId, 'BUYER_WALLET_xyz');
      await marketplace.purchaseAnalysis({
        analysisId,
        buyerWallet: 'BUYER_WALLET_xyz',
        buyerAgentId: 'buyer-001',
        transactionSignature: generateMockSignature(),
      });
    });

    it('should place bet with affiliate code', async () => {
      const result = await marketplace.placeBetWithAffiliate({
        buyerWallet: 'BUYER_WALLET_xyz',
        analysisId,
        amount: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.affiliateCode).toBe('TEST');
    });

    it('should reject bet without purchase', async () => {
      await expect(marketplace.placeBetWithAffiliate({
        buyerWallet: 'UNPAID_BUYER_WALLET',
        analysisId,
        amount: 1.0,
      })).rejects.toThrow('Must purchase analysis');
    });

    it('should track affiliate commission', async () => {
      await marketplace.placeBetWithAffiliate({
        buyerWallet: 'BUYER_WALLET_xyz',
        analysisId,
        amount: 10.0,
      });

      const reputation = marketplace.reputationTracker.getReputation(analystId);
      expect(reputation?.revenueAffiliate).toBe(0.1); // 1% of 10 SOL
    });
  });

  describe('Market Resolution', () => {
    let analyst1Id: string;
    let analyst2Id: string;

    beforeEach(async () => {
      const profile1 = await marketplace.registerAnalyst({
        wallet: 'ANALYST1_WALLET_1234567890123456789',
        displayName: 'Analyst1',
        affiliateCode: 'A1',
      });
      analyst1Id = profile1.id;

      const profile2 = await marketplace.registerAnalyst({
        wallet: 'ANALYST2_WALLET_9876543210987654321',
        displayName: 'Analyst2',
        affiliateCode: 'A2',
      });
      analyst2Id = profile2.id;

      // Analyst1 says YES, Analyst2 says NO on same market
      await marketplace.publishAnalysis({
        analystId: analyst1Id,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'Bull thesis: BTC will definitely reach 110k based on fundamentals. '.repeat(4),
        recommendedSide: 'YES',
        confidence: 80,
        priceSOL: 0.01,
      });

      await marketplace.publishAnalysis({
        analystId: analyst2Id,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'Bear thesis: BTC is overpriced and will not reach 110k target. '.repeat(4),
        recommendedSide: 'NO',
        confidence: 70,
        priceSOL: 0.01,
      });
    });

    it('should resolve analyses and update accuracy', async () => {
      // Market resolves YES
      marketplace.baoziClient.resolveMarket('BTC110k2025_PDA_abc123', 0);
      
      const results = await marketplace.resolveMarketAnalyses('BTC110k2025_PDA_abc123');
      
      expect(results.length).toBe(2);
      
      const result1 = results.find(r => r.analystId === analyst1Id);
      const result2 = results.find(r => r.analystId === analyst2Id);
      
      expect(result1?.correct).toBe(true);
      expect(result2?.correct).toBe(false);
    });

    it('should update reputation tiers after multiple resolutions', async () => {
      // Simulate multiple analyses and resolutions
      const markets = [
        'ETH5k2025_PDA_def456',
        'SOL200_PDA_ghi789',
        'FED_RATE_PDA_jkl012',
        'AI_AGI_PDA_mno345',
      ];

      for (const pda of markets) {
        await marketplace.publishAnalysis({
          analystId: analyst1Id,
          marketPda: pda,
          thesis: `Analysis for market ${pda} with detailed reasoning and data. `.repeat(4),
          recommendedSide: 'YES',
          confidence: 75,
          priceSOL: 0.01,
        });
      }

      // Resolve BTC market (YES wins — analyst1 correct)
      marketplace.baoziClient.resolveMarket('BTC110k2025_PDA_abc123', 0);
      await marketplace.resolveMarketAnalyses('BTC110k2025_PDA_abc123');

      // Resolve several more markets (YES wins for all)
      for (const pda of markets) {
        marketplace.baoziClient.resolveMarket(pda, 0);
        await marketplace.resolveMarketAnalyses(pda);
      }

      const rep = marketplace.reputationTracker.getReputation(analyst1Id);
      expect(rep?.resolvedAnalyses).toBe(5);
      expect(rep?.correctPredictions).toBe(5);
      expect(rep?.accuracy).toBe(1.0);
      expect(rep?.tier).toBe('apprentice'); // 5 resolved analyses
    });
  });

  describe('Marketplace Stats', () => {
    it('should track marketplace statistics', async () => {
      const profile = await marketplace.registerAnalyst({
        wallet: 'ANALYST_WALLET_12345678901234567890',
        displayName: 'TestAnalyst',
        affiliateCode: 'TEST',
      });

      await marketplace.publishAnalysis({
        analystId: profile.id,
        marketPda: 'BTC110k2025_PDA_abc123',
        thesis: 'Stats test thesis content with sufficient length. '.repeat(5),
        recommendedSide: 'YES',
        confidence: 80,
        priceSOL: 0.01,
      });

      const stats = marketplace.getMarketplaceStats();
      expect(stats.totalAnalysts).toBe(1);
      expect(stats.totalAnalyses).toBe(1);
      expect(stats.activeAnalyses).toBe(1);
    });
  });
});

describe('X402PaymentProtocol', () => {
  let protocol: X402PaymentProtocol;

  beforeEach(() => {
    protocol = new X402PaymentProtocol('FACILITATOR_WALLET');
  });

  it('should calculate facilitator fees', () => {
    const { fee, netAmount } = protocol.calculateFee(1.0);
    expect(fee).toBe(0.01); // 1% fee
    expect(netAmount).toBe(0.99);
  });

  it('should generate valid mock signatures', () => {
    const sig = generateMockSignature();
    expect(sig.length).toBe(88);
  });

  it('should track payment statistics', async () => {
    const analysis = {
      id: 'test-analysis-1',
      priceSOL: 0.01,
    } as any;

    protocol.createPaymentRequest(analysis, 'ANALYST_WALLET');
    await protocol.submitPayment('test-analysis-1', 'BUYER_WALLET', generateMockSignature());

    const stats = protocol.getStats();
    expect(stats.totalPayments).toBe(1);
    expect(stats.totalVolume).toBe(0.01);
  });
});

describe('ReputationTracker', () => {
  let tracker: ReputationTracker;

  beforeEach(() => {
    tracker = new ReputationTracker();
  });

  it('should initialize reputation for new analyst', () => {
    const rep = tracker.initializeReputation('analyst-1');
    expect(rep.tier).toBe('newcomer');
    expect(rep.accuracy).toBe(0);
    expect(rep.totalAnalyses).toBe(0);
  });

  it('should track correct predictions', () => {
    tracker.initializeReputation('analyst-1');
    
    const analysis = {
      id: 'analysis-1',
      recommendedSide: 'YES' as const,
      outcome: 'pending' as const,
      status: 'active' as const,
    } as any;
    
    tracker.recordAnalysis('analyst-1', analysis);
    const result = tracker.resolveAnalysis('analyst-1', 'analysis-1', 'YES');
    
    expect(result.correct).toBe(true);
    expect(result.newAccuracy).toBe(1.0);
  });

  it('should track incorrect predictions', () => {
    tracker.initializeReputation('analyst-1');
    
    const analysis = {
      id: 'analysis-1',
      recommendedSide: 'YES' as const,
      outcome: 'pending' as const,
      status: 'active' as const,
    } as any;
    
    tracker.recordAnalysis('analyst-1', analysis);
    const result = tracker.resolveAnalysis('analyst-1', 'analysis-1', 'NO');
    
    expect(result.correct).toBe(false);
    expect(result.newAccuracy).toBe(0);
  });

  it('should generate leaderboard sorted by accuracy', () => {
    tracker.initializeReputation('analyst-1');
    tracker.initializeReputation('analyst-2');
    
    // Analyst 1: 2/2 correct
    const a1 = { id: 'a1', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 80 } as any;
    const a2 = { id: 'a2', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 70 } as any;
    tracker.recordAnalysis('analyst-1', a1);
    tracker.recordAnalysis('analyst-1', a2);
    tracker.resolveAnalysis('analyst-1', 'a1', 'YES');
    tracker.resolveAnalysis('analyst-1', 'a2', 'YES');
    
    // Analyst 2: 1/2 correct
    const b1 = { id: 'b1', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 90 } as any;
    const b2 = { id: 'b2', recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 60 } as any;
    tracker.recordAnalysis('analyst-2', b1);
    tracker.recordAnalysis('analyst-2', b2);
    tracker.resolveAnalysis('analyst-2', 'b1', 'YES');
    tracker.resolveAnalysis('analyst-2', 'b2', 'NO');
    
    const leaderboard = tracker.getLeaderboard();
    expect(leaderboard[0].analystId).toBe('analyst-1');
    expect(leaderboard[0].accuracy).toBe(1.0);
    expect(leaderboard[1].analystId).toBe('analyst-2');
    expect(leaderboard[1].accuracy).toBe(0.5);
  });

  it('should track streaks', () => {
    tracker.initializeReputation('analyst-1');
    
    for (let i = 0; i < 5; i++) {
      const a = { id: `a${i}`, recommendedSide: 'YES' as const, outcome: 'pending' as const, status: 'active' as const, confidence: 80 } as any;
      tracker.recordAnalysis('analyst-1', a);
      tracker.resolveAnalysis('analyst-1', `a${i}`, 'YES');
    }
    
    const rep = tracker.getReputation('analyst-1');
    expect(rep?.streak).toBe(5);
    expect(rep?.bestStreak).toBe(5);
  });
});

describe('AnalystAgent', () => {
  let marketplace: AgentIntelMarketplace;
  let agent: AnalystAgent;

  beforeEach(() => {
    marketplace = new AgentIntelMarketplace();
    agent = new AnalystAgent({
      wallet: 'ANALYST_WALLET_12345678901234567890',
      displayName: 'TestAnalyst',
      affiliateCode: 'TEST',
      strategy: 'fundamental',
      defaultPriceSOL: 0.01,
      minConfidenceThreshold: 50,
    }, marketplace);
  });

  it('should initialize and register', async () => {
    const profile = await agent.initialize();
    expect(profile.displayName).toBe('TestAnalyst');
    expect(agent.getProfile()).toBeDefined();
  });

  it('should analyze a market', async () => {
    await agent.initialize();
    const analysis = await agent.analyzeMarket('BTC110k2025_PDA_abc123');
    expect(analysis.side).toBeDefined();
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.thesis.length).toBeGreaterThan(0);
  });

  it('should analyze and publish', async () => {
    await agent.initialize();
    const published = await agent.analyzeAndPublish('BTC110k2025_PDA_abc123');
    expect(published.id).toBeDefined();
    expect(published.status).toBe('active');
  });

  it('should fail to publish without initialization', async () => {
    await expect(agent.analyzeAndPublish('BTC110k2025_PDA_abc123'))
      .rejects.toThrow('not initialized');
  });
});

describe('BuyerAgent', () => {
  let marketplace: AgentIntelMarketplace;
  let buyer: BuyerAgent;

  beforeEach(async () => {
    marketplace = new AgentIntelMarketplace();
    
    // Set up an analyst with published analysis
    const analyst = new AnalystAgent({
      wallet: 'ANALYST_WALLET_12345678901234567890',
      displayName: 'TestAnalyst',
      affiliateCode: 'TEST',
      strategy: 'fundamental',
      defaultPriceSOL: 0.01,
      minConfidenceThreshold: 50,
    }, marketplace);
    await analyst.initialize();
    await analyst.analyzeAndPublish('BTC110k2025_PDA_abc123');

    buyer = new BuyerAgent({
      wallet: 'BUYER_WALLET_98765432109876543210',
      agentId: 'buyer-test-001',
      maxPriceSOL: 0.05,
      minAnalystAccuracy: 0,
      minConfidence: 50,
      autoBet: true,
      maxBetAmount: 1.0,
    }, marketplace);
  });

  it('should browse marketplace', () => {
    const listings = buyer.browseMarketplace();
    expect(listings.length).toBeGreaterThan(0);
  });

  it('should evaluate listings', () => {
    const listings = buyer.browseMarketplace();
    const evaluation = buyer.evaluateListing(listings[0]);
    expect(evaluation.score).toBeGreaterThan(0);
    expect(['buy', 'skip', 'watchlist']).toContain(evaluation.recommendation);
    expect(evaluation.reasons.length).toBeGreaterThan(0);
  });

  it('should execute discover and act flow', async () => {
    const results = await buyer.discoverAndAct();
    expect(results.evaluated).toBeGreaterThan(0);
  });

  it('should track portfolio', async () => {
    await buyer.discoverAndAct();
    const portfolio = buyer.getPortfolioSummary();
    expect(portfolio.analysesCount).toBeGreaterThanOrEqual(0);
  });
});
