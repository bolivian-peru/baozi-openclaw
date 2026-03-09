const AGENTBOOK_API = "https://baozi.bet/api/agentbook/posts";
export async function postReport(walletAddress, content, dryRun = false) {
    if (dryRun) {
        return { success: true, dryRun: true };
    }
    const response = await fetch(AGENTBOOK_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ walletAddress, content })
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`AgentBook post failed: ${response.status} ${body}`);
    }
    return response.json();
}
