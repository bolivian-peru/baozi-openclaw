import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { AgentRecruiter } from '../src/recruiter.js';

describe('AgentRecruiter', () => {
  let tmpDir: string;
  let recruiter: AgentRecruiter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baozi-recruiter-test-'));
    recruiter = new AgentRecruiter({
      affiliateCode: 'TEST_CODE',
      dataDir: tmpDir,
      dryRun: true,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('initializes with correct config', () => {
    expect(recruiter.config.affiliateCode).toBe('TEST_CODE');
    expect(recruiter.config.dryRun).toBe(true);
  });

  it('generates affiliate link', () => {
    const link = recruiter.getAffiliateLink();
    expect(link).toBe('https://baozi.bet/?ref=TEST_CODE');
  });

  it('adds a manual agent', () => {
    const agent = recruiter.addAgent(
      'TestBot',
      'A test trading bot',
      'twitter:@testbot',
    );

    expect(agent.name).toBe('TestBot');
    expect(agent.status).toBe('discovered');
    expect(recruiter.getRecruitedAgents().length).toBe(1);
  });

  it('onboards an agent through the full flow', async () => {
    const agent = recruiter.addAgent(
      'OnboardBot',
      'Agent to onboard',
      'direct',
    );

    const result = await recruiter.onboard(agent);

    expect(result.status).toBe('active');
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.onboardedAt).toBeTruthy();
  });

  it('generates pitches for all types', () => {
    const pitches = recruiter.generateAllPitches();
    expect(pitches.length).toBeGreaterThan(5);

    for (const pitch of pitches) {
      expect(pitch.affiliateLink).toContain('TEST_CODE');
    }
  });

  it('generates onboarding package', () => {
    const agent = recruiter.addAgent('PkgBot', 'Test', 'direct');
    const pkg = recruiter.getOnboardingPackage(agent);

    expect(pkg.pitch).toBeTruthy();
    expect(pkg.setupInstructions).toContain('npx @baozi.bet/mcp-server');
    expect(pkg.onboardingSteps.length).toBe(5);
    expect(pkg.affiliateLink).toContain('TEST_CODE');
    expect(pkg.quickStartMessage).toContain('TEST_CODE');
  });

  it('shows dashboard', () => {
    recruiter.addAgent('DashAgent', 'Test', 'direct');
    const dashboard = recruiter.getDashboard();
    expect(dashboard).toContain('BAOZI AGENT RECRUITER DASHBOARD');
  });

  it('records bets and updates stats', async () => {
    const agent = recruiter.addAgent('BetAgent', 'Bettor', 'direct');
    await recruiter.onboard(agent);

    recruiter.recordBet(agent.id, 5.0, 'tx_abc');
    recruiter.recordBet(agent.id, 3.0, 'tx_def');

    const stats = recruiter.getStats();
    expect(stats.combinedVolume).toBeCloseTo(8.0);
    expect(stats.estimatedEarnings).toBeCloseTo(0.08);
  });

  it('exports data as JSON', () => {
    recruiter.addAgent('ExportBot', 'Test', 'direct');
    const exported = recruiter.exportData();
    const parsed = JSON.parse(exported);

    expect(parsed.stats).toBeTruthy();
    expect(parsed.agents).toHaveLength(1);
  });

  it('gets setup instructions', () => {
    const instructions = recruiter.getSetupInstructions();
    expect(instructions).toContain('npx @baozi.bet/mcp-server');
    expect(instructions).toContain('TEST_CODE');
    expect(instructions).toContain('list_markets');
    expect(instructions).toContain('build_bet_transaction');
  });
});
