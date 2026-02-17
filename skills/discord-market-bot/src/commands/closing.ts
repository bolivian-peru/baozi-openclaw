import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from './interface';

export const closingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('closing')
    .setDescription('List markets closing soon'),
  execute: async (interaction, client) => {
    await interaction.deferReply();
    const markets = await client.getClosingMarkets(20); // Get up to 20 closing soon
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Filter strictly < 24h
    const closingSoon = markets.filter(m => m.closingTime > now && m.closingTime <= tomorrow);
    
    if (closingSoon.length === 0) {
      await interaction.editReply('No markets closing within 24 hours.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('⏳ Closing Soon')
      .setDescription('Markets closing within 24h')
      .setColor('#ff9900')
      .setFooter({ text: 'Baozi Prediction Markets' })
      .setTimestamp();

    // Show top 10
    for (const market of closingSoon.slice(0, 10)) {
      const timeLeft = Math.max(0, market.closingTime.getTime() - now.getTime());
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      embed.addFields({
        name: market.question,
        value: `Ends in: **${hours}h ${minutes}m** • Volume: ${market.totalPoolSol} SOL`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
