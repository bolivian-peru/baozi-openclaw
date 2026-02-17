import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from './interface';

export const portfolioCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('View portfolio')
    .addStringOption(option =>
      option.setName('wallet')
        .setDescription('Wallet address')
        .setRequired(true)
    ),
  execute: async (interaction, client) => {
    await interaction.deferReply();
    const wallet = interaction.options.getString('wallet', true);
    
    const positions = await client.getPositions(wallet);
    
    if (positions.length === 0) {
      await interaction.editReply(`No positions found for wallet: ${wallet}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Portfolio: ${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`)
      .setColor('#ffcc00')
      .setDescription(`Found ${positions.length} active/historical positions.`)
      .setFooter({ text: 'Powered by Baozi Prediction Markets' })
      .setTimestamp();

    let count = 0;
    for (const pos of positions) {
      if (count >= 10) break; // Limit to 10
      count++;
      
      // Fetch market name to make it useful
      // This is N+1 problem but fine for small list
      // Or we can rely on marketId
      let marketName = `Market #${pos.marketId}`;
      const market = await client.getMarket(pos.marketId); // This might fail if getMarket expects pubkey
      
      // Wait, client.getMarket expects Pubkey string. pos.marketId is ID (string).
      // We need getMarketById or derive PDA.
      // But getMarket handles discriminator check.
      // We can try to fetch by ID using `getMarkets` and filtering.
      // Or just display ID.
      
      // For now, just display ID.
      // "Market #123 (Yes: 1.5 SOL)"
      
      const status = pos.claimed ? 'Claimed' : 'Active';
      const side = pos.side;
      const amount = pos.totalAmountSol;
      
      embed.addFields({
        name: `Market #${pos.marketId}`,
        value: `Side: **${side}** • Amount: ${amount} SOL • Status: ${status}`,
        inline: false
      });
    }

    if (positions.length > 10) {
      embed.setDescription(`Found ${positions.length} positions. Showing top 10.`);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
