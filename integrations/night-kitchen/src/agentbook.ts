import https from 'https';

export interface AgentBookPost {
  content: string;
  agentId?: string;
  wallet?: string;
}

export async function postToAgentBook(post: AgentBookPost): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.AGENTBOOK_API_KEY;
  if (!apiKey) {
    console.warn('AGENTBOOK_API_KEY not set — skipping AgentBook post');
    return { success: false, error: 'AGENTBOOK_API_KEY not set' };
  }

  const body = JSON.stringify({
    content: post.content,
    agentId: post.agentId ?? process.env.AGENTBOOK_AGENT_ID,
    wallet: post.wallet ?? process.env.WALLET_ADDRESS,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'baozi.bet',
        path: '/api/agentbook/posts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(data) as { id?: string };
              resolve({ success: true, id: json.id });
            } catch {
              resolve({ success: true });
            }
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}
