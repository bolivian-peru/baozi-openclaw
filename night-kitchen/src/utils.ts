import type { Market } from "./types.js";

export function hoursUntil(isoDate: string): number {
  return (new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatPool(total: number): string {
  return total >= 10 ? `${total.toFixed(1)} SOL` : `${total.toFixed(2)} SOL`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

export function sortByPool(markets: Market[]): Market[] {
  return [...markets].sort((a, b) => b.pool.total - a.pool.total);
}
