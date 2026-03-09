/**
 * MCP Resource Definitions for Baozi Markets
 * V2.0.0 - Mainnet + Extended Resources
 *
 * Resources provide read-only data that can be fetched by URI.
 */
import { listMarkets } from './handlers/markets.js';
import { getPositionsSummary } from './handlers/positions.js';
import { PROGRAM_ID, FEES, BET_LIMITS, TIMING, MARKET_STATUS_NAMES, MARKET_LAYER_NAMES, IS_MAINNET, NETWORK, } from './config.js';
// =============================================================================
// V6.2 MARKET RULES DOCUMENT
// =============================================================================
const MARKET_RULES_V6_2 = `
# Baozi Market Creation Rules (v6.3)

## Overview
Markets must follow timing rules to ensure fair betting and accurate resolution.

## Rule A: Event-Based Markets
For markets based on a single point-in-time event (e.g., "Will X win the election?"):

1. **Betting Close Buffer**: Betting must close AT LEAST 12 hours before the event
2. **Recommended Buffer**: 18-24 hours provides safety margin for timezone issues
3. **Resolution**: After event occurs, market is resolved based on outcome

### Example (Rule A)
- Event: "Super Bowl kickoff at 2025-02-09 18:30:00 UTC"
- Question: "Will the Chiefs win Super Bowl LIX?"
- Recommended betting close: 2025-02-08 18:30:00 UTC (24h before)
- Latest acceptable close: 2025-02-09 06:30:00 UTC (12h before)

## Rule B: Measurement-Period Markets
For markets based on outcomes over a time period (e.g., "Will BTC reach $100k in January?"):

1. **CRITICAL**: Betting must close BEFORE measurement period starts
2. **No Overlap**: Zero tolerance for betting during measurement period
3. **Information Advantage**: Allowing bets during measurement enables unfair advantage
4. **Period Length**: Prefer 2-7 days for optimal user experience

### Example (Rule B)
- Question: "Will ETH be above $4000 on Feb 1st 2025?"
- Measurement period: Feb 1st 00:00 - 23:59 UTC
- Betting must close: Before Feb 1st 00:00 UTC
- Recommended close: Jan 31st 22:00 UTC (2h buffer)

## Common Timing Mistakes

### INVALID Configurations:
- Betting closes AFTER event starts (Rule A violation)
- Betting overlaps with measurement period (Rule B violation)
- Buffer < 12 hours for event markets (too risky)

### WARNING Configurations:
- Buffer 12-18 hours (acceptable but tight)
- Measurement period > 7 days (poor UX)
- Very short buffer < 2 hours for measurement (risk of late bets)

## Validation Endpoint
Use the \`validate_market_params\` tool to check your market parameters before creation.
`;
// =============================================================================
// MARKET TEMPLATES
// =============================================================================
const EVENT_MARKET_TEMPLATE = {
    type: 'event',
    description: 'Template for event-based prediction markets (single point in time)',
    example: {
        question: 'Will [Team A] win the [Event Name]?',
        closing_time: 'YYYY-MM-DDTHH:MM:SSZ (24 hours before event)',
        event_time: 'YYYY-MM-DDTHH:MM:SSZ (when event occurs)',
        market_type: 'event',
        layer: 'Lab',
    },
    rules: [
        'Question must be answerable with YES or NO',
        'Event time must be after closing time',
        'Minimum 12 hour buffer between close and event',
        'Question max 200 characters',
    ],
    examples: [
        'Will the Chiefs win Super Bowl LIX?',
        'Will Bitcoin reach $100,000 before March 2025?',
        'Will SpaceX successfully launch Starship on [date]?',
    ],
};
const MEASUREMENT_MARKET_TEMPLATE = {
    type: 'measurement',
    description: 'Template for measurement-period prediction markets (outcome over time range)',
    example: {
        question: 'Will [Metric] be above [Value] on [Date]?',
        closing_time: 'YYYY-MM-DDTHH:MM:SSZ (before measurement starts)',
        measurement_start: 'YYYY-MM-DDTHH:MM:SSZ (when measurement period begins)',
        measurement_end: 'YYYY-MM-DDTHH:MM:SSZ (when measurement period ends)',
        market_type: 'measurement',
        layer: 'Lab',
    },
    rules: [
        'Betting MUST close before measurement period starts',
        'Measurement period should be well-defined',
        'Prefer 2-7 day periods for optimal UX',
        'Data source for resolution must be clear',
    ],
    examples: [
        'Will ETH be above $4000 on Feb 1st 2025?',
        'Will US inflation be below 3% in January 2025?',
        'Will AAPL close above $200 on earnings day?',
    ],
};
// =============================================================================
// RESOURCE DEFINITIONS
// =============================================================================
export const RESOURCES = [
    {
        uri: 'baozi://markets/open',
        name: 'Open Markets',
        description: 'List of currently open prediction markets accepting bets on Solana mainnet',
        mimeType: 'application/json',
    },
    {
        uri: 'baozi://markets/all',
        name: 'All Markets',
        description: 'List of all prediction markets (open, closed, resolved) on Solana mainnet',
        mimeType: 'application/json',
    },
    {
        uri: 'baozi://config',
        name: 'Program Config',
        description: 'Baozi V4.7.6 program configuration, fees, and limits',
        mimeType: 'application/json',
    },
    {
        uri: 'baozi://rules',
        name: 'Market Rules v6.3',
        description: 'Documentation of market timing rules and validation requirements',
        mimeType: 'text/markdown',
    },
    {
        uri: 'baozi://templates/event',
        name: 'Event Market Template',
        description: 'Template for creating event-based prediction markets',
        mimeType: 'application/json',
    },
    {
        uri: 'baozi://templates/measurement',
        name: 'Measurement Market Template',
        description: 'Template for creating measurement-period prediction markets',
        mimeType: 'application/json',
    },
];
// =============================================================================
// RESOURCE HANDLERS
// =============================================================================
export async function handleResource(uri) {
    try {
        // Handle portfolio requests with wallet parameter
        if (uri.startsWith('baozi://portfolio/')) {
            const wallet = uri.replace('baozi://portfolio/', '');
            const summary = await getPositionsSummary(wallet);
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({
                            type: 'portfolio',
                            network: NETWORK,
                            ...summary,
                            fetchedAt: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        switch (uri) {
            case 'baozi://markets/open': {
                const markets = await listMarkets('Active');
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                type: 'open_markets',
                                network: NETWORK,
                                programId: PROGRAM_ID.toBase58(),
                                count: markets.length,
                                markets: markets.map(m => ({
                                    publicKey: m.publicKey,
                                    marketId: m.marketId,
                                    question: m.question,
                                    layer: m.layer,
                                    yesPercent: m.yesPercent,
                                    noPercent: m.noPercent,
                                    totalPoolSol: m.totalPoolSol,
                                    closingTime: m.closingTime,
                                    isBettingOpen: m.isBettingOpen,
                                })),
                                fetchedAt: new Date().toISOString(),
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'baozi://markets/all': {
                const markets = await listMarkets();
                const byStatus = {};
                const byLayer = {};
                for (const m of markets) {
                    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
                    byLayer[m.layer] = (byLayer[m.layer] || 0) + 1;
                }
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                type: 'all_markets',
                                network: NETWORK,
                                programId: PROGRAM_ID.toBase58(),
                                count: markets.length,
                                byStatus,
                                byLayer,
                                markets: markets.map(m => ({
                                    publicKey: m.publicKey,
                                    marketId: m.marketId,
                                    question: m.question,
                                    status: m.status,
                                    layer: m.layer,
                                    winningOutcome: m.winningOutcome,
                                    totalPoolSol: m.totalPoolSol,
                                })),
                                fetchedAt: new Date().toISOString(),
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'baozi://config': {
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                type: 'program_config',
                                program: {
                                    id: PROGRAM_ID.toBase58(),
                                    network: NETWORK,
                                    version: '4.7.6',
                                    isMainnet: IS_MAINNET,
                                },
                                fees: {
                                    official: {
                                        platformFeeBps: FEES.OFFICIAL_PLATFORM_FEE_BPS,
                                        platformFeePercent: `${FEES.OFFICIAL_PLATFORM_FEE_BPS / 100}%`,
                                        creationFeeSol: FEES.OFFICIAL_CREATION_FEE / 1e9,
                                    },
                                    lab: {
                                        platformFeeBps: FEES.LAB_PLATFORM_FEE_BPS,
                                        platformFeePercent: `${FEES.LAB_PLATFORM_FEE_BPS / 100}%`,
                                        creationFeeSol: FEES.LAB_CREATION_FEE / 1e9,
                                    },
                                    private: {
                                        platformFeeBps: FEES.PRIVATE_PLATFORM_FEE_BPS,
                                        platformFeePercent: `${FEES.PRIVATE_PLATFORM_FEE_BPS / 100}%`,
                                        creationFeeSol: FEES.PRIVATE_CREATION_FEE / 1e9,
                                    },
                                    affiliateFeeBps: FEES.AFFILIATE_FEE_BPS,
                                    creatorFeeBps: FEES.CREATOR_FEE_BPS,
                                },
                                limits: {
                                    minBetSol: BET_LIMITS.MIN_BET_SOL,
                                    maxBetSol: BET_LIMITS.MAX_BET_SOL,
                                },
                                timing: {
                                    bettingFreezeSeconds: TIMING.BETTING_FREEZE_SECONDS,
                                    minEventBufferHours: TIMING.MIN_EVENT_BUFFER_HOURS,
                                    recommendedEventBufferHours: TIMING.RECOMMENDED_EVENT_BUFFER_HOURS,
                                    disputeWindowSeconds: TIMING.DISPUTE_WINDOW_SECONDS,
                                },
                                marketStatuses: MARKET_STATUS_NAMES,
                                marketLayers: MARKET_LAYER_NAMES,
                                links: {
                                    website: 'https://baozi.bet',
                                    api: 'https://baozi.bet/api/v4',
                                    explorer: `https://solscan.io/account/${PROGRAM_ID.toBase58()}${IS_MAINNET ? '' : '?cluster=devnet'}`,
                                },
                                fetchedAt: new Date().toISOString(),
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'baozi://rules': {
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'text/markdown',
                            text: MARKET_RULES_V6_2,
                        },
                    ],
                };
            }
            case 'baozi://templates/event': {
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(EVENT_MARKET_TEMPLATE, null, 2),
                        },
                    ],
                };
            }
            case 'baozi://templates/measurement': {
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(MEASUREMENT_MARKET_TEMPLATE, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jlc291cmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7R0FLRztBQUNILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQ0wsVUFBVSxFQUNWLElBQUksRUFDSixVQUFVLEVBQ1YsTUFBTSxFQUNOLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLE9BQU8sR0FDUixNQUFNLGFBQWEsQ0FBQztBQUVyQixnRkFBZ0Y7QUFDaEYsNkJBQTZCO0FBQzdCLGdGQUFnRjtBQUVoRixNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQStDekIsQ0FBQztBQUVGLGdGQUFnRjtBQUNoRixtQkFBbUI7QUFDbkIsZ0ZBQWdGO0FBRWhGLE1BQU0scUJBQXFCLEdBQUc7SUFDNUIsSUFBSSxFQUFFLE9BQU87SUFDYixXQUFXLEVBQUUsb0VBQW9FO0lBQ2pGLE9BQU8sRUFBRTtRQUNQLFFBQVEsRUFBRSxxQ0FBcUM7UUFDL0MsWUFBWSxFQUFFLDhDQUE4QztRQUM1RCxVQUFVLEVBQUUsMENBQTBDO1FBQ3RELFdBQVcsRUFBRSxPQUFPO1FBQ3BCLEtBQUssRUFBRSxLQUFLO0tBQ2I7SUFDRCxLQUFLLEVBQUU7UUFDTCw0Q0FBNEM7UUFDNUMsdUNBQXVDO1FBQ3ZDLGdEQUFnRDtRQUNoRCw2QkFBNkI7S0FDOUI7SUFDRCxRQUFRLEVBQUU7UUFDUixxQ0FBcUM7UUFDckMsZ0RBQWdEO1FBQ2hELHFEQUFxRDtLQUN0RDtDQUNGLENBQUM7QUFFRixNQUFNLDJCQUEyQixHQUFHO0lBQ2xDLElBQUksRUFBRSxhQUFhO0lBQ25CLFdBQVcsRUFBRSw4RUFBOEU7SUFDM0YsT0FBTyxF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Q0FBQyxxQkFBcUIsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNQ1AgUmVzb3VyY2UgRGVmaW5pdGlvbnMgZm9yIEJhb3ppIE1hcmtldHNcbiAqIFYyLjAuMCAtIE1haW5uZXQgKyBFeHRlbmRlZCBSZXNvdXJjZXNcbiAqXG4gKiBSZXNvdXJjZXMgcHJvdmlkZSByZWFkLW9ubHkgZGF0YSB0aGF0IGNhbiBiZSBmZXRjaGVkIGJ5IFVSSS5cbiAqL1xuaW1wb3J0IHsgbGlzdE1hcmtldHMgfSBmcm9tICcuL2hhbmRsZXJzL21hcmtldHMuanMnO1xuaW1wb3J0IHsgZ2V0UG9zaXRpb25zU3VtbWFyeSB9IGZyb20gJy4vaGFuZGxlcnMvcG9zaXRpb25zLmpzJztcbmltcG9ydCB7XG4gIFBST0dSQU1fSUQsXG4gIEZFRVMsXG4gIEJFVF9MSU1JVFMsXG4gIFRJTUlORyxcbiAgTUFSS0VUX1NUQVRVU19OQU1FUyxcbiAgTUFSS0VUX0xBWUVSX05BTUVTLFxuICBJU19NQUlOTkVULFxuICBORVRXT1JLLFxufSBmcm9tICcuL2NvbmZpZy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBWNi4yIE1BUktFVCBSVUxFUyBET0NVTUVOVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgTUFSS0VUX1JVTEVTX1Y2XzIgPSBgXG4jIEJhb3ppIE1hcmtldCBDcmVhdGlvbiBSdWxlcyAodjYuMylcblxuIyMgT3ZlcnZpZXdcbk1hcmtldHMgbXVzdCBmb2xsb3cgdGltaW5nIHJ1bGVzIHRvIGVuc3VyZSBmYWlyIGJldHRpbmcgYW5kIGFjY3VyYXRlIHJlc29sdXRpb24uXG5cbiMjIFJ1bGUgQTogRXZlbnQtQmFzZWQgTWFya2V0c1xuRm9yIG1hcmtldHMgYmFzZWQgb24gYSBzaW5nbGUgcG9pbnQtaW4tdGltZSBldmVudCAoZS5nLiwgXCJXaWxsIFggd2luIHRoZSBlbGVjdGlvbj9cIik6XG5cbjEuICoqQmV0dGluZyBDbG9zZSBCdWZmZXIqKjogQmV0dGluZyBtdXN0IGNsb3NlIEFUIExFQVNUIDEyIGhvdXJzIGJlZm9yZSB0aGUgZXZlbnRcbjIuICoqUmVjb21tZW5kZWQgQnVmZmVyKio6IDE4LTI0IGhvdXJzIHByb3ZpZGVzIHNhZmV0eSBtYXJnaW4gZm9yIHRpbWV6b25lIGlzc3Vlc1xuMy4gKipSZXNvbHV0aW9uKio6IEFmdGVyIGV2ZW50IG9jY3VycywgbWFya2V0IGlzIHJlc29sdmVkIGJhc2VkIG9uIG91dGNvbWVcblxuIyMjIEV4YW1wbGUgKFJ1bGUgQSlcbi0gRXZlbnQ6IFwiU3VwZXIgQm93bCBraWNrb2ZmIGF0IDIwMjUtMDItMDkgMTg6MzA6MDAgVVRDXCJcbi0gUXVlc3Rpb246IFwiV2lsbCB0aGUgQ2hpZWZzIHdpbiBTdXBlciBCb3dsIExJWD9cIlxuLSBSZWNvbW1lbmRlZCBiZXR0aW5nIGNsb3NlOiAyMDI1LTAyLTA4IDE4OjMwOjAwIFVUQyAoMjRoIGJlZm9yZSlcbi0gTGF0ZXN0IGFjY2VwdGFibGUgY2xvc2U6IDIwMjUtMDItMDkgMDY6MzA6MDAgVVRDICgxMmggYmVmb3JlKVxuXG4jIyBSdWxlIEI6IE1lYXN1cmVtZW50LVBlcmlvZCBNYXJrZXRzXG5Gb3IgbWFya2V0cyBiYXNlZCBvbiBvdXRjb21lcyBvdmVyIGEgdGltZSBwZXJpb2QgKGUuZy4sIFwiV2lsbCBCVEMgcmVhY2ggJDEwMGsgaW4gSmFudWFyeT9cIik6XG5cbjEuICoqQ1JJVElDQUwqKjogQmV0dGluZyBtdXN0IGNsb3NlIEJFRk9SRSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzXG4yLiAqKk5vIE92ZXJsYXAqKjogWmVybyB0b2xlcmFuY2UgZm9yIGJldHRpbmcgZHVyaW5nIG1lYXN1cmVtZW50IHBlcmlvZFxuMy4gKipJbmZvcm1hdGlvbiBBZHZhbnRhZ2UqKjogQWxsb3dpbmcgYmV0cyBkdXJpbmcgbWVhc3VyZW1lbnQgZW5hYmxlcyB1bmZhaXIgYWR2YW50YWdlXG40LiAqKlBlcmlvZCBMZW5ndGgqKjogUHJlZmVyIDItNyBkYXlzIGZvciBvcHRpbWFsIHVzZXIgZXhwZXJpZW5jZVxuXG4jIyMgRXhhbXBsZSAoUnVsZSBCKVxuLSBRdWVzdGlvbjogXCJXaWxsIEVUSCBiZSBhYm92ZSAkNDAwMCBvbiBGZWIgMXN0IDIwMjU/XCJcbi0gTWVhc3VyZW1lbnQgcGVyaW9kOiBGZWIgMXN0IDAwOjAwIC0gMjM6NTkgVVRDXG4tIEJldHRpbmcgbXVzdCBjbG9zZTogQmVmb3JlIEZlYiAxc3QgMDA6MDAgVVRDXG4tIFJlY29tbWVuZGVkIGNsb3NlOiBKYW4gMzFzdCAyMjowMCBVVEMgKDJoIGJ1ZmZlcilcblxuIyMgQ29tbW9uIFRpbWluZyBNaXN0YWtlc1xuXG4jIyMgSU5WQUxJRCBDb25maWd1cmF0aW9uczpcbi0gQmV0dGluZyBjbG9zZXMgQUZURVIgZXZlbnQgc3RhcnRzIChSdWxlIEEgdmlvbGF0aW9uKVxuLSBCZXR0aW5nIG92ZXJsYXBzIHdpdGggbWVhc3VyZW1lbnQgcGVyaW9kIChSdWxlIEIgdmlvbGF0aW9uKVxuLSBCdWZmZXIgPCAxMiBob3VycyBmb3IgZXZlbnQgbWFya2V0cyAodG9vIHJpc2t5KVxuXG4jIyMgV0FSTklORyBDb25maWd1cmF0aW9uczpcbi0gQnVmZmVyIDEyLTE4IGhvdXJzIChhY2NlcHRhYmxlIGJ1dCB0aWdodClcbi0gTWVhc3VyZW1lbnQgcGVyaW9kID4gNyBkYXlzIChwb29yIFVYKVxuLSBWZXJ5IHNob3J0IGJ1ZmZlciA8IDIgaG91cnMgZm9yIG1lYXN1cmVtZW50IChyaXNrIG9mIGxhdGUgYmV0cylcblxuIyMgVmFsaWRhdGlvbiBFbmRwb2ludFxuVXNlIHRoZSBcXGB2YWxpZGF0ZV9tYXJrZXRfcGFyYW1zXFxgIHRvb2wgdG8gY2hlY2sgeW91ciBtYXJrZXQgcGFyYW1ldGVycyBiZWZvcmUgY3JlYXRpb24uXG5gO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTUFSS0VUIFRFTVBMQVRFU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgRVZFTlRfTUFSS0VUX1RFTVBMQVRFID0ge1xuICB0eXBlOiAnZXZlbnQnLFxuICBkZXNjcmlwdGlvbjogJ1RlbXBsYXRlIGZvciBldmVudC1iYXNlZCBwcmVkaWN0aW9uIG1hcmtldHMgKHNpbmdsZSBwb2ludCBpbiB0aW1lKScsXG4gIGV4YW1wbGU6IHtcbiAgICBxdWVzdGlvbjogJ1dpbGwgW1RlYW0gQV0gd2luIHRoZSBbRXZlbnQgTmFtZV0/JyxcbiAgICBjbG9zaW5nX3RpbWU6ICdZWVlZLU1NLUREVEhIOk1NOlNTWiAoMjQgaG91cnMgYmVmb3JlIGV2ZW50KScsXG4gICAgZXZlbnRfdGltZTogJ1lZWVktTU0tRERUSEg6TU06U1NaICh3aGVuIGV2ZW50IG9jY3VycyknLFxuICAgIG1hcmtldF90eXBlOiAnZXZlbnQnLFxuICAgIGxheWVyOiAnTGFiJyxcbiAgfSxcbiAgcnVsZXM6IFtcbiAgICAnUXVlc3Rpb24gbXVzdCBiZSBhbnN3ZXJhYmxlIHdpdGggWUVTIG9yIE5PJyxcbiAgICAnRXZlbnQgdGltZSBtdXN0IGJlIGFmdGVyIGNsb3NpbmcgdGltZScsXG4gICAgJ01pbmltdW0gMTIgaG91ciBidWZmZXIgYmV0d2VlbiBjbG9zZSBhbmQgZXZlbnQnLFxuICAgICdRdWVzdGlvbiBtYXggMjAwIGNoYXJhY3RlcnMnLFxuICBdLFxuICBleGFtcGxlczogW1xuICAgICdXaWxsIHRoZSBDaGllZnMgd2luIFN1cGVyIEJvd2wgTElYPycsXG4gICAgJ1dpbGwgQml0Y29pbiByZWFjaCAkMTAwLDAwMCBiZWZvcmUgTWFyY2ggMjAyNT8nLFxuICAgICdXaWxsIFNwYWNlWCBzdWNjZXNzZnVsbHkgbGF1bmNoIFN0YXJzaGlwIG9uIFtkYXRlXT8nLFxuICBdLFxufTtcblxuY29uc3QgTUVBU1VSRU1FTlRfTUFSS0VUX1RFTVBMQVRFID0ge1xuICB0eXBlOiAnbWVhc3VyZW1lbnQnLFxuICBkZXNjcmlwdGlvbjogJ1RlbXBsYXRlIGZvciBtZWFzdXJlbWVudC1wZXJpb2QgcHJlZGljdGlvbiBtYXJrZXRzIChvdXRjb21lIG92ZXIgdGltZSByYW5nZSknLFxuICBleGFtcGxlOiB7XG4gICAgcXVlc3Rpb246ICdXaWxsIFtNZXRyaWNdIGJlIGFib3ZlIFtWYWx1ZV0gb24gW0RhdGVdPycsXG4gICAgY2xvc2luZ190aW1lOiAnWVlZWS1NTS1ERFRISDpNTTpTU1ogKGJlZm9yZSBtZWFzdXJlbWVudCBzdGFydHMpJyxcbiAgICBtZWFzdXJlbWVudF9zdGFydDogJ1lZWVktTU0tRERUSEg6TU06U1NaICh3aGVuIG1lYXN1cmVtZW50IHBlcmlvZCBiZWdpbnMpJyxcbiAgICBtZWFzdXJlbWVudF9lbmQ6ICdZWVlZLU1NLUREVEhIOk1NOlNTWiAod2hlbiBtZWFzdXJlbWVudCBwZXJpb2QgZW5kcyknLFxuICAgIG1hcmtldF90eXBlOiAnbWVhc3VyZW1lbnQnLFxuICAgIGxheWVyOiAnTGFiJyxcbiAgfSxcbiAgcnVsZXM6IFtcbiAgICAnQmV0dGluZyBNVVNUIGNsb3NlIGJlZm9yZSBtZWFzdXJlbWVudCBwZXJpb2Qgc3RhcnRzJyxcbiAgICAnTWVhc3VyZW1lbnQgcGVyaW9kIHNob3VsZCBiZSB3ZWxsLWRlZmluZWQnLFxuICAgICdQcmVmZXIgMi03IGRheSBwZXJpb2RzIGZvciBvcHRpbWFsIFVYJyxcbiAgICAnRGF0YSBzb3VyY2UgZm9yIHJlc29sdXRpb24gbXVzdCBiZSBjbGVhcicsXG4gIF0sXG4gIGV4YW1wbGVzOiBbXG4gICAgJ1dpbGwgRVRIIGJlIGFib3ZlICQ0MDAwIG9uIEZlYiAxc3QgMjAyNT8nLFxuICAgICdXaWxsIFVTIGluZmxhdGlvbiBiZSBiZWxvdyAzJSBpbiBKYW51YXJ5IDIwMjU/JyxcbiAgICAnV2lsbCBBQVBMIGNsb3NlIGFib3ZlICQyMDAgb24gZWFybmluZ3MgZGF5PycsXG4gIF0sXG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUkVTT1VSQ0UgREVGSU5JVElPTlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjb25zdCBSRVNPVVJDRVMgPSBbXG4gIHtcbiAgICB1cmk6ICdiYW96aTovL21hcmtldHMvb3BlbicsXG4gICAgbmFtZTogJ09wZW4gTWFya2V0cycsXG4gICAgZGVzY3JpcHRpb246ICdMaXN0IG9mIGN1cnJlbnRseSBvcGVuIHByZWRpY3Rpb24gbWFya2V0cyBhY2NlcHRpbmcgYmV0cyBvbiBTb2xhbmEgbWFpbm5ldCcsXG4gICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgfSxcbiAge1xuICAgIHVyaTogJ2Jhb3ppOi8vbWFya2V0cy9hbGwnLFxuICAgIG5hbWU6ICdBbGwgTWFya2V0cycsXG4gICAgZGVzY3JpcHRpb246ICdMaXN0IG9mIGFsbCBwcmVkaWN0aW9uIG1hcmtldHMgKG9wZW4sIGNsb3NlZCwgcmVzb2x2ZWQpIG9uIFNvbGFuYSBtYWlubmV0JyxcbiAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICB9LFxuICB7XG4gICAgdXJpOiAnYmFvemk6Ly9jb25maWcnLFxuICAgIG5hbWU6ICdQcm9ncmFtIENvbmZpZycsXG4gICAgZGVzY3JpcHRpb246ICdCYW96aSBWNC43LjYgcHJvZ3JhbSBjb25maWd1cmF0aW9uLCBmZWVzLCBhbmQgbGltaXRzJyxcbiAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICB9LFxuICB7XG4gICAgdXJpOiAnYmFvemk6Ly9ydWxlcycsXG4gICAgbmFtZTogJ01hcmtldCBSdWxlcyB2Ni4zJyxcbiAgICBkZXNjcmlwdGlvbjogJ0RvY3VtZW50YXRpb24gb2YgbWFya2V0IHRpbWluZyBydWxlcyBhbmQgdmFsaWRhdGlvbiByZXF1aXJlbWVudHMnLFxuICAgIG1pbWVUeXBlOiAndGV4dC9tYXJrZG93bicsXG4gIH0sXG4gIHtcbiAgICB1cmk6ICdiYW96aTovL3RlbXBsYXRlcy9ldmVudCcsXG4gICAgbmFtZTogJ0V2ZW50IE1hcmtldCBUZW1wbGF0ZScsXG4gICAgZGVzY3JpcHRpb246ICdUZW1wbGF0ZSBmb3IgY3JlYXRpbmcgZXZlbnQtYmFzZWQgcHJlZGljdGlvbiBtYXJrZXRzJyxcbiAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICB9LFxuICB7XG4gICAgdXJpOiAnYmFvemk6Ly90ZW1wbGF0ZXMvbWVhc3VyZW1lbnQnLFxuICAgIG5hbWU6ICdNZWFzdXJlbWVudCBNYXJrZXQgVGVtcGxhdGUnLFxuICAgIGRlc2NyaXB0aW9uOiAnVGVtcGxhdGUgZm9yIGNyZWF0aW5nIG1lYXN1cmVtZW50LXBlcmlvZCBwcmVkaWN0aW9uIG1hcmtldHMnLFxuICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gIH0sXG5dO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUkVTT1VSQ0UgSEFORExFUlNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVSZXNvdXJjZSh1cmk6IHN0cmluZyk6IFByb21pc2U8e1xuICBjb250ZW50czogQXJyYXk8eyB1cmk6IHN0cmluZzsgbWltZVR5cGU6IHN0cmluZzsgdGV4dDogc3RyaW5nIH0+O1xufT4ge1xuICB0cnkge1xuICAgIC8vIEhhbmRsZSBwb3J0Zm9saW8gcmVxdWVzdHMgd2l0aCB3YWxsZXQgcGFyYW1ldGVyXG4gICAgaWYgKHVyaS5zdGFydHNXaXRoKCdiYW96aTovL3BvcnRmb2xpby8nKSkge1xuICAgICAgY29uc3Qgd2FsbGV0ID0gdXJpLnJlcGxhY2UoJ2Jhb3ppOi8vcG9ydGZvbGlvLycsICcnKTtcbiAgICAgIGNvbnN0IHN1bW1hcnkgPSBhd2FpdCBnZXRQb3NpdGlvbnNTdW1tYXJ5KHdhbGxldCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVyaSxcbiAgICAgICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIHR5cGU6ICdwb3J0Zm9saW8nLFxuICAgICAgICAgICAgICBuZXR3b3JrOiBORVRXT1JLLFxuICAgICAgICAgICAgICAuLi5zdW1tYXJ5LFxuICAgICAgICAgICAgICBmZXRjaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIH0sIG51bGwsIDIpLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIHN3aXRjaCAodXJpKSB7XG4gICAgICBjYXNlICdiYW96aTovL21hcmtldHMvb3Blbic6IHtcbiAgICAgICAgY29uc3QgbWFya2V0cyA9IGF3YWl0IGxpc3RNYXJrZXRzKCdBY3RpdmUnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb250ZW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmksXG4gICAgICAgICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnb3Blbl9tYXJrZXRzJyxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiBORVRXT1JLLFxuICAgICAgICAgICAgICAgIHByb2dyYW1JZDogUFJPR1JBTV9JRC50b0Jhc2U1OCgpLFxuICAgICAgICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBtYXJrZXRzOiBtYXJrZXRzLm1hcChtID0+ICh7XG4gICAgICAgICAgICAgICAgICBwdWJsaWNLZXk6IG0ucHVibGljS2V5LFxuICAgICAgICAgICAgICAgICAgbWFya2V0SWQ6IG0ubWFya2V0SWQsXG4gICAgICAgICAgICAgICAgICBxdWVzdGlvbjogbS5xdWVzdGlvbixcbiAgICAgICAgICAgICAgICAgIGxheWVyOiBtLmxheWVyLFxuICAgICAgICAgICAgICAgICAgeWVzUGVyY2VudDogbS55ZXNQZXJjZW50LFxuICAgICAgICAgICAgICAgICAgbm9QZXJjZW50OiBtLm5vUGVyY2VudCxcbiAgICAgICAgICAgICAgICAgIHRvdGFsUG9vbFNvbDogbS50b3RhbFBvb2xTb2wsXG4gICAgICAgICAgICAgICAgICBjbG9zaW5nVGltZTogbS5jbG9zaW5nVGltZSxcbiAgICAgICAgICAgICAgICAgIGlzQmV0dGluZ09wZW46IG0uaXNCZXR0aW5nT3BlbixcbiAgICAgICAgICAgICAgICB9KSksXG4gICAgICAgICAgICAgICAgZmV0Y2hlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgIH0sIG51bGwsIDIpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlICdiYW96aTovL21hcmtldHMvYWxsJzoge1xuICAgICAgICBjb25zdCBtYXJrZXRzID0gYXdhaXQgbGlzdE1hcmtldHMoKTtcbiAgICAgICAgY29uc3QgYnlTdGF0dXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcbiAgICAgICAgY29uc3QgYnlMYXllcjogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuXG4gICAgICAgIGZvciAoY29uc3QgbSBvZiBtYXJrZXRzKSB7XG4gICAgICAgICAgYnlTdGF0dXNbbS5zdGF0dXNdID0gKGJ5U3RhdHVzW20uc3RhdHVzXSB8fCAwKSArIDE7XG4gICAgICAgICAgYnlMYXllclttLmxheWVyXSA9IChieUxheWVyW20ubGF5ZXJdIHx8IDApICsgMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY29udGVudHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJpLFxuICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2FsbF9tYXJrZXRzJyxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiBORVRXT1JLLFxuICAgICAgICAgICAgICAgIHByb2dyYW1JZDogUFJPR1JBTV9JRC50b0Jhc2U1OCgpLFxuICAgICAgICAgICAgICAgIGNvdW50OiBtYXJrZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBieVN0YXR1cyxcbiAgICAgICAgICAgICAgICBieUxheWVyLFxuICAgICAgICAgICAgICAgIG1hcmtldHM6IG1hcmtldHMubWFwKG0gPT4gKHtcbiAgICAgICAgICAgICAgICAgIHB1YmxpY0tleTogbS5wdWJsaWNLZXksXG4gICAgICAgICAgICAgICAgICBtYXJrZXRJZDogbS5tYXJrZXRJZCxcbiAgICAgICAgICAgICAgICAgIHF1ZXN0aW9uOiBtLnF1ZXN0aW9uLFxuICAgICAgICAgICAgICAgICAgc3RhdHVzOiBtLnN0YXR1cyxcbiAgICAgICAgICAgICAgICAgIGxheWVyOiBtLmxheWVyLFxuICAgICAgICAgICAgICAgICAgd2lubmluZ091dGNvbWU6IG0ud2lubmluZ091dGNvbWUsXG4gICAgICAgICAgICAgICAgICB0b3RhbFBvb2xTb2w6IG0udG90YWxQb29sU29sLFxuICAgICAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgICAgICBmZXRjaGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgfSwgbnVsbCwgMiksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2Jhb3ppOi8vY29uZmlnJzoge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvbnRlbnRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVyaSxcbiAgICAgICAgICAgICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwcm9ncmFtX2NvbmZpZycsXG4gICAgICAgICAgICAgICAgcHJvZ3JhbToge1xuICAgICAgICAgICAgICAgICAgaWQ6IFBST0dSQU1fSUQudG9CYXNlNTgoKSxcbiAgICAgICAgICAgICAgICAgIG5ldHdvcms6IE5FVFdPUkssXG4gICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnNC43LjYnLFxuICAgICAgICAgICAgICAgICAgaXNNYWlubmV0OiBJU19NQUlOTkVULFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZmVlczoge1xuICAgICAgICAgICAgICAgICAgb2ZmaWNpYWw6IHtcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1GZWVCcHM6IEZFRVMuT0ZGSUNJQUxfUExBVEZPUk1fRkVFX0JQUyxcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1GZWVQZXJjZW50OiBgJHtGRUVTLk9GRklDSUFMX1BMQVRGT1JNX0ZFRV9CUFMgLyAxMDB9JWAsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0aW9uRmVlU29sOiBGRUVTLk9GRklDSUFMX0NSRUFUSU9OX0ZFRSAvIDFlOSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBsYWI6IHtcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1GZWVCcHM6IEZFRVMuTEFCX1BMQVRGT1JNX0ZFRV9CUFMsXG4gICAgICAgICAgICAgICAgICAgIHBsYXRmb3JtRmVlUGVyY2VudDogYCR7RkVFUy5MQUJfUExBVEZPUk1fRkVFX0JQUyAvIDEwMH0lYCxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25GZWVTb2w6IEZFRVMuTEFCX0NSRUFUSU9OX0ZFRSAvIDFlOSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICAgICAgICAgIHBsYXRmb3JtRmVlQnBzOiBGRUVTLlBSSVZBVEVfUExBVEZPUk1fRkVFX0JQUyxcbiAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm1GZWVQZXJjZW50OiBgJHtGRUVTLlBSSVZBVEVfUExBVEZPUk1fRkVFX0JQUyAvIDEwMH0lYCxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25GZWVTb2w6IEZFRVMuUFJJVkFURV9DUkVBVElPTl9GRUUgLyAxZTksXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgYWZmaWxpYXRlRmVlQnBzOiBGRUVTLkFGRklMSUFURV9GRUVfQlBTLFxuICAgICAgICAgICAgICAgICAgY3JlYXRvckZlZUJwczogRkVFUy5DUkVBVE9SX0ZFRV9CUFMsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsaW1pdHM6IHtcbiAgICAgICAgICAgICAgICAgIG1pbkJldFNvbDogQkVUX0xJTUlUUy5NSU5fQkVUX1NPTCxcbiAgICAgICAgICAgICAgICAgIG1heEJldFNvbDogQkVUX0xJTUlUUy5NQVhfQkVUX1NPTCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRpbWluZzoge1xuICAgICAgICAgICAgICAgICAgYmV0dGluZ0ZyZWV6ZVNlY29uZHM6IFRJTUlORy5CRVRUSU5HX0ZSRUVaRV9TRUNPTkRTLFxuICAgICAgICAgICAgICAgICAgbWluRXZlbnRCdWZmZXJIb3VyczogVElNSU5HLk1JTl9FVkVOVF9CVUZGRVJfSE9VUlMsXG4gICAgICAgICAgICAgICAgICByZWNvbW1lbmRlZEV2ZW50QnVmZmVySG91cnM6IFRJTUlORy5SRUNPTU1FTkRFRF9FVkVOVF9CVUZGRVJfSE9VUlMsXG4gICAgICAgICAgICAgICAgICBkaXNwdXRlV2luZG93U2Vjb25kczogVElNSU5HLkRJU1BVVEVfV0lORE9XX1NFQ09ORFMsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtYXJrZXRTdGF0dXNlczogTUFSS0VUX1NUQVRVU19OQU1FUyxcbiAgICAgICAgICAgICAgICBtYXJrZXRMYXllcnM6IE1BUktFVF9MQVlFUl9OQU1FUyxcbiAgICAgICAgICAgICAgICBsaW5rczoge1xuICAgICAgICAgICAgICAgICAgd2Vic2l0ZTogJ2h0dHBzOi8vYmFvemkuYmV0JyxcbiAgICAgICAgICAgICAgICAgIGFwaTogJ2h0dHBzOi8vYmFvemkuYmV0L2FwaS92NCcsXG4gICAgICAgICAgICAgICAgICBleHBsb3JlcjogYGh0dHBzOi8vc29sc2Nhbi5pby9hY2NvdW50LyR7UFJPR1JBTV9JRC50b0Jhc2U1OCgpfSR7SVNfTUFJTk5FVCA/ICcnIDogJz9jbHVzdGVyPWRldm5ldCd9YCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZldGNoZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICB9LCBudWxsLCAyKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnYmFvemk6Ly9ydWxlcyc6IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb250ZW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmksXG4gICAgICAgICAgICAgIG1pbWVUeXBlOiAndGV4dC9tYXJrZG93bicsXG4gICAgICAgICAgICAgIHRleHQ6IE1BUktFVF9SVUxFU19WNl8yLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlICdiYW96aTovL3RlbXBsYXRlcy9ldmVudCc6IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjb250ZW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmksXG4gICAgICAgICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KEVWRU5UX01BUktFVF9URU1QTEFURSwgbnVsbCwgMiksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNhc2UgJ2Jhb3ppOi8vdGVtcGxhdGVzL21lYXN1cmVtZW50Jzoge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvbnRlbnRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVyaSxcbiAgICAgICAgICAgICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoTUVBU1VSRU1FTlRfTUFSS0VUX1RFTVBMQVRFLCBudWxsLCAyKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHJlc291cmNlOiAke3VyaX1gKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiJdfQ==