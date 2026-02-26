/**
 * Affiliate Manager
 *
 * Handles affiliate code registration and link generation via
 * @baozi.bet/mcp-server MCP tools.
 */

// Dynamic import to avoid module load errors in environments without the package
async function getMcpHandle(): Promise<((name: string, params: Record<string, unknown>) => Promise<unknown>) | null> {
  try {
    const mod = await import('@baozi.bet/mcp-server/dist/tools.js' as any) as any;
    return mod.handleTool ?? null;
  } catch {
    return null;
  }
}

export class AffiliateManager {
  private handleTool: ((name: string, params: Record<string, unknown>) => Promise<unknown>) | null = null;

  constructor(
    private readonly affiliateCode: string,
    private readonly walletAddress: string,
  ) {}

  async init(): Promise<void> {
    this.handleTool = await getMcpHandle();
  }

  /** Check whether this affiliate code is already registered on-chain. */
  async checkCode(): Promise<{ exists: boolean }> {
    if (!this.handleTool) return { exists: false };
    try {
      const result = await this.handleTool('check_affiliate_code', { code: this.affiliateCode }) as any;
      return { exists: result?.data?.exists ?? result?.exists ?? false };
    } catch {
      return { exists: false };
    }
  }

  /** Build the unsigned Solana transaction to register the affiliate code. */
  async buildRegistrationTx(): Promise<string | null> {
    if (!this.handleTool) return null;
    try {
      const result = await this.handleTool('build_register_affiliate_transaction', {
        wallet_address: this.walletAddress,
        affiliate_code: this.affiliateCode,
      }) as any;
      return result?.data?.transaction ?? result?.transaction ?? null;
    } catch (err: any) {
      console.error('Failed to build affiliate registration tx:', err.message);
      return null;
    }
  }

  /** Format a market-specific affiliate referral link. */
  formatMarketLink(marketPda: string): string {
    return `https://baozi.bet/market/${marketPda}?ref=${this.affiliateCode}`;
  }

  /** Format the general onboarding affiliate link. */
  formatOnboardingLink(): string {
    return `https://baozi.bet?ref=${this.affiliateCode}`;
  }

  getCode(): string { return this.affiliateCode; }
}
