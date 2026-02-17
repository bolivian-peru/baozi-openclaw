/**
 * Register slash commands with Discord REST API
 * Run with: npm run register
 */
import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import all command data
import { data as marketsCmd } from './commands/markets.js';
import { data as oddsCmd } from './commands/odds.js';
import { data as portfolioCmd } from './commands/portfolio.js';
import { data as hotCmd } from './commands/hot.js';
import { data as closingCmd } from './commands/closing.js';
import { data as raceCmd } from './commands/race.js';
import { data as setupCmd } from './commands/setup.js';

const commands = [
    marketsCmd.toJSON(),
    oddsCmd.toJSON(),
    portfolioCmd.toJSON(),
    hotCmd.toJSON(),
    closingCmd.toJSON(),
    raceCmd.toJSON(),
    setupCmd.toJSON(),
];

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function register() {
    try {
        console.log(`Registering ${commands.length} slash commands...`);
        await rest.put(Routes.applicationCommands(CLIENT_ID!), { body: commands });
        console.log('✅ Slash commands registered globally!');
        console.log('Commands:');
        commands.forEach((cmd) => console.log(`  /${cmd.name} — ${cmd.description}`));
    } catch (err) {
        console.error('Failed to register commands:', err);
        process.exit(1);
    }
}

register();
