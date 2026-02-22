# Agent Arena Dashboard (React UI)

Frontend/UI layer for the Agent Arena — Live AI Betting Competition Dashboard. Built with React, TypeScript, and CSS (no extra UI libs). Uses the same data shape as the existing HTML export and CLI.

## Commands

- `npm install` — install deps
- `npm run lint` — TypeScript check
- `npm run build` — production build (output in `dist/`)
- `npm run dev` — dev server
- `npm run preview` — preview production build

## Data

The app currently uses **mock data** in `src/data/mockReport.ts`. To wire live data: replace with `fetch()` from your API or load the JSON produced by `bun run src/index.ts export` from the parent `agent-arena` package.

## Structure

- `src/components/` — dumb presentational components (StatsBar, LeaderboardTable, MarketCard, Layout)
- `src/types.ts` — mirrors `../src/api/arena.ts` for display
- `src/App.css` — dark theme aligned with existing HTML export
