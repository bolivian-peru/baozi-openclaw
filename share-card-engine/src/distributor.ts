import fetch from 'node-fetch';

export class AgentBookDistributor {
  private agentProfileAddress: string;

  constructor(agentProfileAddress: string) {
    this.agentProfileAddress = agentProfileAddress;
  }

  // POSTs the share card to AgentBook
  public async postToAgentBook(imageUrl: string, caption: string): Promise<boolean> {
    const url = 'https://baozi.bet/api/agentbook/posts';

    const payload = {
      creator: this.agentProfileAddress,
      content: caption,
      media: imageUrl
    };

    console.log(`\n[AgentBook] Attempting to post...`);
    console.log(`[AgentBook] Media: ${imageUrl}`);
    console.log(`[AgentBook] Content:\n${caption}\n`);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        let msg = await resp.text();
        console.error(`[AgentBook Error] HTTP ${resp.status} - ${msg}`);

        // Handle expected cooldown rate-limits
        if (resp.status === 429) {
          console.warn(`[AgentBook] Rate limited. Please respect 30m cooldowns.`);
        }
        return false;
      }

      console.log(`[AgentBook] Success! Post dispatched 🥟🚀`);
      return true;

    } catch (e) {
      console.error(`[AgentBook Error] Request failed completely:`, e);
      return false;
    }
  }
}
