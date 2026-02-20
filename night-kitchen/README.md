# 🏮 夜厨房 · Night Kitchen

**Bilingual Market Report Agent — Where data meets ancient wisdom.**

夜厨房 (yè chú fáng) generates beautiful bilingual (English + Chinese) market reports for [Baozi](https://baozi.bet) prediction markets, enriched with Chinese cultural wisdom — proverbs, idioms (成语), and philosophical insights that illuminate market dynamics.

---

## ✨ Features / 功能特点

- **📊 Market Analysis / 市场分析** — Fetches live market data from Solana via MCP server
- **🎲 Odds Breakdown / 赔率分析** — Decimal odds, implied probabilities, spread analysis
- **🏊 Pool Analysis / 资金池分析** — Liquidity depth, pool size categorization
- **⏰ Time Analysis / 时间分析** — Urgency classification, bilingual time remaining
- **🏮 Cultural Wisdom / 文化智慧** — 40+ curated Chinese proverbs mapped to market themes
- **📤 AgentBook Publishing / 发布到AgentBook** — Post reports directly to Baozi AgentBook
- **📱 Multiple Formats / 多种格式** — Full, compact, and social media formats
- **🐳 Docker Support / Docker支持** — Ready-to-deploy containerized setup

---

## 🏮 Cultural Wisdom Categories / 智慧分类

| Category | 类别 | Example / 示例 |
|----------|------|----------------|
| Risk 风险 | 不入虎穴，焉得虎子 | Nothing ventured, nothing gained |
| Timing 时机 | 机不可失，时不再来 | Opportunity knocks but once |
| Strategy 策略 | 知己知彼，百战不殆 | Know yourself, know your enemy |
| Fortune 财运 | 塞翁失马，焉知非福 | A blessing in disguise |
| Change 变化 | 风水轮流转 | Fortune's wheel keeps turning |
| Wisdom 智慧 | 旁观者清，当局者迷 | The spectator sees clearly |
| Competition 竞争 | 龙争虎斗 | A battle between dragon and tiger |
| Finance 金融 | 落袋为安 | Secure your gains |

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置条件

- Node.js 20+
- npm

### Installation / 安装

```bash
cd night-kitchen
npm install
```

### Generate Reports / 生成报告

```bash
# All active markets (full report)
npx tsx src/index.ts

# Specific market
npx tsx src/index.ts --market <MARKET_PDA>

# Compact format
npx tsx src/index.ts --format compact

# Social media format
npx tsx src/index.ts --format social

# Post to AgentBook (dry run)
npx tsx src/index.ts --post --dry-run --wallet <WALLET_ADDRESS>

# Post to AgentBook (live)
npx tsx src/index.ts --post --wallet <WALLET_ADDRESS>
```

### Run Tests / 运行测试

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Build / 构建

```bash
npm run build
```

---

## 🐳 Docker / Docker部署

```bash
# Build and run
docker-compose up --build

# With environment variables
WALLET_ADDRESS=your_wallet HELIUS_RPC_URL=your_rpc docker-compose up
```

---

## 📐 Architecture / 架构

```
night-kitchen/
├── src/
│   ├── index.ts              # CLI entry point & exports / 入口文件
│   ├── wisdom.ts             # Chinese cultural wisdom module / 文化智慧模块
│   ├── market-analyzer.ts    # Market data fetching & analysis / 市场分析引擎
│   ├── report-generator.ts   # Bilingual report generation / 双语报告生成器
│   ├── agentbook.ts          # AgentBook API publisher / AgentBook发布器
│   └── __tests__/
│       ├── wisdom.test.ts            # Wisdom module tests (30+ tests)
│       ├── report-generator.test.ts  # Report generation tests
│       ├── agentbook.test.ts         # Publisher tests
│       ├── market-analyzer.test.ts   # Analyzer config tests
│       └── integration.test.ts       # Live Solana RPC integration tests
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### MCP Server Integration / MCP服务器集成

Night Kitchen imports handlers directly from `@baozi.bet/mcp-server`:

```typescript
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
```

**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`

---

## 📊 Report Formats / 报告格式

### Full Report / 完整报告
A comprehensive analysis including:
- Market question and metadata
- Bilingual sentiment analysis (EN + CN)
- Odds breakdown with visual bars
- Pool size and liquidity analysis
- Quote snapshot (if betting is open)
- Time analysis with urgency classification
- 3 curated cultural wisdom entries
- Program verification

### Compact Report / 精简报告
A condensed version with key data points and 1-2 wisdom entries.

### Social Report / 社交媒体报告
Ultra-short format designed for social media sharing with hashtags.

---

## 🔧 Environment Variables / 环境变量

| Variable | Description | Default |
|----------|-------------|---------|
| `WALLET_ADDRESS` | Wallet for AgentBook posts | — |
| `HELIUS_RPC_URL` | Helius RPC endpoint (recommended) | — |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |

---

## 📄 License

MIT

---

> 🏮 「好饭不怕晚」 — *A good meal is worth waiting for.*
>
> 夜厨房 · Night Kitchen — Where data meets ancient wisdom. 🏮
