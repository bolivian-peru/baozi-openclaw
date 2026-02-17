/**
 * Market Embed Builders
 * Rich embeds for boolean (YES/NO) markets.
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { BooleanMarket } from '../mcp/client.js';
import {
    progressBar,
    formatSol,
    formatDate,
    formatTime,
    truncate,
    marketUrl,
    statusEmoji,
    layerLabel,
    baoziFooter,
    EMBED_COLORS,
} from './helpers.js';

/**
 * Build a detailed embed for a single boolean market
 */
export function buildMarketEmbed(market: BooleanMarket): EmbedBuilder {
    const yesBar = progressBar(market.yesPercent);
    const noBar = progressBar(market.noPercent);

    const embed = new EmbedBuilder()
        .setColor(market.status === 'Active' ? EMBED_COLORS.PRIMARY : EMBED_COLORS.WARNING)
        .setTitle(`📊 ${truncate(market.question, 200)}`)
        .setURL(marketUrl(market.publicKey))
        .setDescription(
            [
                `**Yes**  ${yesBar}  ${market.yesPercent.toFixed(1)}%`,
                `**No**   ${noBar}  ${market.noPercent.toFixed(1)}%`,
                '',
                `💰 **Pool:** ${formatSol(market.totalPoolSol)}`,
                `📅 **Closes:** ${formatDate(market.closingTime)}`,
                `${layerLabel(market.layer)} | ${statusEmoji(market.status)} ${market.status}`,
            ].join('\n')
        )
        .setFooter(baoziFooter())
        .setTimestamp();

    if (market.winningOutcome) {
        embed.addFields({ name: '🏆 Result', value: market.winningOutcome, inline: true });
    }

    return embed;
}

/**
 * Build an embed for a list of markets (paginated style)
 */
export function buildMarketListEmbed(
    markets: BooleanMarket[],
    title: string,
    page: number = 0,
    pageSize: number = 5
): { embed: EmbedBuilder; totalPages: number } {
    const totalPages = Math.max(1, Math.ceil(markets.length / pageSize));
    const start = page * pageSize;
    const pageMarkets = markets.slice(start, start + pageSize);

    const lines: string[] = [];
    for (const m of pageMarkets) {
        const yesBar = progressBar(m.yesPercent);
        const timeLeft = formatTime(m.closingTime);
        lines.push(
            [
                `**${truncate(m.question, 60)}**`,
                `Yes ${yesBar} ${m.yesPercent.toFixed(1)}% | Pool: ${formatSol(m.totalPoolSol)} | ⏰ ${timeLeft}`,
                `[View](${marketUrl(m.publicKey)}) • ID: \`${m.publicKey.slice(0, 8)}…\``,
                '',
            ].join('\n')
        );
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle(title)
        .setDescription(
            lines.length > 0
                ? lines.join('\n')
                : '_No markets found._'
        )
        .setFooter({
            text: `${baoziFooter().text} • Page ${page + 1}/${totalPages} • ${markets.length} markets`,
        })
        .setTimestamp();

    return { embed, totalPages };
}

/**
 * Build action row with View on Baozi button
 */
export function buildMarketButtons(publicKey: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel('View on Baozi')
            .setStyle(ButtonStyle.Link)
            .setURL(marketUrl(publicKey))
            .setEmoji('🔗')
    );
}
