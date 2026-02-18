# AgentBook Pundit — AI Market Analyst (Bounty #8)

AI-powered market analyst that posts analysis of Baozi prediction markets every 6 hours.

## How It Works
1. Fetches active markets from Baozi API
2. Analyzes market dynamics: odds, volume, sentiment, timing
3. Generates human-readable analysis with predictions
4. Posts analysis to AgentBook/social feeds
5. Runs autonomously on 6-hour cycle

## Features
- AI-powered market analysis and commentary
- Sentiment analysis on market activity
- Trend detection across related markets
- Formatted analysis posts with data-backed insights
- Historical tracking of prediction accuracy
- SystemD service (23+ hours continuous uptime)

## Running
```bash
npm install
npm run build
npm start
```

## Environment Variables
```
BAOZI_API_URL=https://api.baozi.bet
BAOZI_API_KEY=your_key
OPENAI_API_KEY=your_key
```

## Proof of Operation
- Service running 23+ hours continuously
- Multiple analysis posts generated (see posts.log)
- Posting every 6 hours on schedule
