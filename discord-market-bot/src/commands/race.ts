/**
 * /race <market> — Race market with all outcome odds
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { getRaceMarket, listRaceMarkets } from '../baozi/index.js';
import { buildRaceEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('race')
  .setDescription('View a race (multi-outcome) market with all outcome odds')
  .addStringOption(option =>
    option
      .setName('market')
      .setDescription('Race market public key or search query')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const query = interaction.options.getString('market');

    if (!query) {
      // List all active race markets
      const raceMarkets = await listRaceMarkets('active');

      if (raceMarkets.length === 0) {
        await interaction.editReply('No active race markets right now.');
        return;
      }

      // Show the first (most interesting) race market
      const embed = buildRaceEmbed(raceMarkets[0]);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Try as public key
    let market = await getRaceMarket(query);

    // Search by question
    if (!market) {
      const allRace = await listRaceMarkets();
      const searchLower = query.toLowerCase();
      market = allRace.find(m =>
        m.question.toLowerCase().includes(searchLower)
      ) || null;
    }

    if (!market) {
      await interaction.editReply(`❌ No race market found for "${query}".`);
      return;
    }

    const embed = buildRaceEmbed(market);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /race:', error);
    await interaction.editReply('❌ Failed to fetch race market. Please try again.');
  }
}
