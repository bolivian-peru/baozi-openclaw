/**
 * Daily Roundup Scheduler
 * Cron-based auto-posting of market summaries to configured channels.
 */
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMarkets, listRaceMarkets } from '../mcp/client.js';
import {
    progressBar,
    formatSol,
    formatDate,
    formatTime,
    truncate,
    marketUrl,
    baoziFooter,
    EMBED_COLORS,
} from '../embeds/helpers.js';

// ─── Guild Config Persistence ────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'guild-config.json');

export interface GuildRoundupConfig {
    channelId: string;
    hour: number;
    minute: number;
    enabled: boolean;
}

export type GuildConfigMap = Record<string, GuildRoundupConfig>;

export function loadGuildConfig(): GuildConfigMap {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(raw) as GuildConfigMap;
        }
    } catch (err) {
        console.error('[Roundup] Error reading config:', err);
    }
    return {};
}

export function saveGuildConfig(config: GuildConfigMap): void {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('[Roundup] Error saving config:', err);
    }
}

// ─── Roundup Builder ─────────────────────────────────────────────────────────

async function buildRoundupEmbeds(): Promise<EmbedBuilder[]> {
    const embeds: EmbedBuilder[] = [];

    // Fetch all markets
    const [boolMarkets, raceMarkets] = await Promise.all([
        listMarkets('Active'),
        listRaceMarkets('Active'),
    ]);

    // ── Top 5 by pool size ──
    const topByPool = [...boolMarkets]
        .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
        .slice(0, 5);

    if (topByPool.length > 0) {
        const lines = topByPool.map((m, i) => {
            const bar = progressBar(m.yesPercent);
            return `**${i + 1}.** ${truncate(m.question, 55)}\nYes ${bar} ${m.yesPercent.toFixed(1)}% | Pool: ${formatSol(m.totalPoolSol)}\n[View](${marketUrl(m.publicKey)})`;
        });

        embeds.push(
            new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('📊 Daily Roundup — Top Markets by Pool')
                .setDescription(lines.join('\n\n'))
                .setFooter(baoziFooter())
                .setTimestamp()
        );
    }

    // ── Closing soon (within 24h) ──
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const closingSoon = [...boolMarkets]
        .filter((m) => {
            const closeTime = new Date(m.closingTime).getTime();
            return closeTime > now && closeTime <= now + 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime())
        .slice(0, 5);

    if (closingSoon.length > 0) {
        const lines = closingSoon.map((m) => {
            return `⏰ **${truncate(m.question, 55)}**\nCloses: ${formatDate(m.closingTime)} | Pool: ${formatSol(m.totalPoolSol)}\n[View](${marketUrl(m.publicKey)})`;
        });

        embeds.push(
            new EmbedBuilder()
                .setColor(EMBED_COLORS.WARNING)
                .setTitle('⏰ Closing Soon — Last Chance to Bet!')
                .setDescription(lines.join('\n\n'))
                .setTimestamp()
        );
    }

    // ── Resolved markets ──
    const allResolved = await listMarkets('Resolved');
    const recentlyResolved = allResolved
        .filter((m) => {
            const resTime = new Date(m.resolutionTime).getTime();
            return resTime > oneDayAgo;
        })
        .slice(0, 5);

    if (recentlyResolved.length > 0) {
        const lines = recentlyResolved.map((m) => {
            return `✅ **${truncate(m.question, 55)}**\nResult: **${m.winningOutcome || 'N/A'}** | Pool: ${formatSol(m.totalPoolSol)}`;
        });

        embeds.push(
            new EmbedBuilder()
                .setColor(EMBED_COLORS.SUCCESS)
                .setTitle('✅ Recently Resolved')
                .setDescription(lines.join('\n\n'))
                .setTimestamp()
        );
    }

    // ── Race markets summary ──
    if (raceMarkets.length > 0) {
        const topRace = [...raceMarkets]
            .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
            .slice(0, 3);

        const lines = topRace.map((m) => {
            const leader = [...m.outcomes].sort((a, b) => b.percent - a.percent)[0];
            return `🏇 **${truncate(m.question, 55)}**\n🥇 ${leader?.label || '?'} (${leader?.percent.toFixed(1) || '?'}%) | Pool: ${formatSol(m.totalPoolSol)} | ${m.outcomes.length} outcomes\n[View](${marketUrl(m.publicKey)})`;
        });

        embeds.push(
            new EmbedBuilder()
                .setColor(EMBED_COLORS.RACE)
                .setTitle('🏇 Race Markets')
                .setDescription(lines.join('\n\n'))
                .setTimestamp()
        );
    }

    if (embeds.length === 0) {
        embeds.push(
            new EmbedBuilder()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('📊 Daily Roundup')
                .setDescription('No active markets to report today. Check back tomorrow!')
                .setTimestamp()
        );
    }

    return embeds;
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

const scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Start or restart the roundup scheduler for all guilds
 */
export function startScheduler(discordClient: Client): void {
    // Clear existing jobs
    for (const [id, job] of scheduledJobs) {
        job.stop();
    }
    scheduledJobs.clear();

    const config = loadGuildConfig();

    for (const [guildId, guildConf] of Object.entries(config)) {
        if (!guildConf.enabled) continue;

        const cronExpr = `${guildConf.minute} ${guildConf.hour} * * *`;
        console.log(`[Roundup] Scheduling for guild ${guildId}: ${cronExpr} UTC -> #${guildConf.channelId}`);

        const job = cron.schedule(
            cronExpr,
            async () => {
                try {
                    console.log(`[Roundup] Running roundup for guild ${guildId}`);
                    const channel = await discordClient.channels.fetch(guildConf.channelId);
                    if (!channel || !(channel instanceof TextChannel)) {
                        console.error(`[Roundup] Channel ${guildConf.channelId} not found or not text`);
                        return;
                    }

                    const embeds = await buildRoundupEmbeds();
                    await channel.send({ embeds });
                    console.log(`[Roundup] Posted roundup in #${channel.name} (${guildId})`);
                } catch (err) {
                    console.error(`[Roundup] Error posting to guild ${guildId}:`, err);
                }
            },
            { timezone: 'UTC' }
        );

        scheduledJobs.set(guildId, job);
    }

    console.log(`[Roundup] ${scheduledJobs.size} guild(s) scheduled`);
}

/**
 * Reload scheduler (called after /setup saves new config)
 */
export function reloadScheduler(discordClient: Client): void {
    startScheduler(discordClient);
}
