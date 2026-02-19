/**
 * /closing — Markets closing within 24h
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { listMarkets } from '../baozi/index.js';
import { buildMarketListEmbed } from '../embeds/market-embed.js';

export const data = new SlashCommandBuilder()
  .setName('closing')
  .setDescription('Markets closing within 24 hours — last chance to bet!');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const markets = await listMarkets('active');

    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;

    const closing = markets.filter(m => {
      const closeTime = new Date(m.closingTime).getTime();
      return closeTime > now && closeTime <= in24h;
    }).sort((a, b) =>
      new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime()
    );

    if (closing.length === 0) {
      await interaction.editReply('No markets closing in the next 24 hours.');
      return;
    }

    const embed = buildMarketListEmbed(
      closing,
      '⏰ Closing Soon',
      'Markets closing within 24 hours'
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in /closing:', error);
    await interaction.editReply('❌ Failed to fetch closing markets. Please try again.');
  }
}
