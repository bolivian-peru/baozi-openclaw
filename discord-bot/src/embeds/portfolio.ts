/**
 * Portfolio Embed Builder
 * Displays wallet positions with P&L summary.
 */
import { EmbedBuilder } from 'discord.js';
import type { PositionsSummary, Position } from '../mcp/client.js';
import {
    formatSol,
    truncate,
    shortKey,
    statusEmoji,
    marketUrl,
    baoziFooter,
    EMBED_COLORS,
} from './helpers.js';

/**
 * Build a portfolio embed showing all positions for a wallet
 */
export function buildPortfolioEmbed(data: PositionsSummary): EmbedBuilder {
    const lines: string[] = [];

    if (data.positions.length === 0) {
        lines.push('_No positions found for this wallet._');
    } else {
        const toShow = data.positions.slice(0, 10);
        for (const pos of toShow) {
            const emoji = pos.claimed ? '💸' : statusEmoji(pos.status);
            lines.push(
                [
                    `${emoji} **${truncate(pos.marketQuestion || `Market ${shortKey(pos.publicKey)}`, 50)}**`,
                    `Side: **${pos.side}** | Bet: ${formatSol(pos.totalAmountSol)}${pos.claimed ? ' | **Claimed**' : ''}`,
                ].join('\n')
            );
        }

        if (data.positions.length > 10) {
            lines.push(`\n_…and ${data.positions.length - 10} more positions_`);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.INFO)
        .setTitle(`👛 Portfolio: ${shortKey(data.wallet)}`)
        .setDescription(lines.join('\n\n'))
        .addFields(
            { name: '📊 Total Positions', value: `${data.totalPositions}`, inline: true },
            { name: '🟢 Active', value: `${data.activePositions}`, inline: true },
            { name: '💰 Total Bet', value: formatSol(data.totalBetSol), inline: true }
        )
        .setFooter(baoziFooter())
        .setTimestamp();

    return embed;
}
