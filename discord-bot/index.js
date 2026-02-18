const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Connection, PublicKey } = require('@solana/web3.js');
const cron = require('node-cron');
require('dotenv').config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

// Solana connection (Mainnet)
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Mock Baozi data source (replace with actual Baozi API/RPC calls)
class BaoziDataSource {
  constructor() {
    // Placeholder: In production, use actual Baozi MCP tools or program queries
    this.markets = this.generateMockMarkets();
  }

  generateMockMarkets() {
    return [
      {
        id: 'btc-120k-march',
        title: 'Will BTC hit $120K by March?',
        type: 'boolean',
        category: 'crypto',
        outcomes: [
          { name: 'Yes', probability: 0.632, pool: 9.6 },
          { name: 'No', probability: 0.368, pool: 5.6 }
        ],
        totalPool: 15.2,
        closesAt: '2026-02-28T00:00:00Z',
        status: 'active',
        volume24h: 3.2,
        createdAt: '2026-02-15T10:00:00Z'
      },
      {
        id: 'grammy-aoty',
        title: 'Who wins the Grammy AOTY?',
        type: 'race',
        category: 'entertainment',
        outcomes: [
          { name: 'Artist A', probability: 0.421, pool: 3.5 },
          { name: 'Artist B', probability: 0.315, pool: 2.6 },
          { name: 'Artist C', probability: 0.152, pool: 1.3 },
          { name: 'Artist D', probability: 0.112, pool: 1.0 }
        ],
        totalPool: 8.4,
        closesAt: '2026-01-31T00:00:00Z',
        status: 'active',
        volume24h: 1.8,
        createdAt: '2026-02-10T14:00:00Z'
      },
      {
        id: 'eth-merge-delay',
        title: 'Will Ethereum merge again in 2026?',
        type: 'boolean',
        category: 'crypto',
        outcomes: [
          { name: 'Yes', probability: 0.23, pool: 2.3 },
          { name: 'No', probability: 0.77, pool: 7.7 }
        ],
        totalPool: 10.0,
        closesAt: '2026-12-31T23:59:59Z',
        status: 'active',
        volume24h: 0.5,
        createdAt: '2026-02-17T09:00:00Z'
      },
      {
        id: 'super-bowl-2026',
        title: 'Who wins Super Bowl 2026?',
        type: 'race',
        category: 'sports',
        outcomes: [
          { name: 'Team A', probability: 0.35, pool: 7.0 },
          { name: 'Team B', probability: 0.28, pool: 5.6 },
          { name: 'Team C', probability: 0.22, pool: 4.4 },
          { name: 'Team D', probability: 0.15, pool: 3.0 }
        ],
        totalPool: 20.0,
        closesAt: '2026-02-14T00:00:00Z',
        status: 'active',
        volume24h: 5.2,
        createdAt: '2026-01-20T12:00:00Z'
      },
      {
        id: 'sol-200-march',
        title: 'Will SOL reach $200 by March?',
        type: 'boolean',
        category: 'crypto',
        outcomes: [
          { name: 'Yes', probability: 0.48, pool: 6.7 },
          { name: 'No', probability: 0.52, pool: 7.3 }
        ],
        totalPool: 14.0,
        closesAt: '2026-03-01T00:00:00Z',
        status: 'active',
        volume24h: 2.8,
        createdAt: '2026-02-16T08:00:00Z'
      }
    ];
  }

  listMarkets(category = null) {
    if (!category) return this.markets;
    return this.markets.filter(m => m.category === category);
  }

  getMarket(marketId) {
    return this.markets.find(m => m.id === marketId);
  }

  getHotMarkets(limit = 5) {
    return [...this.markets]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
  }

  getClosingSoon(hours = 24) {
    const now = new Date();
    const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return this.markets.filter(m => {
      const closeTime = new Date(m.closesAt);
      return closeTime <= threshold && closeTime > now;
    });
  }

  getPositions(wallet) {
    // Mock portfolio data
    return [
      { market: 'btc-120k-march', outcome: 'Yes', shares: 10, value: 6.32 },
      { market: 'sol-200-march', outcome: 'No', shares: 5, value: 2.6 }
    ];
  }
}

const baozi = new BaoziDataSource();

// Channel configuration storage
const channelConfigs = new Map();

