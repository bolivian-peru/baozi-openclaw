/**
 * MCP Client — direct handler imports from @baozi.bet/mcp-server
 */
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";

export { listMarkets, getMarket, listRaceMarkets, getRaceMarket, getRaceQuote, getQuote };

export interface MarketData {
  publicKey: string;
  question: string;
  status: string;
  layer: string;
  closingTime: string;
  createdAt: string;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  category?: string;
  creator?: string;
}

export interface RaceOutcome {
  index: number;
  label: string;
  poolSol: number;
  percent: number;
}

export interface RaceMarketData {
  publicKey: string;
  question: string;
  status: string;
  layer: string;
  closingTime: string;
  totalPoolSol: number;
  outcomes: RaceOutcome[];
}
