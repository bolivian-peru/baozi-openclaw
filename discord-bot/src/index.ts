/**
 * Baozi Discord Market Bot
 * Main entry point — Discord.js client setup, event handlers, slash routing.
 */
import {
    Client,
    GatewayIntentBits,
    Events,
    ChatInputCommandInteraction,
    Collection,
} from 'discord.js';
import * as dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { disconnect } from './mcp/client.js';
import { startScheduler, reloadScheduler } from './roundup/scheduler.js';

// ─── Load .env ──────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Import Commands ─────────────────────────────────────────────────────────

import * as marketsCmd from './commands/markets.js';
import * as oddsCmd from './commands/odds.js';
import * as portfolioCmd from './commands/portfolio.js';
import * as hotCmd from './commands/hot.js';
import * as closingCmd from './commands/closing.js';
import * as raceCmd from './commands/race.js';
import * as setupCmd from './commands/setup.js';

// ─── Command Registry ───────────────────────────────────────────────────────

interface Command {
    data: { name: string };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
const allCommands: Command[] = [
    marketsCmd,
    oddsCmd,
    portfolioCmd,
    hotCmd,
    closingCmd,
    raceCmd,
    setupCmd,
];

for (const cmd of allCommands) {
    commands.set(cmd.data.name, cmd);
}

// ─── Discord Client ─────────────────────────────────────────────────────────

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// ─── Event: Ready ────────────────────────────────────────────────────────────

client.once(Events.ClientReady, (readyClient) => {
    console.log('');
    console.log('='.repeat(60));
    console.log(`  🥟 Baozi Discord Market Bot`);
    console.log(`  Logged in as ${readyClient.user.tag}`);
    console.log(`  Serving ${readyClient.guilds.cache.size} server(s)`);
    console.log('='.repeat(60));
    console.log('');

    // Start daily roundup scheduler
    startScheduler(client);
});

// ─── Event: Interaction ──────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
        console.warn(`[Bot] Unknown command: /${interaction.commandName}`);
        return;
    }

    try {
        console.log(
            `[Bot] /${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`
        );
        await command.execute(interaction);

        // If setup was used, reload the scheduler
        if (interaction.commandName === 'setup') {
            reloadScheduler(client);
        }
    } catch (err) {
        console.error(`[Bot] Error in /${interaction.commandName}:`, err);

        const errorMsg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMsg).catch(() => { });
        } else {
            await interaction.reply(errorMsg).catch(() => { });
        }
    }
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown() {
    console.log('\n[Bot] Shutting down...');
    await disconnect();
    client.destroy();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Start ───────────────────────────────────────────────────────────────────

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('Missing DISCORD_TOKEN in .env file');
    console.error('Copy .env.example to .env and fill in your credentials.');
    process.exit(1);
}

client.login(TOKEN);
