/**
 * Embed Helper Utilities
 * Progress bars, formatters, and shared embed styles.
 */
import { EmbedBuilder, Colors } from 'discord.js';

// ─── Progress Bar ────────────────────────────────────────────────────────────

const BAR_FILLED = '█';
const BAR_EMPTY = '░';
const BAR_LENGTH = 15;

/**
 * Create a unicode block progress bar.
 * @param percent 0-100
 */
export function progressBar(percent: number): string {
    const clamped = Math.max(0, Math.min(100, percent));
    const filled = Math.round((clamped / 100) * BAR_LENGTH);
    const empty = BAR_LENGTH - filled;
    return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(empty);
}

// ─── Formatters ──────────────────────────────────────────────────────────────

/**
 * Format SOL amount with symbol
 */
export function formatSol(amount: number): string {
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K SOL`;
    if (amount >= 1) return `${amount.toFixed(2)} SOL`;
    return `${amount.toFixed(4)} SOL`;
}

/**
 * Format ISO date to human-readable relative time
 */
export function formatTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) {
        // Past
        const absDays = Math.abs(diffDays);
        if (absDays < 1) return `${Math.abs(Math.round(diffHours))}h ago`;
        return `${Math.round(absDays)}d ago`;
    }

    if (diffHours < 1) return `${Math.round(diffMs / 60000)}m`;
    if (diffHours < 24) return `${Math.round(diffHours)}h`;
    if (diffDays < 7) return `${Math.round(diffDays)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format ISO date to absolute display
 */
export function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    });
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
}

/**
 * Shorten a Solana public key for display
 */
export function shortKey(key: string): string {
    if (key.length <= 12) return key;
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * Get the Baozi market URL
 */
export function marketUrl(publicKey: string): string {
    return `https://baozi.bet/market/${publicKey}`;
}

/**
 * Status emoji
 */
export function statusEmoji(status: string): string {
    switch (status.toLowerCase()) {
        case 'active': return '🟢';
        case 'closed': return '🔴';
        case 'resolved': return '✅';
        case 'cancelled': return '❌';
        case 'paused': return '⏸️';
        default: return '⚪';
    }
}

/**
 * Layer emoji + label
 */
export function layerLabel(layer: string): string {
    switch (layer.toLowerCase()) {
        case 'official': return '🏛️ Official';
        case 'lab': return '🧪 Lab';
        case 'private': return '🔒 Private';
        default: return layer;
    }
}

// ─── Embed Colors ────────────────────────────────────────────────────────────

export const EMBED_COLORS = {
    PRIMARY: 0x7c3aed,    // Purple (Baozi brand)
    SUCCESS: 0x10b981,    // Green
    WARNING: 0xf59e0b,    // Amber
    ERROR: 0xef4444,      // Red
    INFO: 0x3b82f6,       // Blue
    RACE: 0xec4899,       // Pink
} as const;

/**
 * Create a standard error embed
 */
export function errorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Footer stamp for all embeds
 */
export function baoziFooter(): { text: string; iconURL?: string } {
    return { text: 'Baozi.bet • Prediction Markets on Solana' };
}
