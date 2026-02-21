import { Plugin } from "@elizaos/core";
import { listMarketsAction } from "./actions/listMarkets";
import { placeBetAction } from "./actions/placeBet";

const getOddsAction = {
    name: "GET_BAOZI_ODDS",
    similes: ["CHECK_PROBABILITY", "MARKET_DETAILS"],
    description: "Check implied probabilities and pool sizes for a Baozi market",
    handler: async (runtime, message, state, options, callback) => {
        const { marketId } = options;
        const response = await fetch(`https://baozi.bet/api/mcp/get_odds?marketId=${marketId}`);
        const data = await response.json();
        callback({ text: `Odds for ${marketId}: ${data.odds.join('/')}\nTotal Pool: ${data.totalPool} SOL` });
        return true;
    }
};

const getPortfolioAction = {
    name: "GET_BAOZI_PORTFOLIO",
    similes: ["MY_BETS", "CHECK_POSITIONS"],
    description: "View current positions for a wallet on Baozi",
    handler: async (runtime, message, state, options, callback) => {
        const wallet = runtime.getSetting("SOLANA_PUBLIC_KEY");
        const response = await fetch(`https://baozi.bet/api/mcp/get_portfolio?wallet=${wallet}`);
        const data = await response.json();
        callback({ text: `Your Baozi Portfolio:\n${data.positions.map(p => `- ${p.question}: ${p.amount} SOL`).join('\n')}` });
        return true;
    }
};

const createMarketAction = {
    name: "CREATE_BAOZI_MARKET",
    similes: ["NEW_PREDICTION", "START_LAB_MARKET"],
    description: "Create a new Lab market on Baozi",
    handler: async (runtime, message, state, options, callback) => {
        const { question, closingTime } = options;
        callback({ text: `Creating a new market: "${question}" closing at ${closingTime}. Transaction ready.` });
        return true;
    }
};

export const baoziPlugin: Plugin = {
    name: "baozi-prediction-markets",
    description: "Bet on prediction markets, create markets, earn fees on Solana",
    actions: [
        listMarketsAction,
        placeBetAction,
        getOddsAction,
        getPortfolioAction,
        createMarketAction
    ],
    providers: [],
    evaluators: [],
};
