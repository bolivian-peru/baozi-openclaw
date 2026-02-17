/**
 * /markets [category] — List active markets with optional keyword filter
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listMarkets, listRaceMarkets } from '../mcp/client.js';
import { buildMarketListEmbed } from '../embeds/market.js';
import { buildRaceListEmbed } from '../embeds/race.js';
import { errorEmbed } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('markets')
    .setDescription('Browse active Baozi prediction markets')
    .addStringOption((opt) =>
        opt
            .setName('category')
            .setDescription('Filter by keyword (e.g., crypto, sports, politics)')
            .setRequired(false)
    )
    .addStringOption((opt) =>
        opt
            .setName('layer')
            .setDescription('Filter by market layer')
            .setRequired(false)
            .addChoices(
                { name: 'Official', value: 'Official' },
                { name: 'Lab', value: 'Lab' },
                { name: 'All', value: 'all' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const category = interaction.options.getString('category')?.toLowerCase();
        const layer = interaction.options.getString('layer');

        // Fetch boolean markets
        let boolMarkets = await listMarkets('Active', layer && layer !== 'all' ? layer : undefined);

        // Filter by category keyword if provided
        if (category) {
            boolMarkets = boolMarkets.filter((m) =>
                m.question.toLowerCase().includes(category)
            );
        }

        // Fetch race markets
        let raceMarkets = await listRaceMarkets('Active');
        if (category) {
            raceMarkets = raceMarkets.filter((m) =>
                m.question.toLowerCase().includes(category)
            );
        }

        const title = category
            ? `📊 Active Markets — "${category}"`
            : '📊 Active Prediction Markets';

        const embeds = [];

        if (boolMarkets.length > 0) {
            const { embed } = buildMarketListEmbed(boolMarkets, title);
            embeds.push(embed);
        }

        if (raceMarkets.length > 0) {
            embeds.push(buildRaceListEmbed(raceMarkets, '🏇 Active Race Markets'));
        }

        if (embeds.length === 0) {
            embeds.push(
                errorEmbed('No Markets Found', category
                    ? `No active markets matching "${category}". Try \`/markets\` without a filter.`
                    : 'No active markets at the moment. Check back later!')
            );
        }

        await interaction.editReply({ embeds });
    } catch (err) {
        console.error('[/markets] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch markets. Please try again later.')],
        });
    }
}
