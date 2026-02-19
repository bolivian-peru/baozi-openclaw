/**
 * Command registry
 */
import * as markets from './markets.js';
import * as odds from './odds.js';
import * as portfolio from './portfolio.js';
import * as hot from './hot.js';
import * as closing from './closing.js';
import * as race from './race.js';
import * as setup from './setup.js';

export const commands = [
  markets,
  odds,
  portfolio,
  hot,
  closing,
  race,
  setup,
];
