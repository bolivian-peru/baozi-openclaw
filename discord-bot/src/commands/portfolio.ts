/**
 * /portfolio <wallet> — View positions for a Solana wallet
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getPositions } from '../mcp/client.js';
import { buildPortfolioEmbed } from '../embeds/portfolio.js';
import { errorEmbed } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('View betting positions for a Solana wallet')
    .addStringOption((opt) =>
        opt
            .setName('wallet')
            .setDescription('Solana wallet address')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const wallet = interaction.options.getString('wallet', true).trim();

        // Basic validation
        if (wallet.length < 32 || wallet.length > 44) {
            await interaction.editReply({
                embeds: [errorEmbed('Invalid Wallet', 'Please provide a valid Solana wallet address (32-44 characters).')],
            });
            return;
        }

        const positions = await getPositions(wallet);
        if (!positions) {
            await interaction.editReply({
                embeds: [errorEmbed('No Data', `No positions found for wallet \`${wallet}\`. The wallet may have no Baozi bets.`)],
            });
            return;
        }

        const embed = buildPortfolioEmbed(positions);
        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.error('[/portfolio] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch portfolio data. Please try again later.')],
        });
    }
}
