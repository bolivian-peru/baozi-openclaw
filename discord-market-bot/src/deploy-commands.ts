/**
 * Deploy slash commands to Discord
 * Run once: npm run deploy-commands
 */
import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables');
  process.exit(1);
}

const rest = new REST().setToken(token);

const commandData = commands.map(c => c.data.toJSON());

(async () => {
  try {
    console.log(`Deploying ${commandData.length} slash commands...`);

    // Register globally (takes up to 1 hour to propagate)
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandData },
    );

    console.log('✅ Successfully deployed slash commands globally!');
    console.log('Commands:', commandData.map(c => `/${c.name}`).join(', '));
    console.log('\nNote: Global commands may take up to 1 hour to appear in all servers.');

    // If DISCORD_GUILD_ID is set, also register instantly for that guild (dev mode)
    const guildId = process.env.DISCORD_GUILD_ID;
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandData },
      );
      console.log(`✅ Also deployed to guild ${guildId} (instant).`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
})();
