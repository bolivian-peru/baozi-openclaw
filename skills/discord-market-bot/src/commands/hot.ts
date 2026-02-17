import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from './interface';

export const hotCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('hot')
    .setDescription('List hot markets by volume'),
  execute: async (interaction, client) => {
    await interaction.deferReply();
    const markets = await client.getHotMarkets();
    
    if (markets.length === 0) {
      await interaction.editReply('No active markets found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔥 Hot Markets')
      .setDescription('Top 5 active markets by volume')
      .setColor('#ff4500')
      .setFooter({ text: 'Baozi Prediction Markets' })
      .setTimestamp();

    for (const market of markets) {
      const volume = market.totalPoolSol;
      const closing = market.closingTime.toLocaleDateString();
      embed.addFields({
        name: `${market.question}`,
        value: `Volume: **${volume} SOL** • Ends: ${closing}`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
