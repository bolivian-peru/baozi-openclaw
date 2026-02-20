import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { GroupConfig } from '../types';
import { config } from '../config';

/**
 * Persistent store for per-group bot configuration.
 * Uses a simple JSON file for portability.
 */
export class GroupStore {
  private configs: Map<number, GroupConfig> = new Map();
  private filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir || config.dataDir;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.filePath = join(dir, 'groups.json');
    this.load();
  }

  /**
   * Get config for a chat, creating default if needed.
   */
  get(chatId: number): GroupConfig {
    if (!this.configs.has(chatId)) {
      const defaultConfig: GroupConfig = {
        chatId,
        roundupEnabled: false,
        roundupCron: config.defaultRoundupCron,
        timezone: config.defaultTimezone,
        categories: [],
      };
      this.configs.set(chatId, defaultConfig);
    }
    return this.configs.get(chatId)!;
  }

  /**
   * Update config for a chat.
   */
  set(chatId: number, updates: Partial<GroupConfig>): GroupConfig {
    const current = this.get(chatId);
    const updated = { ...current, ...updates, chatId };
    this.configs.set(chatId, updated);
    this.save();
    return updated;
  }

  /**
   * Get all chats with roundup enabled.
   */
  getRoundupChats(): GroupConfig[] {
    return Array.from(this.configs.values()).filter(c => c.roundupEnabled);
  }

  /**
   * Remove a chat config.
   */
  remove(chatId: number): void {
    this.configs.delete(chatId);
    this.save();
  }

  /**
   * Get all stored configs.
   */
  getAll(): GroupConfig[] {
    return Array.from(this.configs.values());
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8');
        const data: GroupConfig[] = JSON.parse(raw);
        for (const cfg of data) {
          this.configs.set(cfg.chatId, cfg);
        }
      }
    } catch (error) {
      console.warn('Failed to load group configs:', error);
    }
  }

  private save(): void {
    try {
      const data = Array.from(this.configs.values());
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save group configs:', error);
    }
  }
}
