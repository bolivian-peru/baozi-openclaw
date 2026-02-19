/**
 * /portfolio <wallet> — View positions for a wallet
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { getPositionSummary } from '../baozi/index.js';
import { buildPortfolioEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('portfolio')
  .setDescription('View prediction market positions for a Solana wallet')
  .addStringOption(option =>
    option
      .setName('wallet')
      .setDescription('Solana wallet address')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const wallet = interaction.options.getString('wallet', true);

    // Basic validation
    if (wallet.length < 32 || wallet.length > 44) {
      await interaction.editReply('❌ Invalid Solana wallet address.');
      return;
    }

    const summary = await getPositionSummary(wallet);

    if (summary.totalPositions === 0) {
      await interaction.editReply(`No positions found for wallet \`${wallet.slice(0, 8)}...\``);
      return;
    }

    const embed = buildPortfolioEmbed(summary);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /portfolio:', error);
    await interaction.editReply('❌ Failed to fetch portfolio. Check the wallet address and try again.');
  }
}
