/**
 * BAOZI PARIMUTUEL MARKET RULES v7.2
 *
 * STRICT ENFORCEMENT - All Lab markets MUST comply with these rules.
 * AI agents creating markets through MCP MUST validate against these rules.
 * Markets that don't comply will be BLOCKED from creation.
 *
 * v7.2 TWO ALLOWED TYPES:
 * Type A: Scheduled Event — outcome revealed at one moment. Betting closes 24h before.
 * Type B: Measurement Period — data collected over defined period. Betting closes BEFORE period starts.
 *
 * BANNED:
 * - Price predictions (observable continuously)
 * - Open-window deadline markets (event observable instantly when it happens)
 * - Subjective/unverifiable outcomes
 * - Manipulable outcomes
 */
export declare const PARIMUTUEL_RULES: {
    version: string;
    /**
     * TYPE A: Scheduled Event Markets
     * Outcome revealed at one specific moment (fight end, ceremony, announcement).
     * Betting closes 24h+ before the event.
     */
    TYPE_A: {
        name: string;
        minBufferHours: number;
        requirement: string;
        rationale: string;
    };
    /**
     * TYPE B: Measurement-Period Markets
     * Data collected over a defined period (chart tracking week, opening weekend, etc.).
     * Betting closes BEFORE the measurement period starts.
     */
    TYPE_B: {
        name: string;
        requirement: string;
        rationale: string;
    };
    /**
     * HARD BAN 1: Price Prediction Markets
     */
    PRICE_BAN: {
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * HARD BAN 2: Real-Time Observable Measurement Markets
     * Note: Measurement-period markets ARE allowed if betting closes BEFORE measurement starts.
     * This ban is for measurements where data is observable in real-time (tweet counts, stream hours, etc.)
     */
    REALTIME_MEASUREMENT_BAN: {
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * HARD BAN 3: Open-Window Deadline Markets
     *
     * Markets where the event can happen at ANY time within a window
     * and is INSTANTLY OBSERVABLE when it happens.
     *
     * WHY THIS FAILS:
     * "Will Drake drop an album before March 1?"
     * - Drake drops album Feb 14. Everyone sees it on Spotify instantly.
     * - Betting still open. Pool floods to YES. Winners get 1.02x.
     * - Market is dead. This is NOT what pari-mutuel is for.
     */
    OPEN_WINDOW_BAN: {
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * HARD BAN 4: Subjective / Unverifiable Outcomes
     */
    SUBJECTIVE_OUTCOME: {
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * HARD BAN 5: Manipulable Outcomes
     */
    MANIPULATION_RISK: {
        name: string;
        requirement: string;
        rationale: string;
        blockedPatterns: string[];
    };
    /**
     * HARD BAN 6: Unverifiable
     */
    UNVERIFIABLE: {
        name: string;
        blockedPatterns: string[];
    };
    /**
     * APPROVED DATA SOURCES (v7.2)
     */
    APPROVED_SOURCES: {
        esports: string[];
        mma_boxing: string[];
        sports: string[];
        awards: string[];
        politics: string[];
        entertainment: string[];
        weather: string[];
        tech: string[];
        finance: string[];
        reality_tv: string[];
    };
};
export interface ParimutuelValidationResult {
    valid: boolean;
    blocked: boolean;
    errors: string[];
    warnings: string[];
    ruleViolations: {
        rule: string;
        description: string;
        severity: 'CRITICAL' | 'ERROR' | 'WARNING';
    }[];
    rulesChecked: string[];
}
/**
 * Validate market against parimutuel rules v7.2
 * Returns BLOCKED=true if market violates mandatory rules
 */
export declare function validateParimutuelRules(params: {
    question: string;
    closingTime: Date;
    scheduledMoment?: Date;
    marketType?: 'event' | 'measurement';
    eventTime?: Date;
    measurementStart?: Date;
    layer: 'official' | 'lab' | 'private';
}): ParimutuelValidationResult;
export declare const PARIMUTUEL_RULES_DOCUMENTATION = "\n# BAOZI PARIMUTUEL MARKET RULES v7.2\n\n## STRICT ENFORCEMENT - VIOLATIONS BLOCK MARKET CREATION\n\n### TWO ALLOWED MARKET TYPES\n\n**Type A: Scheduled Event** \u2014 Outcome revealed at one moment (fight end, ceremony, announcement).\nRule: betting closes 24h+ BEFORE the event.\n\n**Type B: Measurement Period** \u2014 Data collected over defined period (chart week, opening weekend).\nRule: betting closes BEFORE the measurement period starts.\n\n### BANNED (No Exceptions)\n\n1. **Price Predictions** \u2014 Prices are continuous and observable. Pool mirrors what everyone sees.\n   BLOCKED: \"price above\", \"price below\", \"trading above\", \"market cap above\", etc.\n\n2. **Open-Window Deadline Markets** \u2014 Event can happen anytime, instantly observable.\n   BLOCKED: \"before [date]\" (when event is instantly observable), \"resign before\",\n   \"release before\", \"tweet about before\", \"IPO before\", etc.\n   WHY: \"Will Drake drop album before March 1?\" \u2014 drops Feb 14, everyone sees it, pool floods, dead.\n\n3. **Real-Time Observable Measurements** \u2014 Tweet counts, stream hours, follower counts.\n   BLOCKED: \"tweet count\", \"how many tweets\", \"stream hours\", \"follower count\", etc.\n   NOTE: Defined-period measurements (Billboard chart week, box office weekend) ARE allowed\n   if betting closes before the period starts.\n\n4. **Subjective/Unverifiable** \u2014 BLOCKED: \"go viral\", \"be successful\", \"will I\", etc.\n\n5. **Manipulable** \u2014 BLOCKED: \"will someone\", \"will anyone\", \"purchase proxies\", etc.\n\n### WHAT WORKS\n\nTYPE A (Scheduled Events):\n- Sports/MMA: \"Will [fighter] win UFC 315?\" (fight ends at scheduled time)\n- Esports: \"Who wins CS2 Grand Final?\" (match ends at scheduled time)\n- Awards: \"Who wins Best Picture?\" (announced at ceremony)\n- Government: \"Will Fed cut rates at FOMC?\" (announced at 2 PM ET)\n- Weather: \"Will it snow in NYC on Feb 28?\" (daily summary after date)\n- Reality TV: \"Who eliminated on Survivor?\" (episode airs at scheduled time)\n\nTYPE B (Measurement Periods):\n- Charts: \"Billboard Hot 100 #1?\" (tracking Fri-Thu, bet closes before Friday)\n- Charts: \"Netflix Top 10 #1?\" (tracking Mon-Sun, bet closes before Monday)\n- Box Office: \"Opening weekend #1?\" (Fri-Sun, bet closes before Friday)\n- Album: \"Will [album] debut #1?\" (first week sales, bet closes before release)\n- Economic: \"BLS unemployment rate?\" (measures past month, published first Friday)\n\n### RACE MARKETS (2-10 outcomes) \u2014 PREFERRED FORMAT\n\nMore outcomes = more spread = better underdog payouts.\nBest for: awards, charts, eliminations, tournaments, FOMC decisions.\n\n### APPROVED DATA SOURCES\n\nESPORTS: HLTV.org, lolesports.com, Liquipedia, vlr.gg\nSPORTS: ESPN, UFC.com, NFL.com, NBA.com, MLB.com, FIA\nAWARDS: Academy Awards, Recording Academy, The Game Awards, Eurovision\nGOVERNMENT: Federal Reserve, Congress.gov, AP News, Reuters\nCHARTS: Billboard.com, Netflix Top 10, Box Office Mojo\nWEATHER: NOAA, NWS (weather.gov), NHC\nTECH: Apple.com/newsroom, official press releases\n\n### QUICK TESTS\n\nType A: \"Is there a scheduled event when the answer is revealed?\" YES -> Proceed\nType B: \"Is there a defined measurement period, and does betting close before it starts?\" YES -> Proceed\nOpen-Window: \"If this happened tomorrow at 3 AM, would everyone instantly know?\" YES -> BLOCKED\n";
/**
 * Get rules summary for AI agents
 */
export declare function getParimutuelRulesSummary(): string;
