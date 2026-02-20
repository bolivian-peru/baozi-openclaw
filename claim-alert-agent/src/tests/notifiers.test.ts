/**
 * Tests for notification channels
 */

import { test, assert, assertEqual } from './run.js';
import { TelegramNotifier } from '../services/notifiers/telegram.js';
import { EmailNotifier } from '../services/notifiers/email.js';
import { WebhookNotifier } from '../services/notifiers/webhook.js';
import { createNotifier, createNotifiers } from '../services/notifiers/index.js';
import { Alert, MarketResolvedAlert, UnclaimedWinningsAlert, ClosingSoonAlert, OddsShiftAlert, NewMarketAlert } from '../types/index.js';

// --- Telegram message formatting ---

const telegramNotifier = new TelegramNotifier({
  type: 'telegram',
  botToken: 'test-token',
  chatId: '123',
});

await test('telegram formats market_resolved (won) message', async () => {
  const alert: MarketResolvedAlert = {
    type: 'market_resolved',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    marketId: 'M1',
    marketQuestion: 'Will BTC hit 120K?',
    userOutcome: 'Yes',
    winningOutcome: 'Yes',
    won: true,
    claimAmount: 2.5,
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('You won!'));
  assert(text.includes('BTC hit 120K'));
  assert(text.includes('2.5 SOL'));
});

await test('telegram formats unclaimed_winnings message', async () => {
  const alert: UnclaimedWinningsAlert = {
    type: 'unclaimed_winnings',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    totalAmount: 5.25,
    marketCount: 3,
    markets: [
      { marketId: 'M1', question: 'Q1', amount: 2.0 },
      { marketId: 'M2', question: 'Q2', amount: 1.75 },
      { marketId: 'M3', question: 'Q3', amount: 1.5 },
    ],
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('5.25 SOL'));
  assert(text.includes('3 markets'));
  assert(text.includes('Claim'));
});

await test('telegram formats closing_soon message', async () => {
  const alert: ClosingSoonAlert = {
    type: 'closing_soon',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    marketId: 'M1',
    marketQuestion: 'Grammy AOTY?',
    closingTime: new Date().toISOString(),
    hoursRemaining: 5.5,
    userOutcome: 'Artist A',
    userStake: 0.5,
    currentProbability: 0.42,
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('5.5h'));
  assert(text.includes('Grammy'));
  assert(text.includes('42%'));
});

await test('telegram formats odds_shift message', async () => {
  const alert: OddsShiftAlert = {
    type: 'odds_shift',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    marketId: 'M1',
    marketQuestion: 'Fed rate cut?',
    outcomeLabel: 'Yes',
    previousProbability: 0.45,
    currentProbability: 0.62,
    shiftPercentage: 17,
    userOutcome: 'No',
    userStake: 1.0,
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('17pp'));
  assert(text.includes('45%'));
  assert(text.includes('62%'));
});

await test('telegram formats new_market message', async () => {
  const alert: NewMarketAlert = {
    type: 'new_market',
    wallet: '*',
    timestamp: new Date().toISOString(),
    marketId: 'M1',
    marketQuestion: 'Will BTC hit 200K?',
    matchedKeywords: ['BTC'],
    closingTime: new Date().toISOString(),
    totalPool: 50,
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('New market'));
  assert(text.includes('BTC'));
});

await test('telegram escapes HTML in messages', async () => {
  const alert: MarketResolvedAlert = {
    type: 'market_resolved',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    marketId: 'M1',
    marketQuestion: 'Price > 100 & < 200?',
    userOutcome: 'Yes',
    winningOutcome: 'Yes',
    won: true,
    message: 'test',
  };

  const text = telegramNotifier.formatMessage(alert);
  assert(text.includes('&gt;'));
  assert(text.includes('&lt;'));
  assert(text.includes('&amp;'));
  assert(!text.includes('> 100'));
});

// --- Email formatting ---

await test('email formats subject correctly', async () => {
  const emailNotifier = new EmailNotifier({
    type: 'email',
    smtp: { host: 'localhost', port: 587, secure: false, auth: { user: '', pass: '' } },
    from: 'test@test.com',
    to: 'user@test.com',
  });

  const alert: UnclaimedWinningsAlert = {
    type: 'unclaimed_winnings',
    wallet: 'W1',
    timestamp: new Date().toISOString(),
    totalAmount: 3.5,
    marketCount: 2,
    markets: [],
    message: 'test',
  };

  const { subject, html } = emailNotifier.formatEmail(alert);
  assert(subject.includes('3.50 SOL'));
  assert(html.includes('Unclaimed Winnings'));
  assert(html.includes('baozi.bet'));
});

// --- Notifier factory ---

await test('createNotifier creates webhook notifier', async () => {
  const notifier = createNotifier({ type: 'webhook', url: 'https://example.com/hook' });
  assertEqual(notifier.name, 'webhook');
});

await test('createNotifier creates telegram notifier', async () => {
  const notifier = createNotifier({ type: 'telegram', botToken: 'tok', chatId: '123' });
  assertEqual(notifier.name, 'telegram');
});

await test('createNotifier creates email notifier', async () => {
  const notifier = createNotifier({
    type: 'email',
    smtp: { host: 'localhost', port: 587, secure: false, auth: { user: '', pass: '' } },
    from: 'a@b.com',
    to: 'c@d.com',
  });
  assertEqual(notifier.name, 'email');
});

await test('createNotifiers creates multiple notifiers', async () => {
  const notifiers = createNotifiers([
    { type: 'webhook', url: 'https://example.com' },
    { type: 'telegram', botToken: 'tok', chatId: '123' },
  ]);
  assertEqual(notifiers.length, 2);
});
