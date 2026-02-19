/**
 * Sports & Esports Event Source
 * 
 * Fetches upcoming events from public sports APIs and calendars
 * to generate prediction markets for matches and tournaments.
 */

import type { DetectedEvent } from '../types.js';

// =============================================================================
// ESPN API (public, no key required)
// =============================================================================

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  competitions: {
    competitors: {
      team?: { displayName: string };
      athlete?: { displayName: string };
    }[];
  }[];
}

interface ESPNResponse {
  events: ESPNEvent[];
}

const ESPN_SPORTS: { sport: string; league: string; label: string }[] = [
  { sport: 'mma', league: 'ufc', label: 'UFC' },
  { sport: 'basketball', league: 'nba', label: 'NBA' },
  { sport: 'football', league: 'nfl', label: 'NFL' },
  { sport: 'soccer', league: 'eng.1', label: 'Premier League' },
  { sport: 'hockey', league: 'nhl', label: 'NHL' },
];

async function fetchESPNEvents(): Promise<DetectedEvent[]> {
  const events: DetectedEvent[] = [];
  const now = new Date();

  for (const { sport, league, label } of ESPN_SPORTS) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        console.warn(`[SportsSource] ESPN ${label} returned ${resp.status}`);
        continue;
      }

      const data = await resp.json() as ESPNResponse;

      for (const event of (data.events || []).slice(0, 10)) {
        const eventTime = new Date(event.date);
        // Only future events (at least 2h ahead)
        if (eventTime.getTime() - now.getTime() < 2 * 60 * 60 * 1000) continue;
        // Not too far in the future (max 14 days)
        if (eventTime.getTime() - now.getTime() > 14 * 24 * 60 * 60 * 1000) continue;

        const competitors = event.competitions?.[0]?.competitors || [];
        if (competitors.length < 2) continue;

        const nameA = competitors[0]?.team?.displayName || competitors[0]?.athlete?.displayName || 'Team A';
        const nameB = competitors[1]?.team?.displayName || competitors[1]?.athlete?.displayName || 'Team B';

        // Boolean market: Will team A win?
        const question = sport === 'mma'
          ? `Will ${nameA} win at ${label}?`
          : `Will ${nameA} beat ${nameB} (${label})?`;

        if (question.length > 200) continue;

        const dateLabel = eventTime.toISOString().split('T')[0];

        events.push({
          eventId: `sports:${sport}:${league}:${event.id}:${dateLabel}`,
          title: event.name || `${nameA} vs ${nameB}`,
          source: sport === 'mma' ? 'ufc' : 'espn',
          category: 'sports',
          eventTime,
          suggestedQuestion: question,
          marketType: 'boolean',
          confidence: 0.85,
          resolutionSource: `ESPN ${label} official results`,
          metadata: {
            espnId: event.id,
            sport,
            league: label,
            competitorA: nameA,
            competitorB: nameB,
          },
        });
      }
    } catch (err) {
      console.warn(`[SportsSource] ESPN ${label} error:`, err instanceof Error ? err.message : err);
    }
  }

  return events;
}

// =============================================================================
// Esports Calendar (Liquipedia-style date tracking)
// =============================================================================

/** Upcoming major esports events (manually curated, updated periodically) */
const KNOWN_ESPORTS_EVENTS: ManualEvent[] = [
  // These are templates - the scan script will check if they're in the future
  {
    id: 'cs2-major-2026',
    title: 'CS2 Major Championship 2026',
    category: 'esports' as const,
    estimateMonth: 3, // March
    question: 'Will a European team win the CS2 Major 2026?',
    resolutionSource: 'HLTV.org CS2 Major results',
  },
  {
    id: 'valorant-champions-2026',
    title: 'Valorant Champions 2026',
    category: 'esports' as const,
    estimateMonth: 8, // August
    question: 'Will a Korean team win Valorant Champions 2026?',
    resolutionSource: 'vlr.gg Valorant Champions results',
  },
  {
    id: 'league-worlds-2026',
    title: 'League of Legends Worlds 2026',
    category: 'esports' as const,
    estimateMonth: 10, // October
    question: 'Will a Chinese team win LoL Worlds 2026?',
    resolutionSource: 'lolesports.com World Championship results',
  },
  {
    id: 'ti-2026',
    title: 'Dota 2 The International 2026',
    category: 'esports' as const,
    estimateMonth: 9, // September
    question: 'Will Team Spirit defend their TI title in 2026?',
    resolutionSource: 'liquipedia.net TI results',
  },
];

interface ManualEvent {
  id: string;
  title: string;
  category: 'esports';
  estimateMonth: number;
  question: string;
  resolutionSource: string;
}

function getEsportsEvents(): DetectedEvent[] {
  const events: DetectedEvent[] = [];
  const now = new Date();
  const year = now.getUTCFullYear();

  for (const evt of KNOWN_ESPORTS_EVENTS) {
    // Create event date from estimated month
    const eventTime = new Date(Date.UTC(year, evt.estimateMonth - 1, 15));
    // If past, try next year
    if (eventTime < now) {
      eventTime.setUTCFullYear(year + 1);
    }

    // Only if within 60 days
    const daysUntil = (eventTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntil > 60 || daysUntil < 1) continue;

    events.push({
      eventId: `esports:${evt.id}:${eventTime.getUTCFullYear()}`,
      title: evt.title,
      source: 'esports-calendar',
      category: 'esports',
      eventTime,
      suggestedQuestion: evt.question,
      marketType: 'boolean',
      confidence: 0.8,
      resolutionSource: evt.resolutionSource,
    });
  }

  return events;
}

// =============================================================================
// Public API
// =============================================================================

export async function scanSportsEvents(): Promise<DetectedEvent[]> {
  console.log('[SportsSource] Scanning ESPN events...');
  const espnEvents = await fetchESPNEvents();
  console.log(`[SportsSource] ESPN: ${espnEvents.length} events`);

  console.log('[SportsSource] Checking esports calendar...');
  const esportsEvents = getEsportsEvents();
  console.log(`[SportsSource] Esports: ${esportsEvents.length} events`);

  const all = [...espnEvents, ...esportsEvents];
  console.log(`[SportsSource] Total: ${all.length} potential markets`);
  return all;
}
