# 🥟 Baozi Share Card Viral Engine

**Every bet becomes a billboard.** Auto-generate and distribute share cards for Baozi prediction markets across Twitter/X, Discord, and Telegram.

## Features

- 📊 **Rich HTML Cards** — Beautiful market cards with odds visualization, pool sizes, countdowns
- 🐦 **Twitter/X** — Tweet-sized cards with thread support, character limit validation
- 💬 **Discord** — Rich embed objects with fields, colors, and markdown fallback
- 📱 **Telegram** — HTML-formatted messages with inline keyboard buttons
- 🔄 **Multi-Platform** — Generate and distribute to all platforms simultaneously
- 🎨 **Multiple Styles** — Default, compact, minimal, and detailed card templates
- 🔗 **Real Mainnet Data** — Direct integration with `@baozi.bet/mcp-server` handlers
- 📈 **Batch Generation** — Generate cards for top/trending/all active markets
- 🧪 **30+ Tests** — Comprehensive test suite including Solana RPC integration tests

## Architecture

```
share-card-engine/
├── src/
│   ├── index.ts                  # Public API exports
│   ├── types/index.ts            # TypeScript type definitions
│   ├── generators/
│   │   ├── html-card.ts          # Core HTML card generator (4 styles)
│   │   └── batch.ts              # Batch generation for multiple markets
│   ├── distributors/
│   │   ├── twitter.ts            # Twitter/X formatting & threads
│   │   ├── discord.ts            # Discord embeds & markdown
│   │   ├── telegram.ts           # Telegram HTML & inline keyboards
│   │   └── multi-platform.ts     # Cross-platform distribution engine
│   ├── utils/
│   │   ├── config.ts             # Configuration & defaults
│   │   ├── formatting.ts         # Sol/percent/time formatting utilities
│   │   └── market-fetcher.ts     # MCP server data fetcher
│   └── __tests__/
│       ├── formatting.test.ts    # Formatting utility tests
│       ├── config.test.ts        # Config utility tests
│       ├── html-card.test.ts     # HTML card generator tests
│       ├── twitter.test.ts       # Twitter formatter tests
│       ├── discord.test.ts       # Discord formatter tests
│       ├── telegram.test.ts      # Telegram formatter tests
│       ├── multi-platform.test.ts # Multi-platform distribution tests
│       └── integration.test.ts   # Live Solana RPC integration tests
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## MCP Integration

This engine imports **directly** from `@baozi.bet/mcp-server` handlers — no stub/mock MCP clients:

```typescript
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { PROGRAM_ID, DISCRIMINATORS, RPC_ENDPOINT } from '@baozi.bet/mcp-server/dist/config.js';
```

Program ID: `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Usage

### Generate a single market card

```typescript
import { generateShareCard, fetchMarket } from '@baozi/share-card-engine';

const market = await fetchMarket('YOUR_MARKET_PUBKEY');
if (market) {
  const card = generateShareCard(market, { 
    style: 'default',
    platform: 'twitter' 
  });
  console.log(card.plainText);
  console.log(card.html);
}
```

### Generate Twitter-ready content

```typescript
import { fetchActiveMarkets, formatMarketTweet, formatTweetThread } from '@baozi/share-card-engine';

const markets = await fetchActiveMarkets();
const tweet = formatMarketTweet(markets[0]);
// => "🔥 Will BTC hit $200k? YES 65.5% · NO 34.5% 💰 Pool: 229.70 SOL 🥟 https://baozi.bet/market/..."

const thread = formatTweetThread(markets[0]);
// => 3-part thread with hook, odds, and CTA
```

### Discord embed

```typescript
import { createDiscordEmbed, fetchTopMarkets } from '@baozi/share-card-engine';

const markets = await fetchTopMarkets(5);
const embed = createDiscordEmbed(markets[0]);
// Ready to send via Discord API / webhook
```

### Telegram message

```typescript
import { formatMarketTelegramHtml, generateTelegramKeyboard } from '@baozi/share-card-engine';

const html = formatMarketTelegramHtml(market);
const keyboard = generateTelegramKeyboard(marketUrl);
// Send via Telegram Bot API with parse_mode: 'HTML'
```

### Multi-platform distribution

```typescript
import { distributeToAllPlatforms, batchDistribute, fetchTrendingMarkets } from '@baozi/share-card-engine';

// Single market → all platforms
const result = distributeToAllPlatforms(market);
console.log(result.totalSuccess); // 3

// Batch: trending markets → all platforms
const trending = await fetchTrendingMarkets(5);
const results = batchDistribute(trending);
```

## Card Styles

| Style | Description | Best For |
|-------|------------|----------|
| `default` | Full card with header, odds bar, stats, CTA | General use |
| `compact` | Clean card with essential info | Twitter, sharing |
| `minimal` | Tiny card, just odds and link | Inline embeds |
| `detailed` | Complete breakdown with grid stats | Landing pages |

## Configuration

```typescript
import { generateShareCard, type ShareCardConfig } from '@baozi/share-card-engine';

const config: Partial<ShareCardConfig> = {
  baseUrl: 'https://baozi.bet',
  affiliateCode: 'myref',
  footerText: 'Custom footer text',
  colors: {
    yes: '#00ff00',
    no: '#ff0000',
    background: '#000000',
    text: '#ffffff',
    accent: '#ffcc00',
  },
};

const card = generateShareCard(market, { style: 'default' }, config);
```

## Docker

```bash
# Build and run
docker-compose up --build

# With custom RPC
SOLANA_RPC_URL=https://your-rpc.com docker-compose up
```

## Testing

```bash
# Run all tests (30+)
npm test

# Watch mode
npm run test:watch
```

Tests include:
- Unit tests for all formatting utilities
- Config merging and URL building
- HTML card generation across all 4 styles
- Twitter formatting with character limit validation
- Discord embed structure validation
- Telegram HTML and keyboard generation
- Multi-platform distribution coordination
- **Live Solana RPC integration tests** verifying real market data

## Environment Variables

| Variable | Description | Default |
|----------|------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `HELIUS_RPC_URL` | Helius RPC (preferred) | — |
| `BAOZI_PROGRAM_ID` | Program ID override | `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ` |

## License

MIT
