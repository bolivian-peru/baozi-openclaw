import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from './interface';
import { Market, RaceMarket } from '../types';

function createProgressBar(percent: number, length = 10): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function isRaceMarket(market: Market | RaceMarket): market is RaceMarket {
  return (market as RaceMarket).outcomes !== undefined;
}

export const oddsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('odds')
    .setDescription('Show market odds')
    .addStringOption(option =>
      option.setName('market')
        .setDescription('Market ID or Public Key')
        .setRequired(true)
    ),
  execute: async (interaction, client) => {
    await interaction.deferReply();
    const marketIdOrKey = interaction.options.getString('market', true);
    
    // First try by key
    let market = await client.getMarket(marketIdOrKey);
    
    // If not found by key, try to find by ID (fetch all active/resolved and filter? inefficient)
    // Or just fetch market by deriving PDA from ID if it's numeric.
    // Client.getMarket handles PDA. But user might input ID "123".
    // I should add `getMarketById` to client or just try to derive PDA here.
    // But `deriveMarketPda` is internal or in `config`.
    // Let's stick to key for now, or fetch all and find.
    
    if (!market) {
      // Try to list all and find by ID.
      // This is slow but works for small number of markets.
      const allMarkets = await client.getMarkets();
      market = allMarkets.find(m => m.marketId === marketIdOrKey) || null;
    }

    if (!market) {
      await interaction.editReply(`Market not found: ${marketIdOrKey}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(market.question)
      .setDescription(`Market ID: ${market.marketId}\nStatus: ${market.status}\nPool: ${market.totalPoolSol} SOL`)
      .setColor('#00ff00')
      .setFooter({ text: 'Baozi Prediction Markets' })
      .setTimestamp();

    if (isRaceMarket(market)) {
      // Race Market
      let outcomesText = '';
      for (const outcome of market.outcomes) {
        const bar = createProgressBar(outcome.percent);
        outcomesText += `**${outcome.label}**: ${outcome.percent}% (${outcome.poolSol} SOL)\n\`${bar}\`\n\n`;
      }
      embed.addFields({ name: 'Outcomes', value: outcomesText });
    } else {
      // Boolean Market
      const yesBar = createProgressBar(market.yesPercent);
      const noBar = createProgressBar(market.noPercent);
      
      embed.addFields(
        { name: 'Yes', value: `${market.yesPercent}% (${market.yesPoolSol} SOL)\n\`${yesBar}\``, inline: true },
        { name: 'No', value: `${market.noPercent}% (${market.noPoolSol} SOL)\n\`${noBar}\``, inline: true }
      );
    }
    
    await interaction.editReply({ embeds: [embed] });
  },
};
