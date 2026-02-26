/**
 * Recruitment Store
 *
 * Persists recruited agent records to data/recruited-agents.json.
 * Tracks who has been contacted, when, and their onboarding status.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RecruitmentStore, RecruitmentRecord } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'recruited-agents.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export class Store {
  private data: RecruitmentStore;

  constructor(affiliateCode: string) {
    ensureDataDir();
    if (existsSync(STORE_PATH)) {
      try {
        this.data = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as RecruitmentStore;
      } catch {
        this.data = this.empty(affiliateCode);
      }
    } else {
      this.data = this.empty(affiliateCode);
    }
  }

  private empty(affiliateCode: string): RecruitmentStore {
    return { recruited: [], lastCycle: null, totalContacted: 0, affiliateCode };
  }

  isContacted(walletAddress: string): boolean {
    return this.data.recruited.some(r => r.walletAddress === walletAddress);
  }

  record(walletAddress: string, affiliateCode: string): void {
    if (this.isContacted(walletAddress)) return;
    this.data.recruited.push({
      walletAddress,
      recruitedAt: new Date().toISOString(),
      messagesSent: 1,
      affiliateCode,
      status: 'contacted',
    });
    this.data.totalContacted++;
    this.save();
  }

  markCycleComplete(): void {
    this.data.lastCycle = new Date().toISOString();
    this.save();
  }

  getAll(): RecruitmentRecord[] { return this.data.recruited; }
  getTotalContacted(): number   { return this.data.totalContacted; }
  getLastCycle(): string | null { return this.data.lastCycle; }

  private save(): void {
    writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
