/**
 * Formatting utilities for share cards
 */

/**
 * Format SOL amount with appropriate precision
 */
export function formatSol(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K SOL`;
  if (amount >= 1) return `${amount.toFixed(2)} SOL`;
  if (amount >= 0.01) return `${amount.toFixed(3)} SOL`;
  return `${amount.toFixed(4)} SOL`;
}

/**
 * Format percentage with precision
 */
export function formatPercent(pct: number): string {
  if (pct >= 99.5) return '99.5%+';
  if (pct <= 0.5) return '<0.5%';
  return `${pct.toFixed(1)}%`;
}

/**
 * Format countdown from ISO string to human-readable
 */
export function formatCountdown(closingTime: string): string {
  const close = new Date(closingTime).getTime();
  const now = Date.now();
  const diff = close - now;

  if (diff <= 0) return 'Closed';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/**
 * Truncate question text for card display
 */
export function truncateQuestion(question: string, maxLen: number = 100): string {
  if (question.length <= maxLen) return question;
  return question.slice(0, maxLen - 3) + '...';
}

/**
 * Generate a visual odds bar as ASCII art
 */
export function asciiOddsBar(yesPercent: number, width: number = 20): string {
  const yesBlocks = Math.round((yesPercent / 100) * width);
  const noBlocks = width - yesBlocks;
  return '🟢'.repeat(yesBlocks) + '🔴'.repeat(noBlocks);
}

/**
 * Generate a visual odds bar as HTML
 */
export function htmlOddsBar(yesPercent: number, yesColor: string, noColor: string): string {
  return `<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;width:100%;">
    <div style="width:${yesPercent}%;background:${yesColor};"></div>
    <div style="width:${100 - yesPercent}%;background:${noColor};"></div>
  </div>`;
}

/**
 * Format market status for display
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Active': '🟢 Live',
    'Closed': '🔴 Closed',
    'Resolved': '✅ Resolved',
    'Cancelled': '❌ Cancelled',
    'Paused': '⏸️ Paused',
    'ResolvedPending': '⏳ Pending Resolution',
    'Disputed': '⚠️ Disputed',
  };
  return statusMap[status] || status;
}

/**
 * Format layer name
 */
export function formatLayer(layer: string): string {
  const layerMap: Record<string, string> = {
    'Official': '🏛️ Official',
    'Lab': '🧪 Lab',
    'Private': '🔒 Private',
  };
  return layerMap[layer] || layer;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get emoji for odds range
 */
export function oddsEmoji(percent: number): string {
  if (percent >= 80) return '🔥';
  if (percent >= 60) return '📈';
  if (percent >= 40) return '⚖️';
  if (percent >= 20) return '📉';
  return '❄️';
}
