export function hoursUntil(isoDate) {
    return (new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60);
}
export function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
}
export function formatPool(total) {
    return total >= 10 ? `${total.toFixed(1)} SOL` : `${total.toFixed(2)} SOL`;
}
export function truncate(text, maxLength) {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}
export function sortByPool(markets) {
    return [...markets].sort((a, b) => b.pool.total - a.pool.total);
}
