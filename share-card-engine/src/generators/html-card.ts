/**
 * HTML Share Card Generator
 * 
 * Generates rich HTML cards for Baozi prediction markets.
 * Cards include odds visualization, pool size, countdown, and CTAs.
 */
import type { MarketCardData, ShareCard, ShareCardConfig, CardGenerationOptions, CardEmbed } from '../types/index.js';
import { DEFAULT_CONFIG, DEFAULT_OPTIONS, buildMarketUrl, mergeConfig, mergeOptions } from '../utils/config.js';
import {
  formatSol,
  formatPercent,
  formatCountdown,
  truncateQuestion,
  htmlOddsBar,
  escapeHtml,
  formatStatus,
  formatLayer,
  oddsEmoji,
  asciiOddsBar,
} from '../utils/formatting.js';

/**
 * Generate a complete share card for a market
 */
export function generateShareCard(
  market: MarketCardData,
  options?: Partial<CardGenerationOptions>,
  config?: Partial<ShareCardConfig>
): ShareCard {
  const opts = mergeOptions(options);
  const cfg = mergeConfig(config);
  const marketUrl = buildMarketUrl(market.publicKey, cfg);

  const html = generateHtml(market, opts, cfg, marketUrl);
  const plainText = generatePlainText(market, opts, cfg, marketUrl);
  const metaTags = generateMetaTags(market, cfg, marketUrl);
  const embed = generateEmbed(market, cfg, marketUrl);

  return {
    html,
    plainText,
    platform: opts.platform,
    marketUrl,
    metaTags,
    embed,
    marketData: market,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate HTML card content
 */
function generateHtml(
  market: MarketCardData,
  opts: CardGenerationOptions,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  const { colors } = cfg;
  const yesEmoji = oddsEmoji(market.yesPercent);
  const noEmoji = oddsEmoji(market.noPercent);
  const ctaText = opts.ctaText || 'Place Your Bet →';

  switch (opts.style) {
    case 'minimal':
      return generateMinimalHtml(market, cfg, marketUrl);
    case 'compact':
      return generateCompactHtml(market, cfg, marketUrl);
    case 'detailed':
      return generateDetailedHtml(market, opts, cfg, marketUrl);
    default:
      break;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${generateMetaTags(market, cfg, marketUrl)}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;background:${colors.background};border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <!-- Header -->
    <div style="padding:20px 24px 12px;border-bottom:1px solid #1e293b;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="color:${colors.accent};font-weight:700;font-size:18px;">🥟 Baozi</span>
        <span style="color:#94a3b8;font-size:13px;">${formatLayer(market.layer)}</span>
      </div>
    </div>

    <!-- Question -->
    <div style="padding:16px 24px;">
      <h2 style="color:${colors.text};font-size:20px;line-height:1.4;font-weight:600;">
        ${escapeHtml(truncateQuestion(market.question, 120))}
      </h2>
    </div>

    <!-- Odds Bar -->
    <div style="padding:0 24px 16px;">
      ${htmlOddsBar(market.yesPercent, colors.yes, colors.no)}
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="color:${colors.yes};font-weight:700;font-size:24px;">${yesEmoji} YES ${formatPercent(market.yesPercent)}</span>
        <span style="color:${colors.no};font-weight:700;font-size:24px;">NO ${formatPercent(market.noPercent)} ${noEmoji}</span>
      </div>
    </div>

    <!-- Stats -->
    <div style="padding:12px 24px;display:flex;gap:16px;flex-wrap:wrap;">
      ${opts.showVolume ? `
      <div style="flex:1;min-width:120px;background:#1e293b;border-radius:8px;padding:12px;">
        <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;">Pool Size</div>
        <div style="color:${colors.text};font-size:18px;font-weight:700;">${formatSol(market.totalPoolSol)}</div>
      </div>` : ''}
      ${opts.showCountdown ? `
      <div style="flex:1;min-width:120px;background:#1e293b;border-radius:8px;padding:12px;">
        <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;">Time Left</div>
        <div style="color:${colors.text};font-size:18px;font-weight:700;">${formatCountdown(market.closingTime)}</div>
      </div>` : ''}
      <div style="flex:1;min-width:120px;background:#1e293b;border-radius:8px;padding:12px;">
        <div style="color:#94a3b8;font-size:12px;text-transform:uppercase;">Status</div>
        <div style="color:${colors.text};font-size:18px;font-weight:700;">${formatStatus(market.status)}</div>
      </div>
    </div>

    <!-- CTA -->
    <div style="padding:16px 24px 20px;">
      <a href="${marketUrl}" style="display:block;text-align:center;background:${colors.accent};color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
        ${escapeHtml(ctaText)}
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:12px 24px;border-top:1px solid #1e293b;text-align:center;">
      <span style="color:#64748b;font-size:12px;">${escapeHtml(cfg.footerText)}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate minimal HTML card
 */
function generateMinimalHtml(
  market: MarketCardData,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  return `<div style="max-width:400px;background:${cfg.colors.background};border-radius:12px;padding:16px;border:1px solid #334155;font-family:sans-serif;">
  <div style="color:${cfg.colors.accent};font-size:12px;font-weight:700;margin-bottom:8px;">🥟 BAOZI MARKET</div>
  <div style="color:${cfg.colors.text};font-size:16px;font-weight:600;margin-bottom:12px;">${escapeHtml(truncateQuestion(market.question, 80))}</div>
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <span style="color:${cfg.colors.yes};font-weight:700;">YES ${formatPercent(market.yesPercent)}</span>
    <span style="color:${cfg.colors.no};font-weight:700;">NO ${formatPercent(market.noPercent)}</span>
  </div>
  ${htmlOddsBar(market.yesPercent, cfg.colors.yes, cfg.colors.no)}
  <a href="${marketUrl}" style="display:block;text-align:center;margin-top:12px;color:${cfg.colors.accent};font-size:13px;text-decoration:none;">Bet now → baozi.bet</a>
</div>`;
}

/**
 * Generate compact HTML card
 */
function generateCompactHtml(
  market: MarketCardData,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  return `<div style="max-width:500px;background:${cfg.colors.background};border-radius:12px;padding:20px;border:1px solid #334155;font-family:sans-serif;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <span style="color:${cfg.colors.accent};font-weight:700;">🥟 Baozi</span>
    <span style="color:#64748b;font-size:12px;">Pool: ${formatSol(market.totalPoolSol)}</span>
  </div>
  <div style="color:${cfg.colors.text};font-size:18px;font-weight:600;margin-bottom:16px;">${escapeHtml(truncateQuestion(market.question, 100))}</div>
  ${htmlOddsBar(market.yesPercent, cfg.colors.yes, cfg.colors.no)}
  <div style="display:flex;justify-content:space-between;margin-top:8px;margin-bottom:16px;">
    <span style="color:${cfg.colors.yes};font-weight:700;font-size:20px;">YES ${formatPercent(market.yesPercent)}</span>
    <span style="color:${cfg.colors.no};font-weight:700;font-size:20px;">NO ${formatPercent(market.noPercent)}</span>
  </div>
  <a href="${marketUrl}" style="display:block;text-align:center;background:${cfg.colors.accent};color:#000;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;">Place Your Bet →</a>
</div>`;
}

/**
 * Generate detailed HTML card (includes breakdown)
 */
function generateDetailedHtml(
  market: MarketCardData,
  opts: CardGenerationOptions,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${generateMetaTags(market, cfg, marketUrl)}
</head>
<body style="margin:0;padding:20px;background:#0a0a0a;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:${cfg.colors.background};border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,${cfg.colors.accent}22,${cfg.colors.background});padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="color:${cfg.colors.accent};font-weight:700;font-size:20px;">🥟 Baozi Prediction</span>
        <span style="background:#1e293b;color:#94a3b8;padding:4px 10px;border-radius:12px;font-size:12px;">${formatLayer(market.layer)}</span>
      </div>
      <h2 style="color:${cfg.colors.text};font-size:22px;line-height:1.4;">${escapeHtml(market.question)}</h2>
    </div>

    <div style="padding:20px 24px;">
      ${htmlOddsBar(market.yesPercent, cfg.colors.yes, cfg.colors.no)}
      <div style="display:flex;justify-content:space-between;margin-top:10px;">
        <div>
          <div style="color:${cfg.colors.yes};font-weight:700;font-size:28px;">${formatPercent(market.yesPercent)}</div>
          <div style="color:#94a3b8;font-size:13px;">YES · ${formatSol(market.yesPoolSol)}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:${cfg.colors.no};font-weight:700;font-size:28px;">${formatPercent(market.noPercent)}</div>
          <div style="color:#94a3b8;font-size:13px;">NO · ${formatSol(market.noPoolSol)}</div>
        </div>
      </div>
    </div>

    <div style="padding:0 24px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Total Pool</div>
        <div style="color:${cfg.colors.text};font-size:16px;font-weight:700;">${formatSol(market.totalPoolSol)}</div>
      </div>
      <div style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Status</div>
        <div style="color:${cfg.colors.text};font-size:16px;font-weight:700;">${formatStatus(market.status)}</div>
      </div>
      <div style="background:#1e293b;border-radius:10px;padding:14px;text-align:center;">
        <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Closes</div>
        <div style="color:${cfg.colors.text};font-size:16px;font-weight:700;">${formatCountdown(market.closingTime)}</div>
      </div>
    </div>

    <div style="padding:0 24px 24px;">
      <a href="${marketUrl}" style="display:block;text-align:center;background:${cfg.colors.accent};color:#000;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:18px;">
        ${escapeHtml(opts.ctaText || 'Bet Now on Baozi →')}
      </a>
    </div>

    <div style="padding:12px 24px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#64748b;font-size:11px;">${escapeHtml(cfg.footerText)}</span>
      <span style="color:#64748b;font-size:11px;">Market #${market.marketId}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Open Graph / Twitter Card meta tags
 */
function generateMetaTags(
  market: MarketCardData,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  const title = truncateQuestion(market.question, 70);
  const description = `YES ${formatPercent(market.yesPercent)} · NO ${formatPercent(market.noPercent)} · Pool: ${formatSol(market.totalPoolSol)} · ${formatCountdown(market.closingTime)}`;

  return `
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${marketUrl}">
  <meta property="og:site_name" content="Baozi.bet">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:site" content="@baozibet">`;
}

/**
 * Generate plain text version of the card
 */
function generatePlainText(
  market: MarketCardData,
  opts: CardGenerationOptions,
  cfg: ShareCardConfig,
  marketUrl: string
): string {
  const bar = asciiOddsBar(market.yesPercent, 10);
  const lines: string[] = [
    `🥟 BAOZI PREDICTION MARKET`,
    ``,
    `❓ ${market.question}`,
    ``,
    `${bar}`,
    `✅ YES: ${formatPercent(market.yesPercent)}  ❌ NO: ${formatPercent(market.noPercent)}`,
  ];

  if (opts.showVolume) {
    lines.push(`💰 Pool: ${formatSol(market.totalPoolSol)}`);
  }
  if (opts.showCountdown) {
    lines.push(`⏰ ${formatCountdown(market.closingTime)}`);
  }

  lines.push(``, `🔗 ${marketUrl}`, ``, cfg.footerText);

  return lines.join('\n');
}

/**
 * Generate embed object for Discord/Telegram
 */
function generateEmbed(
  market: MarketCardData,
  cfg: ShareCardConfig,
  marketUrl: string
): CardEmbed {
  const yesBar = '█'.repeat(Math.round(market.yesPercent / 5));
  const noBar = '█'.repeat(Math.round(market.noPercent / 5));

  return {
    title: `🥟 ${truncateQuestion(market.question, 200)}`,
    description: `**Current Odds:**\n\`YES ${yesBar} ${formatPercent(market.yesPercent)}\`\n\`NO  ${noBar} ${formatPercent(market.noPercent)}\``,
    color: 0xf59e0b, // Baozi amber
    fields: [
      { name: '💰 Total Pool', value: formatSol(market.totalPoolSol), inline: true },
      { name: '⏰ Closes', value: formatCountdown(market.closingTime), inline: true },
      { name: '📊 Status', value: formatStatus(market.status), inline: true },
      { name: '🏷️ Layer', value: formatLayer(market.layer), inline: true },
      { name: 'YES Pool', value: formatSol(market.yesPoolSol), inline: true },
      { name: 'NO Pool', value: formatSol(market.noPoolSol), inline: true },
    ],
    footer: {
      text: cfg.footerText,
    },
    url: marketUrl,
  };
}
