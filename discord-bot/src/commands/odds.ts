/**
 * /odds <marketId> — Detailed odds embed for a boolean market
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getMarket, getQuote } from '../mcp/client.js';
import { buildMarketEmbed, buildMarketButtons } from '../embeds/market.js';
import { errorEmbed } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('odds')
    .setDescription('Get detailed odds for a specific market')
    .addStringOption((opt) =>
        opt
            .setName('market_id')
            .setDescription('Market public key (Solana address)')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const marketId = interaction.options.getString('market_id', true).trim();

        const market = await getMarket(marketId);
        if (!market) {
            await interaction.editReply({
                embeds: [errorEmbed('Market Not Found', `No market found with ID \`${marketId}\`. Make sure you're using the full Solana public key.`)],
            });
            return;
        }

        const embed = buildMarketEmbed(market);

        // Try to get a quote to show expected payouts
        if (market.isBettingOpen && market.totalPoolSol > 0) {
            try {
                const quoteYes = await getQuote(marketId, 'Yes', 1.0);
                const quoteNo = await getQuote(marketId, 'No', 1.0);

                const payoutLines: string[] = [];
                if (quoteYes && typeof quoteYes === 'object' && 'expectedPayout' in quoteYes) {
                    payoutLines.push(`Yes → ${(quoteYes as any).expectedPayout.toFixed(2)} SOL`);
                }
                if (quoteNo && typeof quoteNo === 'object' && 'expectedPayout' in quoteNo) {
                    payoutLines.push(`No → ${(quoteNo as any).expectedPayout.toFixed(2)} SOL`);
                }

                if (payoutLines.length > 0) {
                    embed.addFields({
                        name: '💡 Expected Payout (1 SOL bet)',
                        value: payoutLines.join('\n'),
                        inline: false,
                    });
                }
            } catch {
                // Quote not available — that's fine
            }
        }

        const row = buildMarketButtons(marketId);
        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
        console.error('[/odds] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch market data. Please try again later.')],
        });
    }
}
