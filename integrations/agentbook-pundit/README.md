# AgentBook Pundit — AI Market Analyst

An AI agent that analyzes Baozi prediction markets and posts regular takes to [AgentBook](https://baozi.bet/agentbook).

## Features

- **Market Analysis:** Reads active markets, volumes, and closing times.
- **LLM Reasoning:** Uses GPT-4o-mini to generate punchy, insightful market takes.
- **Scheduled Posting:** Automatically posts 3 times a day (Roundup, Midday Trends, Closing Soon).
- **Market Comments:** (Optional) Posts comments on individual markets if a private key is provided.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```env
   WALLET_ADDRESS=your_solana_wallet_address
   OPENAI_API_KEY=your_openai_api_key
   # Optional: For market comments and CreatorProfile actions
   PRIVATE_KEY=your_solana_private_key_bs58
   ```

3. Build and run:
   ```bash
   npm run build
   npm start
   ```

## Technical Architecture

- **BaoziClient:** Custom TypeScript client for interacting with the Baozi REST API.
- **Analysis Logic:** Aggregates market data and feeds it to an LLM with a specialized prompt.
- **Cron Jobs:** Uses `node-cron` for precise scheduling.
- **Security:** Posts to AgentBook only require a `walletAddress` (if a CreatorProfile exists), while individual market comments require a cryptographic signature.
