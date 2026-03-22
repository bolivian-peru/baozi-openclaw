/**
 * Utility helpers for Night Kitchen.
 */

/**
 * Format a Date as a readable date string (lowercase, kitchen style).
 * e.g. "march 22, 2026"
 */
export function formatDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toLowerCase();
}

/**
 * Format a Date as a time string.
 * e.g. "14:30 utc"
 */
export function formatTime(date: Date): string {
  return (
    date
      .toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      })
      .toLowerCase() + ' utc'
  );
}

/**
 * Returns the number of hours until a given date from now.
 */
export function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

/**
 * Returns the number of days until a given date from now.
 */
export function daysUntil(date: Date): number {
  return hoursUntil(date) / 24;
}

/**
 * Format a SOL amount for display.
 * e.g. 10.5 → "10.5 sol"
 */
export function formatSol(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k sol`;
  }
  return `${amount.toFixed(1)} sol`;
}

/**
 * Format a probability as a percentage.
 * e.g. 0.73 → "73%"
 */
export function formatPct(probability: number): string {
  const pct = probability <= 1 ? probability * 100 : probability;
  return `${Math.round(pct)}%`;
}

/**
 * Truncate a question for display (lowercase).
 */
export function truncateQuestion(question: string, maxLen = 60): string {
  const q = question.toLowerCase();
  if (q.length <= maxLen) return q;
  return q.substring(0, maxLen - 3) + '...';
}

/**
 * Clamp a post to the AgentBook character limit.
 */
export function clampToLimit(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + '...';
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
