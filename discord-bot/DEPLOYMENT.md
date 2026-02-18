# Deployment Guide

## Quick Start (5 minutes)

### 1. Get Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Baozi Market Bot"
4. Go to "Bot" section in left sidebar
5. Click "Add Bot" → "Yes, do it!"
6. Under "Privileged Gateway Intents":
   - ✅ Enable "Message Content Intent"
7. Click "Reset Token" → Copy the token
8. **Save this token** - you'll need it for deployment

### 2. Invite Bot to Test Servers

1. In Discord Developer Portal, go to "OAuth2" → "URL Generator"
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. Copy generated URL
5. Open URL in browser
6. Add to 2+ Discord servers for testing

### 3. Deploy to Railway (Recommended - Free Tier)

**Prerequisites:** GitHub account

**Steps:**

1. **Push code to GitHub:**
```bash
cd /root/clawd/bounties/baozi-discord-bot
git init
git add .
git commit -m "Initial commit: Baozi Discord bot"
git remote add origin https://github.com/YOUR_USERNAME/baozi-discord-bot.git
git push -u origin main
```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `baozi-discord-bot` repo
   - Railway auto-detects Node.js and installs dependencies

3. **Add Environment Variable:**
   - In Railway project dashboard
   - Go to "Variables" tab
   - Add variable:
     - Name: `DISCORD_TOKEN`
     - Value: (paste your Discord bot token)
   - Click "Add"

4. **Deploy:**
   - Railway automatically deploys
   - Wait ~2 minutes
   - Check "Deployments" tab for success ✅

5. **Verify:**
   - Bot should show as "Online" in Discord
   - Test with `/markets` command

**Railway Free Tier:**
- $5 monthly credit (enough for this bot)
- 512MB RAM
- Always-on deployment
- Automatic restarts

---

## Alternative: Fly.io

**Prerequisites:** Fly.io account, flyctl CLI

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
cd /root/clawd/bounties/baozi-discord-bot
flyctl launch --name baozi-discord-bot

# Set secret
flyctl secrets set DISCORD_TOKEN="your_token_here"

# Deploy
flyctl deploy
```

**Fly.io Free Tier:**
- 3 VMs with 256MB RAM each
- Sufficient for Discord bot
- Auto-scaling

---

## Alternative: Heroku

**Prerequisites:** Heroku account, Heroku CLI

```bash
# Login
heroku login

# Create app
heroku create baozi-discord-bot

# Set config
heroku config:set DISCORD_TOKEN="your_token_here"

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

**Heroku Free Tier (Eco Dynos):**
- $5/month per dyno
- Always-on
- Good uptime

---

## Alternative: VPS (DigitalOcean, Linode, Vultr)

**For full control:**

```bash
# SSH into VPS
ssh root@your-vps-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Clone repo
git clone https://github.com/YOUR_USERNAME/baozi-discord-bot.git
cd baozi-discord-bot

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add: DISCORD_TOKEN=your_token_here
# Save: Ctrl+X, Y, Enter

# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name baozi-bot

# Set PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs baozi-bot
```

**VPS Options:**
- DigitalOcean: $6/month droplet
- Vultr: $3.50/month
- Linode: $5/month

---

## Production Checklist

Before claiming bounty:

- [ ] Bot deployed and running 24/7
- [ ] Added to 2+ Discord servers
- [ ] All commands tested and working
- [ ] Embeds rendering correctly
- [ ] Daily roundup configured and tested
- [ ] Error handling working
- [ ] Logs accessible
- [ ] Health monitoring in place

---

## Testing Commands

Once deployed, test in Discord:

```
/markets
/markets category:crypto
/odds market_id:btc-120k-march
/hot
/closing
/race market_id:grammy-aoty
/portfolio wallet:SolanaWalletAddress
/setup channel:#market-updates time:09:00
```

**Expected Results:**
- All commands respond within 2 seconds
- Embeds display with proper formatting
- Progress bars render correctly
- Links are clickable
- Daily roundup posts at configured time

---

## Troubleshooting

**Bot doesn't come online:**
- Check DISCORD_TOKEN is correct
- Verify bot has "Message Content Intent" enabled
- Check deployment logs for errors

**Commands don't appear:**
- Wait 5 minutes for command registration
- Try kicking and re-inviting bot
- Check bot has "Use Application Commands" permission

**Embeds don't render:**
- Verify bot has "Embed Links" permission
- Check embed content length (max 6000 chars)

**Daily roundup not posting:**
- Verify `/setup` was run with admin permissions
- Check bot has "Send Messages" in configured channel
- Verify time format is correct (HH:MM UTC)

---

## Monitoring

### Railway Dashboard
- View logs in real-time
- Check CPU/RAM usage
- Monitor uptime
- Restart if needed

### PM2 (VPS)
```bash
pm2 status          # Check status
pm2 logs baozi-bot  # View logs
pm2 restart baozi-bot  # Restart
pm2 stop baozi-bot  # Stop
```

### Health Check Endpoint (Optional)

Add to `index.js`:
```javascript
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    botOnline: client.isReady()
  });
});

app.listen(3000, () => console.log('Health check on :3000'));
```

---

## Scaling

**If bot joins 100+ servers:**

1. **Increase Resources:**
   - Railway: Upgrade to Pro ($20/month)
   - VPS: Scale to 2GB RAM droplet

2. **Optimize Code:**
   - Cache market data (5min TTL)
   - Rate limit API calls
   - Shard Discord client (50+ guilds)

3. **Database for Config:**
   - Replace Map() with Redis/PostgreSQL
   - Persistent channel configurations

---

## Security

**Best Practices:**
- Never commit `.env` to git
- Rotate bot token if exposed
- Use environment variables for all secrets
- Keep dependencies updated
- Monitor for unusual activity

---

## Support

**Deployment Issues:**
- Railway: https://railway.app/help
- Fly.io: https://community.fly.io
- Discord.js: https://discord.js.org

**Bounty Questions:**
- GitHub issue: https://github.com/bolivian-peru/baozi-openclaw/issues/10

---

**Ready to claim bounty once bot is:**
✅ Deployed 24/7  
✅ Active in 2+ servers  
✅ All commands working  
✅ Screenshots captured  
✅ PR submitted
