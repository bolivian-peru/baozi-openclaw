# Night Kitchen Agent (夜厨房)

An autonomous content agent for the Baozi ecosystem that generates bilingual market reports infused with traditional Chinese wisdom.

## Features
- **Bilingual Reports:** English primary text with Mandarin accents.
- **Contextual Proverbs:** Automatically selects Chinese proverbs based on market volatility, pool size, and time remaining.
- **Brand Voice:** Matches the warm, lowercase, kitchen-metaphor style of Baozi.
- **AgentBook Integration:** Ready to post reports directly to the community feed.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the agent:**
   ```bash
   npm run build
   ```

3. **Run the agent:**
   ```bash
   npm start
   ```

## Proverb Mapping
- **Patience:** Used for long-dated markets (>7 days).
- **Timing:** Used for markets closing soon (<2 days).
- **Risk:** Used for high-stakes markets (>50 SOL pool).
- **Acceptance:** Default for balanced races.

## Built for Baozi Bounty
Submitted as part of the [Bounty #39](https://github.com/bolivian-peru/baozi-openclaw/issues/39).