// Helper: Create progress bar
function createProgressBar(percentage, length = 12) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Helper: Create boolean market embed
function createBooleanEmbed(market) {
  const yes = market.outcomes[0];
  const no = market.outcomes[1];
  
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${market.title}`)
    .setColor(0x0099ff)
    .addFields(
      {
        name: `${yes.name} ${createProgressBar(yes.probability * 100)} ${(yes.probability * 100).toFixed(1)}%`,
        value: '\u200b',
        inline: false
      },
      {
        name: `${no.name} ${createProgressBar(no.probability * 100)} ${(no.probability * 100).toFixed(1)}%`,
        value: '\u200b',
        inline: false
      },
      {
        name: 'Pool',
        value: `${market.totalPool.toFixed(1)} SOL`,
        inline: true
      },
      {
        name: 'Closes',
        value: new Date(market.closesAt).toLocaleDateString(),
        inline: true
      },
      {
        name: 'Status',
        value: market.status.charAt(0).toUpperCase() + market.status.slice(1),
        inline: true
      }
    )
    .setFooter({ text: `Market ID: ${market.id}` })
    .setURL('https://baozi.bet');
  
  return embed;
}

// Helper: Create race market embed
function createRaceEmbed(market) {
  const embed = new EmbedBuilder()
    .setTitle(`🏇 ${market.title}`)
    .setColor(0xff9900)
    .setDescription(market.outcomes.map(o => 
      `${o.name} ${createProgressBar(o.probability * 100)} ${(o.probability * 100).toFixed(1)}%`
    ).join('\n'))
    .addFields(
      {
        name: 'Pool',
        value: `${market.totalPool.toFixed(1)} SOL`,
        inline: true
      },
      {
        name: 'Outcomes',
        value: market.outcomes.length.toString(),
        inline: true
      },
      {
        name: 'Closes',
        value: new Date(market.closesAt).toLocaleDateString(),
        inline: true
      }
    )
    .setFooter({ text: `Market ID: ${market.id}` })
    .setURL('https://baozi.bet');
  
  return embed;
}

// Slash commands definition
const commands = [
  new SlashCommandBuilder()
    .setName('markets')
    .setDescription('List active prediction markets')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Filter by category (crypto, sports, entertainment)')
        .setRequired(false)
        .addChoices(
          { name: 'Crypto', value: 'crypto' },
          { name: 'Sports', value: 'sports' },
          { name: 'Entertainment', value: 'entertainment' }
        )),

  new SlashCommandBuilder()
    .setName('odds')
    .setDescription('Show detailed odds for a market')
    .addStringOption(option =>
      option.setName('market_id')
        .setDescription('Market ID')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('View positions for a wallet')
    .addStringOption(option =>
      option.setName('wallet')
        .setDescription('Solana wallet address')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('hot')
    .setDescription('Show highest volume markets in last 24h'),

  new SlashCommandBuilder()
    .setName('closing')
    .setDescription('Show markets closing within 24 hours'),

  new SlashCommandBuilder()
    .setName('race')
    .setDescription('Show race market with all outcome odds')
    .addStringOption(option =>
      option.setName('market_id')
        .setDescription('Race market ID')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure daily roundup channel (Admin only)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel for daily updates')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time in HH:MM format (UTC)')
        .setRequired(true))
];

// Command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'markets') {
      const category = interaction.options.getString('category');
      const markets = baozi.listMarkets(category);
      
      if (markets.length === 0) {
        await interaction.reply('No markets found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📈 Active Markets${category ? ` - ${category}` : ''}`)
        .setColor(0x00ff00)
        .setDescription(markets.slice(0, 10).map(m => 
          `**${m.title}**\nPool: ${m.totalPool.toFixed(1)} SOL | ID: \`${m.id}\``
        ).join('\n\n'))
        .setFooter({ text: `Showing ${Math.min(markets.length, 10)} of ${markets.length} markets` });

      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'odds') {
      const marketId = interaction.options.getString('market_id');
      const market = baozi.getMarket(marketId);

      if (!market) {
        await interaction.reply('Market not found. Use `/markets` to see available markets.');
        return;
      }

      const embed = market.type === 'boolean' 
        ? createBooleanEmbed(market)
        : createRaceEmbed(market);

      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'portfolio') {
      const wallet = interaction.options.getString('wallet');
      
      // Validate Solana address format
      try {
        new PublicKey(wallet);
      } catch {
        await interaction.reply('Invalid Solana wallet address.');
        return;
      }

      const positions = baozi.getPositions(wallet);

      if (positions.length === 0) {
        await interaction.reply(`No positions found for wallet: \`${wallet.slice(0, 8)}...${wallet.slice(-8)}\``);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('💼 Portfolio')
        .setColor(0x9900ff)
        .setDescription(`Wallet: \`${wallet.slice(0, 8)}...${wallet.slice(-8)}\``)
        .addFields(positions.map(p => ({
          name: `${p.market} - ${p.outcome}`,
          value: `${p.shares} shares | Value: ${p.value.toFixed(2)} SOL`,
          inline: false
        })))
        .setFooter({ text: `Total positions: ${positions.length}` });

      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'hot') {
      const hotMarkets = baozi.getHotMarkets(5);

      const embed = new EmbedBuilder()
        .setTitle('🔥 Hot Markets - Top Volume (24h)')
        .setColor(0xff0000)
        .setDescription(hotMarkets.map((m, i) => 
          `**${i + 1}. ${m.title}**\n📊 Volume: ${m.volume24h.toFixed(1)} SOL | Pool: ${m.totalPool.toFixed(1)} SOL`
        ).join('\n\n'));

      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'closing') {
      const closing = baozi.getClosingSoon(24);

      if (closing.length === 0) {
        await interaction.reply('No markets closing within 24 hours.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('⏰ Markets Closing Soon')
        .setColor(0xffff00)
        .setDescription(closing.map(m => {
          const hoursLeft = Math.round((new Date(m.closesAt) - new Date()) / (1000 * 60 * 60));
          return `**${m.title}**\n⏱️ Closes in ${hoursLeft}h | Pool: ${m.totalPool.toFixed(1)} SOL`;
        }).join('\n\n'));

      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'race') {
      const marketId = interaction.options.getString('market_id');
      const market = baozi.getMarket(marketId);

      if (!market) {
        await interaction.reply('Market not found.');
        return;
      }

      if (market.type !== 'race') {
        await interaction.reply('This market is not a race market. Use `/odds` instead.');
        return;
      }

      const embed = createRaceEmbed(market);
      await interaction.reply({ embeds: [embed] });

    } else if (commandName === 'setup') {
      if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
        return;
      }

      const channel = interaction.options.getChannel('channel');
      const time = interaction.options.getString('time');

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        await interaction.reply({ content: 'Invalid time format. Use HH:MM (e.g., 09:00)', ephemeral: true });
        return;
      }

      channelConfigs.set(interaction.guildId, { channelId: channel.id, time });

      await interaction.reply(`✅ Daily roundup configured for ${channel} at ${time} UTC`);
    }

  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

// Daily roundup function
async function sendDailyRoundup() {
  for (const [guildId, config] of channelConfigs) {
    try {
      const channel = await client.channels.fetch(config.channelId);
      if (!channel) continue;

      const hotMarkets = baozi.getHotMarkets(5);
      const newMarkets = baozi.markets.filter(m => {
        const createdAt = new Date(m.createdAt);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt >= yesterday;
      });

      const embed = new EmbedBuilder()
        .setTitle('📰 Daily Market Roundup')
        .setColor(0x00aaff)
        .setTimestamp()
        .addFields(
          {
            name: '🔥 Top 5 by Volume',
            value: hotMarkets.map((m, i) => `${i + 1}. ${m.title} (${m.volume24h.toFixed(1)} SOL)`).join('\n') || 'None',
            inline: false
          },
          {
            name: '🆕 New Markets Today',
            value: newMarkets.length > 0 
              ? newMarkets.slice(0, 5).map(m => `• ${m.title}`).join('\n')
              : 'No new markets',
            inline: false
          }
        )
        .setFooter({ text: 'View all markets with /markets | baozi.bet' });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Roundup error for guild ${guildId}:`, error);
    }
  }
}

// Schedule daily roundups
cron.schedule('0 9 * * *', sendDailyRoundup); // Default 09:00 UTC

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN not found in environment');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
