/**
 * Daily roundup scheduler
 * Posts market summary to configured channels at scheduled times
 */
import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { listMarkets } from './baozi/index.js';
import { buildDailyRoundupEmbed } from './embeds/market-embed.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GuildConfig {
  channelId: string;
  hour: number;
  minute: number;
}

class Scheduler {
  private client: Client;
  private configs: Map<string, GuildConfig> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private configPath: string;

  constructor(client: Client) {
    this.client = client;
    this.configPath = join(__dirname, '..', 'data', 'guild-configs.json');
    this.loadConfigs();
  }

  private loadConfigs() {
    try {
      if (existsSync(this.configPath)) {
        const data = JSON.parse(readFileSync(this.configPath, 'utf8'));
        for (const [guildId, config] of Object.entries(data)) {
          this.configs.set(guildId, config as GuildConfig);
        }
      }
    } catch (err) {
      console.error('Failed to load guild configs:', err);
    }
  }

  private saveConfigs() {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data: Record<string, GuildConfig> = {};
      for (const [guildId, config] of this.configs) {
        data[guildId] = config;
      }
      writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save guild configs:', err);
    }
  }

  setGuildConfig(guildId: string, channelId: string, hour: number, minute: number) {
    this.configs.set(guildId, { channelId, hour, minute });
    this.saveConfigs();
    this.scheduleCron(guildId);
  }

  private scheduleCron(guildId: string) {
    // Cancel existing job
    const existing = this.cronJobs.get(guildId);
    if (existing) existing.stop();

    const config = this.configs.get(guildId);
    if (!config) return;

    const cronExpr = `${config.minute} ${config.hour} * * *`;
    const job = cron.schedule(cronExpr, () => {
      this.postDailyRoundup(guildId).catch(err =>
        console.error(`Failed daily roundup for ${guildId}:`, err)
      );
    }, { timezone: 'UTC' });

    this.cronJobs.set(guildId, job);
    console.log(`Scheduled daily roundup for guild ${guildId} at ${config.hour}:${String(config.minute).padStart(2, '0')} UTC`);
  }

  startAll() {
    for (const guildId of this.configs.keys()) {
      this.scheduleCron(guildId);
    }
    console.log(`Started ${this.configs.size} daily roundup schedules`);
  }

  private async postDailyRoundup(guildId: string) {
    const config = this.configs.get(guildId);
    if (!config) return;

    try {
      const channel = await this.client.channels.fetch(config.channelId);
      if (!channel || !(channel instanceof TextChannel)) {
        console.error(`Channel ${config.channelId} not found or not a text channel`);
        return;
      }

      // Fetch market data
      const allMarkets = await listMarkets();

      // Hot markets (by volume)
      const hotMarkets = allMarkets
        .filter(m => m.status === 'Active' && m.totalPoolSol > 0)
        .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
        .slice(0, 5);

      // New markets (created recently — proxy: low ID = newer, or just show all active)
      const newMarkets = allMarkets
        .filter(m => m.status === 'Active')
        .sort((a, b) => Number(BigInt(b.marketId) - BigInt(a.marketId)))
        .slice(0, 5);

      // Resolved markets
      const resolvedMarkets = allMarkets
        .filter(m => m.status === 'Resolved')
        .slice(0, 5);

      const embed = buildDailyRoundupEmbed(hotMarkets, newMarkets, resolvedMarkets);
      await channel.send({ embeds: [embed] });

      console.log(`Posted daily roundup to guild ${guildId} channel ${config.channelId}`);
    } catch (err) {
      console.error(`Error posting daily roundup for ${guildId}:`, err);
    }
  }
}

// Singleton
let schedulerInstance: Scheduler | null = null;

export function initScheduler(client: Client): Scheduler {
  schedulerInstance = new Scheduler(client);
  return schedulerInstance;
}

export function getScheduler(): Scheduler {
  if (!schedulerInstance) throw new Error('Scheduler not initialized');
  return schedulerInstance;
}
