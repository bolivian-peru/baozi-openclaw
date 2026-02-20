/**
 * Email notifier — sends alert emails via SMTP (nodemailer)
 */

import { BaseNotifier } from './base.js';
import { Alert, EmailChannelConfig } from '../../types/index.js';

export class EmailNotifier extends BaseNotifier {
  name = 'email';
  private config: EmailChannelConfig;
  private transporter: ReturnType<typeof createMockTransporter> | null = null;

  constructor(config: EmailChannelConfig) {
    super();
    this.config = config;
  }

  private async getTransporter() {
    if (!this.transporter) {
      try {
        const nodemailer = await import('nodemailer');
        this.transporter = nodemailer.createTransport(this.config.smtp);
      } catch {
        throw new Error('nodemailer not available — install it with: npm install nodemailer');
      }
    }
    return this.transporter;
  }

  async send(alert: Alert): Promise<boolean> {
    try {
      const transport = await this.getTransporter();
      const { subject, html } = this.formatEmail(alert);

      await transport.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
      });

      return true;
    } catch (err) {
      console.error(`[email] Failed to send alert: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Override batch to send digest email
   */
  async sendBatch(alerts: Alert[]): Promise<{ sent: number; failed: number }> {
    if (alerts.length === 0) return { sent: 0, failed: 0 };

    // Single alert — send individually
    if (alerts.length === 1) {
      const ok = await this.send(alerts[0]);
      return ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 };
    }

    // Multiple alerts — send digest
    try {
      const transport = await this.getTransporter();

      const subject = `🔔 Baozi Alert Digest — ${alerts.length} notifications`;
      const html = this.formatDigestHtml(alerts);

      await transport.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
      });

      return { sent: alerts.length, failed: 0 };
    } catch {
      return { sent: 0, failed: alerts.length };
    }
  }

  /**
   * Format a single alert as email
   */
  formatEmail(alert: Alert): { subject: string; html: string } {
    const subject = this.getSubject(alert);
    const html = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
  .card { background: white; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .type { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  h2 { margin: 8px 0 16px; color: #1a1a1a; }
  .message { font-size: 16px; line-height: 1.5; color: #333; }
  .cta { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
  .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
</style></head>
<body>
  <div class="card">
    <div class="type">${this.getTypeLabel(alert.type)}</div>
    <h2>${esc(this.getTitle(alert))}</h2>
    <div class="message">${esc(alert.message)}</div>
    <a href="https://baozi.bet/my-bets" class="cta">View on Baozi</a>
  </div>
  <div class="footer">Baozi Claim & Alert Agent • ${new Date(alert.timestamp).toLocaleString()}</div>
</body>
</html>`;

    return { subject, html };
  }

  private formatDigestHtml(alerts: Alert[]): string {
    const items = alerts.map(a => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">${this.getEmoji(a.type)}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;"><strong>${esc(this.getTitle(a))}</strong><br><span style="color:#666">${esc(a.message)}</span></td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
  .card { background: white; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  table { width: 100%; border-collapse: collapse; }
  .cta { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
  .footer { margin-top: 24px; font-size: 12px; color: #999; text-align: center; }
</style></head>
<body>
  <div class="card">
    <h2>🔔 ${alerts.length} Baozi Alerts</h2>
    <table>${items}</table>
    <a href="https://baozi.bet/my-bets" class="cta">View on Baozi</a>
  </div>
  <div class="footer">Baozi Claim & Alert Agent • ${new Date().toLocaleString()}</div>
</body>
</html>`;
  }

  private getSubject(alert: Alert): string {
    switch (alert.type) {
      case 'market_resolved': return `🏁 Market Resolved — ${(alert as any).marketQuestion}`;
      case 'unclaimed_winnings': return `💰 ${(alert as any).totalAmount.toFixed(2)} SOL unclaimed on Baozi`;
      case 'closing_soon': return `⏰ Market closing soon — ${(alert as any).marketQuestion}`;
      case 'odds_shift': return `📈 Odds shifted on ${(alert as any).marketQuestion}`;
      case 'new_market': return `🆕 New market: ${(alert as any).marketQuestion}`;
    }
  }

  private getTitle(alert: Alert): string {
    switch (alert.type) {
      case 'market_resolved': return 'Market Resolved';
      case 'unclaimed_winnings': return 'Unclaimed Winnings';
      case 'closing_soon': return 'Market Closing Soon';
      case 'odds_shift': return 'Odds Shifted';
      case 'new_market': return 'New Market';
    }
  }

  private getTypeLabel(type: string): string {
    return type.replace(/_/g, ' ');
  }

  private getEmoji(type: string): string {
    const map: Record<string, string> = {
      market_resolved: '🏁',
      unclaimed_winnings: '💰',
      closing_soon: '⏰',
      odds_shift: '📈',
      new_market: '🆕',
    };
    return map[type] || '🔔';
  }
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Type helper for mock transport
function createMockTransporter() {
  return { sendMail: async (_opts: any) => ({}) };
}
