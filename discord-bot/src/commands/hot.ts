/**
 * /hot — Highest volume (pool size) markets in last 24h
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listMarkets, listRaceMarkets } from '../mcp/client.js';
import { buildMarketListEmbed } from '../embeds/market.js';
import { buildRaceListEmbed } from '../embeds/race.js';
import { errorEmbed } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('hot')
    .setDescription('Show the hottest markets by volume');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        // Fetch all active boolean markets
        const boolMarkets = await listMarkets('Active');
        // Sort by total pool (proxy for volume) descending
        const hotBool = [...boolMarkets]
            .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
            .slice(0, 5);

        // Fetch all active race markets
        const raceMarkets = await listRaceMarkets('Active');
        const hotRace = [...raceMarkets]
            .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
            .slice(0, 3);

        const embeds = [];

        if (hotBool.length > 0) {
            const { embed } = buildMarketListEmbed(hotBool, '🔥 Hottest Markets by Pool Size');
            embeds.push(embed);
        }

        if (hotRace.length > 0) {
            embeds.push(buildRaceListEmbed(hotRace, '🏇 Hot Race Markets'));
        }

        if (embeds.length === 0) {
            embeds.push(errorEmbed('No Markets', 'No active markets at the moment.'));
        }

        await interaction.editReply({ embeds });
    } catch (err) {
        console.error('[/hot] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch market data. Please try again later.')],
        });
    }
}
