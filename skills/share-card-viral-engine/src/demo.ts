// Demo script to generate share cards from real markets
import axios from 'axios';

interface Market {
  id: string;
  question: string;
  YES: number;
  NO: number;
  poolSize: number;
  endsAt: string;
  createdAt: string;
}

const AFFILIATE_CODE = 'jarvis2026';
const WALLET_ADDRESS = 'DemoWallet123';

async function generateDemoCards(): Promise<void> {
  console.log('🎴 Generating demo share cards...\n');

  try {
    // Fetch real markets from Baozi
    const response = await axios.get('https://baozi.bet/api/markets', {
      params: { limit: 10, status: 'open' }
    });
    
    const markets: Market[] = response.data.markets || [];
    console.log(`📊 Found ${markets.length} open markets\n`);

    for (const market of markets.slice(0, 5)) {
      const cardUrl = `https://baozi.bet/api/share/card?market=${market.id}&wallet=${WALLET_ADDRESS}&ref=${AFFILIATE_CODE}`;
      const marketUrl = `https://baozi.bet/market/${market.id}?ref=${AFFILIATE_CODE}`;
      
      const yesPercent = (market.YES * 100).toFixed(0);
      const noPercent = (market.NO * 100).toFixed(0);
      
      console.log(`📌 ${market.question}`);
      console.log(`   YES: ${yesPercent}% | NO: ${noPercent}% | Pool: ${market.poolSize.toFixed(1)} SOL`);
      console.log(`   🎴 Card: ${cardUrl}`);
      console.log(`   🔗 Link: ${marketUrl}`);
      console.log('');
    }

    console.log('✅ Demo cards generated!');

  } catch (error) {
    console.log('📝 Using mock data for demo');
    
    // Mock data
    const mockMarkets = [
      {
        id: 'demo-1',
        question: 'Will BTC hit $110k by March 31, 2026?',
        YES: 0.62,
        NO: 0.38,
        poolSize: 45.2
      },
      {
        id: 'demo-2', 
        question: 'Will ETH hit $5k by Q2 2026?',
        YES: 0.55,
        NO: 0.45,
        poolSize: 28.7
      },
      {
        id: 'demo-3',
        question: 'Will GPT-5 be announced by April 2026?',
        YES: 0.48,
        NO: 0.52,
        poolSize: 15.3
      }
    ];

    for (const market of mockMarkets) {
      const cardUrl = `https://baozi.bet/api/share/card?market=${market.id}&wallet=${WALLET_ADDRESS}&ref=${AFFILIATE_CODE}`;
      const marketUrl = `https://baozi.bet/market/${market.id}?ref=${AFFILIATE_CODE}`;
      
      const yesPercent = (market.YES * 100).toFixed(0);
      const noPercent = (market.NO * 100).toFixed(0);
      
      console.log(`📌 ${market.question}`);
      console.log(`   YES: ${yesPercent}% | NO: ${noPercent}% | Pool: ${market.poolSize.toFixed(1)} SOL`);
      console.log(`   🎴 Card: ${cardUrl}`);
      console.log(`   🔗 Link: ${marketUrl}`);
      console.log('');
    }

    console.log('✅ Demo cards generated (mock)!');
  }
}

generateDemoCards().catch(console.error);
