/**
 * Baozi Discord Market Bot
 * Slash commands + rich embeds for prediction market data
 *
 * Read-only — no wallet management, no transaction signing.
 * Links to baozi.bet for actual betting.
 */
import {
  Client,
  GatewayIntentBits,
  Events,
  ChatInputCommandInteraction,
  Collection,
  ActivityType,
} from 'discord.js';
import { commands } from './commands/index.js';
import { initScheduler } from './scheduler.js';

// Validate environment
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN environment variable is required');
  console.error('Set it in your .env file or environment');
  process.exit(1);
}

// Create client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Build command map
type CommandModule = {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};
const commandMap = new Collection<string, CommandModule>();
for (const cmd of commands) {
  commandMap.set(cmd.data.name, cmd);
}

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log('');
  console.log('═'.repeat(50));
  console.log(`🥟 Baozi Discord Market Bot`);
  console.log('═'.repeat(50));
  console.log(`Logged in as: ${readyClient.user.tag}`);
  console.log(`Servers: ${readyClient.guilds.cache.size}`);
  console.log(`Commands: ${commands.map(c => `/${c.data.name}`).join(', ')}`);
  console.log('═'.repeat(50));
  console.log('');

  // Set activity
  readyClient.user.setActivity('prediction markets', { type: ActivityType.Watching });

  // Initialize daily roundup scheduler
  const scheduler = initScheduler(client);
  scheduler.startAll();
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);

    const reply = {
      content: '❌ Something went wrong. Please try again later.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Login
client.login(token);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  client.destroy();
  process.exit(0);
});
