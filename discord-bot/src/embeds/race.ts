/**
 * Race Market Embed Builder
 * Multi-outcome display with all odds.
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { RaceMarket } from '../mcp/client.js';
import {
    progressBar,
    formatSol,
    formatDate,
    truncate,
    marketUrl,
    statusEmoji,
    layerLabel,
    baoziFooter,
    safeDescription,
    EMBED_COLORS,
} from './helpers.js';

/**
 * Build a detailed embed for a race (multi-outcome) market
 */
export function buildRaceEmbed(race: RaceMarket): EmbedBuilder {
    const outcomeLines: string[] = [];

    // Sort outcomes by percent descending for ranking
    const sorted = [...race.outcomes].sort((a, b) => b.percent - a.percent);

    for (const outcome of sorted) {
        const bar = progressBar(outcome.percent);
        outcomeLines.push(`**${outcome.label}**  ${bar}  ${outcome.percent.toFixed(1)}%`);
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.RACE)
        .setTitle(`🏇 ${truncate(race.question, 200)}`)
        .setURL(marketUrl(race.publicKey))
        .setDescription(
            [
                ...outcomeLines,
                '',
                `💰 **Pool:** ${formatSol(race.totalPoolSol)} | **${race.outcomes.length} outcomes**`,
                `📅 **Closes:** ${formatDate(race.closingTime)}`,
                `${layerLabel(race.layer)} | ${statusEmoji(race.status)} ${race.status}`,
            ].join('\n')
        )
        .setFooter(baoziFooter())
        .setTimestamp();

    return embed;
}

/**
 * Build a list embed for multiple race markets
 */
export function buildRaceListEmbed(
    markets: RaceMarket[],
    title: string
): EmbedBuilder {
    const lines: string[] = [];
    const toShow = markets.slice(0, 5);

    for (const m of toShow) {
        const topOutcome = [...m.outcomes].sort((a, b) => b.percent - a.percent)[0];
        lines.push(
            [
                `**${truncate(m.question, 60)}**`,
                `🥇 ${topOutcome?.label || '?'} (${topOutcome?.percent.toFixed(1) || '?'}%) | Pool: ${formatSol(m.totalPoolSol)} | ${m.outcomes.length} outcomes`,
                `[View](${marketUrl(m.publicKey)})`,
                '',
            ].join('\n')
        );
    }

    return new EmbedBuilder()
        .setColor(EMBED_COLORS.RACE)
        .setTitle(title)
        .setDescription(lines.length > 0 ? safeDescription(lines.join('\n')) : '_No race markets found._')
        .setFooter(baoziFooter())
        .setTimestamp();
}
