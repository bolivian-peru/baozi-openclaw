/**
 * /race <marketId> — Race market with all outcome odds
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getRaceMarket } from '../mcp/client.js';
import { buildRaceEmbed } from '../embeds/race.js';
import { errorEmbed, marketUrl } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('race')
    .setDescription('Get detailed odds for a race (multi-outcome) market')
    .addStringOption((opt) =>
        opt
            .setName('market_id')
            .setDescription('Race market public key (Solana address)')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const marketId = interaction.options.getString('market_id', true).trim();

        const race = await getRaceMarket(marketId);
        if (!race) {
            await interaction.editReply({
                embeds: [errorEmbed('Race Market Not Found', `No race market found with ID \`${marketId}\`. Make sure you're using the full Solana public key.`)],
            });
            return;
        }

        const embed = buildRaceEmbed(race);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('View on Baozi')
                .setStyle(ButtonStyle.Link)
                .setURL(marketUrl(marketId))
                .setEmoji('🔗')
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
        console.error('[/race] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch race market data. Please try again later.')],
        });
    }
}
