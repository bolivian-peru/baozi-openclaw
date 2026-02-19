import {
  generatePitch,
  generateAllPitches,
  listPitchTypes,
  getPitchVariants,
} from '../src/outreach/templates';
import { AgentType } from '../src/types';

describe('Outreach Templates', () => {
  const affiliateCode = 'TEST_RECRUITER';

  describe('generatePitch', () => {
    const agentTypes: AgentType[] = [
      'crypto-analyst',
      'trading-bot',
      'social-agent',
      'general-purpose',
      'defi-agent',
      'research-agent',
      'unknown',
    ];

    it.each(agentTypes)('generates a pitch for %s', (type) => {
      const pitch = generatePitch(type, affiliateCode);

      expect(pitch.targetType).toBe(type);
      expect(pitch.subject).toBeTruthy();
      expect(pitch.body).toBeTruthy();
      expect(pitch.variant).toBeTruthy();
      expect(pitch.affiliateLink).toContain(affiliateCode);
      expect(pitch.affiliateLink).toContain('baozi.bet');
    });

    it('includes affiliate link in the body', () => {
      const pitch = generatePitch('trading-bot', affiliateCode);
      expect(pitch.body).toContain(`ref=${affiliateCode}`);
    });

    it('includes MCP install instructions in the body', () => {
      const pitch = generatePitch('general-purpose', affiliateCode);
      expect(pitch.body).toContain('npx @baozi.bet/mcp-server');
    });

    it('includes skill docs link', () => {
      const pitch = generatePitch('crypto-analyst', affiliateCode);
      expect(pitch.body).toContain('baozi.bet/skill');
    });

    it('selects a specific variant when requested', () => {
      const pitch = generatePitch('trading-bot', affiliateCode, 'add-prediction-markets');
      expect(pitch.variant).toBe('add-prediction-markets');
    });

    it('falls back to first variant when requested variant does not exist', () => {
      const pitch = generatePitch('trading-bot', affiliateCode, 'nonexistent-variant');
      expect(pitch).toBeTruthy();
      expect(pitch.body).toBeTruthy();
    });
  });

  describe('generateAllPitches', () => {
    it('generates pitches for all types and variants', () => {
      const pitches = generateAllPitches(affiliateCode);

      expect(pitches.length).toBeGreaterThanOrEqual(10);

      // Every pitch should have an affiliate link
      for (const pitch of pitches) {
        expect(pitch.affiliateLink).toContain(affiliateCode);
      }
    });

    it('includes at least 3 different agent types', () => {
      const pitches = generateAllPitches(affiliateCode);
      const types = new Set(pitches.map(p => p.targetType));
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('listPitchTypes', () => {
    it('returns all agent types with variant counts', () => {
      const types = listPitchTypes();

      expect(types.length).toBeGreaterThanOrEqual(5);

      for (const t of types) {
        expect(t.type).toBeTruthy();
        expect(t.variants).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('getPitchVariants', () => {
    it('returns variants for trading-bot', () => {
      const variants = getPitchVariants('trading-bot');
      expect(variants.length).toBeGreaterThanOrEqual(2);
      expect(variants).toContain('add-prediction-markets');
    });

    it('returns variants for unknown type', () => {
      const variants = getPitchVariants('unknown');
      expect(variants.length).toBeGreaterThanOrEqual(1);
    });
  });
});
