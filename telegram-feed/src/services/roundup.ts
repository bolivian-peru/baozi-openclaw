import cron from 'node-cron';
import { Bot } from 'grammy';
import { BaoziClient } from './baozi-client';
import { GroupStore } from './group-store';
import { formatDailyRoundup } from '../utils/format';

/**
 * Manages scheduled daily roundup posts to subscribed groups.
 */
export class RoundupScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(
    private bot: Bot,
    private baoziClient: BaoziClient,
    private groupStore: GroupStore,
  ) {}

  /**
   * Start all roundup schedules from stored configs.
   */
  startAll(): void {
    const configs = this.groupStore.getRoundupChats();
    for (const cfg of configs) {
      this.schedule(cfg.chatId);
    }
    console.log(`Started ${configs.length} roundup schedules`);
  }

  /**
   * Schedule roundup for a specific chat.
   */
  schedule(chatId: number): void {
    const cfg = this.groupStore.get(chatId);
    const key = `roundup-${chatId}`;

    // Cancel existing schedule
    this.cancel(chatId);

    if (!cfg.roundupEnabled) return;

    if (!cron.validate(cfg.roundupCron)) {
      console.warn(`Invalid cron expression for chat ${chatId}: ${cfg.roundupCron}`);
      return;
    }

    const task = cron.schedule(cfg.roundupCron, async () => {
      try {
        await this.sendRoundup(chatId);
      } catch (error) {
        console.error(`Roundup failed for chat ${chatId}:`, error);
      }
    }, {
      timezone: cfg.timezone,
    });

    this.tasks.set(key, task);
    console.log(`Scheduled roundup for chat ${chatId} at ${cfg.roundupCron} (${cfg.timezone})`);
  }

  /**
   * Cancel roundup for a specific chat.
   */
  cancel(chatId: number): void {
    const key = `roundup-${chatId}`;
    const existing = this.tasks.get(key);
    if (existing) {
      existing.stop();
      this.tasks.delete(key);
    }
  }

  /**
   * Send the daily roundup to a specific chat.
   */
  async sendRoundup(chatId: number): Promise<void> {
    const cfg = this.groupStore.get(chatId);

    const [hot, closing, newMarkets, resolved] = await Promise.all([
      this.baoziClient.getHotMarkets(3),
      this.baoziClient.getClosingMarkets(24),
      this.baoziClient.getNewMarkets(3),
      this.baoziClient.getResolvedMarkets(3),
    ]);

    // Apply category filters if set
    const filterByCategory = (markets: typeof hot) => {
      if (cfg.categories.length === 0) return markets;
      return markets.filter(m =>
        !m.category || cfg.categories.some(c =>
          c.toLowerCase() === m.category?.toLowerCase()
        )
      );
    };

    const message = formatDailyRoundup(
      filterByCategory(hot),
      filterByCategory(closing),
      filterByCategory(newMarkets),
      filterByCategory(resolved),
    );

    await this.bot.api.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    console.log(`Sent daily roundup to chat ${chatId}`);
  }

  /**
   * Stop all scheduled tasks.
   */
  stopAll(): void {
    for (const [key, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();
  }
}
