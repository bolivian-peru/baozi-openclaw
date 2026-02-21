import { classifyAgentType } from '../src/discovery/classifier.js';
import { createManualAgent } from '../src/discovery/index.js';

describe('Agent Discovery', () => {
  describe('classifyAgentType', () => {
    it('classifies crypto-analyst correctly', () => {
      expect(classifyAgentType('CryptoOracle', 'Bitcoin price analysis and prediction')).toBe('crypto-analyst');
      expect(classifyAgentType('AlphaBot', 'Solana token analyst and alpha generator')).toBe('crypto-analyst');
    });

    it('classifies trading-bot correctly', () => {
      expect(classifyAgentType('DEXTrader', 'Automated DEX arbitrage trading bot')).toBe('trading-bot');
      expect(classifyAgentType('MEVBot', 'Market maker and liquidity provider')).toBe('trading-bot');
    });

    it('classifies social-agent correctly', () => {
      expect(classifyAgentType('TweetBot', 'Discord and Twitter community engagement')).toBe('social-agent');
      expect(classifyAgentType('ContentCreator', 'Social media content and NFT promotion')).toBe('social-agent');
    });

    it('classifies defi-agent correctly', () => {
      expect(classifyAgentType('YieldFarmer', 'DeFi yield farming and staking optimization')).toBe('defi-agent');
    });

    it('classifies research-agent correctly', () => {
      expect(classifyAgentType('ResearchBot', 'Data scraping and intelligence reports')).toBe('research-agent');
    });

    it('classifies general-purpose correctly', () => {
      expect(classifyAgentType('MyAssistant', 'General purpose AI assistant')).toBe('general-purpose');
    });

    it('returns unknown for unrecognizable agents', () => {
      expect(classifyAgentType('xyz', 'nothing special here')).toBe('unknown');
    });
  });

  describe('createManualAgent', () => {
    it('creates a manual agent with correct fields', () => {
      const agent = createManualAgent(
        'TestAgent',
        'A test crypto trading agent',
        'twitter:@testagent',
        '7xK...abc',
      );

      expect(agent.name).toBe('TestAgent');
      expect(agent.description).toBe('A test crypto trading agent');
      expect(agent.source).toBe('manual');
      expect(agent.contactMethod).toBe('twitter:@testagent');
      expect(agent.walletAddress).toBe('7xK...abc');
      expect(agent.type).toBe('crypto-analyst'); // should classify based on description
      expect(agent.id).toContain('manual-testagent');
      expect(agent.discoveredAt).toBeTruthy();
    });
  });
});
