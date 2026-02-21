import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

export const listMarketsAction: Action = {
    name: "LIST_BAOZI_MARKETS",
    similes: ["QUERY_MARKETS", "SEARCH_PREDICTION_MARKETS", "BROWSE_BAOZI"],
    description: "List active prediction markets from Baozi.bet on Solana",
    validate: async (runtime: IAgentRuntime) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            const response = await fetch("https://baozi.bet/api/mcp/list_markets?status=active&layer=official");
            const data = await response.json();
            
            const markets = data.markets.slice(0, 5).map(m => 
                `ID: ${m.id}\nQuestion: ${m.question}\nOdds: ${m.odds.join('/')}\nClosing: ${m.closingTime}`
            ).join("\n\n");
            
            callback({
                text: `Here are the top active markets on Baozi:\n\n${markets}`
            });
            return true;
        } catch (error) {
            console.error("Error fetching Baozi markets:", error);
            callback({ text: "Failed to fetch markets from Baozi." });
            return false;
        }
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "What can I bet on today?" } },
            { user: "{{agentName}}", content: { text: "Searching Baozi for active markets...", action: "LIST_BAOZI_MARKETS" } }
        ]
    ]
};
