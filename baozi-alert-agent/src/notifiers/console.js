class ConsoleNotifier {
  async sendAlert(alert) {
    const emoji = { 'MARKET_RESOLVED': '🎉', 'UNCLAIMED_WINNINGS': '💰', 'CLOSING_SOON': '⏰', 'ODDS_SHIFT': '📊' }[alert.type] || '🔔';
    console.log('\n' + '='.repeat(50));
    console.log(`${emoji} ALERT: ${alert.type}`);
    console.log(alert.message);
    console.log(`Wallet: ${alert.wallet}`);
    console.log('='.repeat(50) + '\n');
    return true;
  }
}

module.exports = ConsoleNotifier;
