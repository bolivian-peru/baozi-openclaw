/**
 * /markets [category] — List active markets
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { listMarkets } from '../baozi/index.js';
import { buildMarketListEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('markets')
  .setDescription('List active prediction markets on Baozi')
  .addStringOption(option =>
    option
      .setName('category')
      .setDescription('Filter by market layer')
      .setRequired(false)
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Official', value: 'official' },
        { name: 'Lab (Community)', value: 'lab' },
      )
  )
  .addStringOption(option =>
    option
      .setName('status')
      .setDescription('Filter by status')
      .setRequired(false)
      .addChoices(
        { name: 'Active', value: 'active' },
        { name: 'Closed', value: 'closed' },
        { name: 'Resolved', value: 'resolved' },
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const statusFilter = interaction.options.getString('status') || 'active';
    const categoryFilter = interaction.options.getString('category') || 'all';

    let markets = await listMarkets(statusFilter);

    // Filter by layer if specified
    if (categoryFilter !== 'all') {
      markets = markets.filter(m => m.layer.toLowerCase() === categoryFilter);
    }

    if (markets.length === 0) {
      await interaction.editReply('No markets found matching your criteria.');
      return;
    }

    const title = `📈 ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Markets` +
      (categoryFilter !== 'all' ? ` (${categoryFilter})` : '');

    const embed = buildMarketListEmbed(markets, title);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /markets:', error);
    await interaction.editReply('❌ Failed to fetch markets. Please try again later.');
  }
}
