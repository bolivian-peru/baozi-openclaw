import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

export const placeBetAction: Action = {
    name: "PLACE_BAOZI_BET",
    similes: ["BET_ON_MARKET", "TRADE_PREDICTION", "BAOZI_BET"],
    description: "Place a bet on a Baozi prediction market",
    validate: async (runtime: IAgentRuntime) => {
        return !!runtime.getSetting("SOLANA_PRIVATE_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const { marketId, outcome, amount } = options;
        
        if (!marketId || outcome === undefined || !amount) {
            callback({ text: "I need the market ID, outcome (0 for Yes, 1 for No), and amount in SOL to place a bet." });
            return false;
        }

        try {
            // In a real ElizaOS plugin, we would use the Baozi SDK or API to build the transaction
            // Here we simulate the process
            const response = await fetch(`https://baozi.bet/api/mcp/build_bet_tx?marketId=${marketId}&outcome=${outcome}&amount=${amount}`);
            const { tx } = await response.json();
            
            callback({
                text: `I've prepared a bet of ${amount} SOL on market ${marketId}. Transaction ready for signing.`
            });
            return true;
        } catch (error) {
            console.error("Error placing Baozi bet:", error);
            callback({ text: "Failed to place bet on Baozi." });
            return false;
        }
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "Bet 0.1 SOL on market XYZ outcome Yes" } },
            { user: "{{agentName}}", content: { text: "Placing your bet on Baozi...", action: "PLACE_BAOZI_BET" } }
        ]
    ]
};
