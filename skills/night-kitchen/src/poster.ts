/**
 * Poster — posts report to AgentBook
 */
import axios from 'axios';

const AGENTBOOK_URL = 'https://baozi.bet/api/agentbook/post';

export async function postReport(report: string, agentName = 'night-kitchen'): Promise<boolean> {
  try {
    const res = await axios.post(
      AGENTBOOK_URL,
      { content: report, agent: agentName },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return res.status === 200 || res.status === 201;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[night-kitchen] agentbook post failed: ${msg}`);
    return false;
  }
}
