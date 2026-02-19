/**
 * /hot — Highest volume markets in last 24h
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { listMarkets } from '../baozi/index.js';
import { buildMarketListEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('hot')
  .setDescription('Show highest volume markets — the hottest action on Baozi');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const markets = await listMarkets('active');

    // Sort by total pool (volume proxy)
    const sorted = markets
      .filter(m => m.totalPoolSol > 0)
      .sort((a, b) => b.totalPoolSol - a.totalPoolSol);

    if (sorted.length === 0) {
      await interaction.editReply('No active markets with volume right now.');
      return;
    }

    const embed = buildMarketListEmbed(
      sorted.slice(0, 10),
      '🔥 Hottest Markets',
      'Ranked by pool size (total volume)'
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /hot:', error);
    await interaction.editReply('❌ Failed to fetch hot markets. Please try again.');
  }
}
