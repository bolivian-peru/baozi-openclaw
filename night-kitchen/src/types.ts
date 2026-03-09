export interface MarketOutcome {
  index: number;
  label: string;
  probability: number;
  pool: number;
}

export interface Market {
  pda: string;
  question: string;
  closingTime: string;
  pool: {
    total: number;
  };
  outcomes: MarketOutcome[];
}

export type SignalTag =
  | "patience"
  | "timing"
  | "risk"
  | "heat"
  | "profit"
  | "luck"
  | "calm";

export interface MarketSignals {
  tags: SignalTag[];
  hoursLeft: number;
  spread: number;
  totalPool: number;
  favoredLabel: string;
  favoredProbability: number;
}

export interface Proverb {
  zh: string;
  en: string;
  tags: SignalTag[];
}

export interface NightKitchenEntry {
  market: Market;
  signals: MarketSignals;
  proverb: Proverb;
  englishLine: string;
}
