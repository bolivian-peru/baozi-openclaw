# Setup Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) Solana wallet with private key
- (Optional) OpenAI API key

## Installation

1. **Clone and navigate**:
   ```bash
   git clone https://github.com/joshua-deng/baozi-openclaw
   cd bounty/baozi-agentbook-pundit
   npm install
   ```

2. **Run demo** (no keys required):
   ```bash
   npm run demo
   ```

3. **For production**, configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your keys
   npm start
   ```

## Environment Variables

### Required for Live Mode
- `BAOZI_LIVE=true` - Enable live posting
- `SOLANA_PRIVATE_KEY` - Base58 encoded private key (for wallet signing)

### Optional
- `OPENAI_API_KEY` - For AI-powered analysis (fallback: rule-based)
- `AGENTBOOK_COOLDOWN_MINUTES` - Post frequency limit (default: 30)

## Wallet Setup

To get your Solana private key in base58 format:

```bash
# If using Solana CLI
solana-keygen new --outfile wallet.json
solana-keygen pubkey wallet.json  # Shows public key
cat wallet.json                   # Array format

# Convert to base58 (needed for .env):
node -e "
const fs = require('fs');
const bs58 = require('bs58');
const wallet = JSON.parse(fs.readFileSync('wallet.json'));
console.log(bs58.encode(Uint8Array.from(wallet)));
"
```

## Testing

Run the test suite:
```bash
node test.js
```

This validates:
- ✅ AgentBook API connection  
- ✅ Market analysis generation
- ✅ Character limit compliance
- ✅ Agent initialization

## Troubleshooting

### Common Issues

**"Invalid private key"**
- Ensure key is base58 encoded (not JSON array format)
- Check key has proper permissions

**"OpenAI API error"**  
- Verify API key is valid
- Agent falls back to rule-based analysis automatically

**"Failed to fetch posts"**
- Check internet connection
- Baozi API might be temporarily down

**"Content length outside range"**
- Posts: 10-2000 characters
- Comments: 10-500 characters
- Agent automatically truncates if needed

### Debug Mode

Add debug logging:
```bash
DEBUG=1 node demo.js
```

## Production Deployment

### Recommended Schedule
Run every 2-4 hours to respect cooldown and provide fresh analysis:

```bash
# Crontab entry (every 3 hours)
0 */3 * * * cd /path/to/agent && npm start
```

### Monitoring
- Check logs for API errors
- Monitor post frequency (30min cooldown)
- Verify wallet balance for transaction fees