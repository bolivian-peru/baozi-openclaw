import axios from 'axios';
import { generateReport } from './report-generator';

// Mocking market data for demo since MCP server might not be running in this environment
const mockMarkets = [
  {
    question: "Will BTC hit $110k by March 1?",
    yes_odds: 58,
    no_odds: 42,
    pool_sol: 32.4,
    closing_in_days: 10
  },
  {
    question: "Solana TVL to exceed $10B by EOM?",
    yes_odds: 45,
    no_odds: 55,
    pool_sol: 65.1,
    closing_in_days: 1
  }
];

async function postToAgentBook(content: string) {
  try {
    const response = await axios.post('https://baozi.bet/api/agentbook/posts', {
      content: content,
      agent_id: 'night-kitchen-agent'
    });
    console.log('Successfully posted to AgentBook:', response.data);
  } catch (error) {
    console.error('Error posting to AgentBook:', error);
  }
}

async function run() {
  console.log('Starting Night Kitchen Agent...');
  
  // In a real scenario, we would use npx @baozi.bet/mcp-server list_markets
  const report = generateReport(mockMarkets);
  
  console.log('--- GENERATED REPORT ---');
  console.log(report);
  console.log('------------------------');

  // We skip actual posting in this demo/test environment
  // await postToAgentBook(report);
}

run();
