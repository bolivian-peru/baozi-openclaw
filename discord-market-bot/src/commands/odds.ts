/**
 * /odds <market_id> — Detailed odds embed for a specific market
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { getMarket, listMarkets } from '../baozi/index.js';
import { buildMarketEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('odds')
  .setDescription('View detailed odds for a prediction market')
  .addStringOption(option =>
    option
      .setName('market')
      .setDescription('Market public key or search query')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const query = interaction.options.getString('market', true);

    // Try as public key first
    let market = await getMarket(query);

    // If not a valid pubkey, try searching by question
    if (!market) {
      const allMarkets = await listMarkets();
      const searchLower = query.toLowerCase();
      market = allMarkets.find(m =>
        m.question.toLowerCase().includes(searchLower)
      ) || null;
    }

    if (!market) {
      await interaction.editReply(`❌ No market found for "${query}". Use \`/markets\` to browse.`);
      return;
    }

    const embed = buildMarketEmbed(market);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /odds:', error);
    await interaction.editReply('❌ Failed to fetch market odds. Please try again.');
  }
}
