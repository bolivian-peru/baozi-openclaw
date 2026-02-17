# Claim & Alert Agent

This agent monitors Baozi prediction markets and sends notifications for key events.

## Features
- Monitors a list of wallet addresses.
- Polls Baozi API every 15-30 minutes.
- Alerts on:
  - Market resolved (claim winnings).
  - Unclaimed winnings.
  - Market closing soon.
  - Significant odds shifts.
- Supports notifications via webhook (e.g., Discord/Telegram).

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables in `.env`:
    ```env
    SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # Replace with actual RPC URL
    POLL_INTERVAL_MINUTES=15
    ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
    # Add other config as needed
    ```
4.  Run the agent:
    ```bash
    npm start
    ```

## Development

- **Important**: This project uses a placeholder IDL in `src/baozi.ts`. Replace it with the actual `baozi.json` IDL from the Baozi program to ensure correct data decoding.
- Build: `npm run build`
- Test: `npm test`

## Project Structure

- `src/`: Source code
  - `index.ts`: Entry point
  - `monitor.ts`: Monitoring logic
  - `baozi.ts`: Baozi API client
  - `notifier.ts`: Notification service
  - `config.ts`: Configuration
- `test/`: Tests
