/**
 * ⚽ Competition Config
 * ─────────────────────────────────────────────
 * Change `active` to switch the competition the app runs on.
 *
 *   'premier_league'  → Premier League (for testing)
 *   'world_cup_2026'  → FIFA World Cup 2026 (June 11 – July 19 2026)
 */

export type CompetitionKey = "premier_league" | "world_cup_2026";

export interface CompetitionConfig {
  name: string;
  /** ESPN API competition slug */
  espnSlug: string;
  /** Date range for the ESPN scoreboard API (YYYYMMDD-YYYYMMDD) */
  dateRange: string;
  /** Human-readable label shown in the UI */
  label: string;
  /** Emoji flag/icon shown next to the label */
  icon: string;
}

export const COMPETITIONS: Record<CompetitionKey, CompetitionConfig> = {
  premier_league: {
    name: "Premier League",
    espnSlug: "eng.1",
    dateRange: "20260519-20260620",
    label: "פרמייר ליג",
    icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  world_cup_2026: {
    name: "FIFA World Cup 2026",
    espnSlug: "fifa.world",
    dateRange: "20260611-20260719",
    label: "מונדיאל 2026",
    icon: "🌍",
  },
};

// ─── CHANGE THIS LINE TO SWITCH COMPETITION ───────────────────────────────────
export const ACTIVE_COMPETITION: CompetitionKey = "premier_league";
// ─────────────────────────────────────────────────────────────────────────────

export const activeConfig = COMPETITIONS[ACTIVE_COMPETITION];

/** Builds the ESPN scoreboard API URL for the active competition */
export function getEspnScoreboardUrl(): string {
  const { espnSlug, dateRange } = activeConfig;
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard?dates=${dateRange}`;
}
