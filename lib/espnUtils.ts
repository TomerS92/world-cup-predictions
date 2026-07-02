import { activeConfig } from "./config";

export interface RegulationResult {
  homeScore: number;     // 90-min regulation score (used for scoring)
  awayScore: number;
  fullHomeScore: number; // full final score (includes ET goals, not penalties)
  fullAwayScore: number;
  extraTime: boolean;
  penalties: boolean;
}

/**
 * Returns the 90-minute regulation score for a completed match.
 * For matches that ended in normal time, the full score equals the regulation score.
 * For ET/penalty matches, fetches the ESPN summary endpoint and sums periods 1+2.
 */
export async function getRegulationScore(
  matchId: string,
  statusDescription: string,
  fullHomeScore: number,
  fullAwayScore: number,
): Promise<RegulationResult> {
  const desc = statusDescription.toLowerCase();
  const isExtraTime = desc.includes("extra time") || desc.includes("after extra") || desc.includes("penalt");
  const isPenalties = desc.includes("penalt");

  if (!isExtraTime) {
    return {
      homeScore: fullHomeScore, awayScore: fullAwayScore,
      fullHomeScore, fullAwayScore,
      extraTime: false, penalties: false,
    };
  }

  try {
    const { espnSlug } = activeConfig;
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/summary?event=${matchId}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const comp = data?.header?.competitions?.[0];
    if (!comp) throw new Error("no comp");

    const homeC = comp.competitors?.find((c: any) => c.homeAway === "home");
    const awayC = comp.competitors?.find((c: any) => c.homeAway === "away");
    const hLS: any[] = homeC?.linescores ?? [];
    const aLS: any[] = awayC?.linescores ?? [];

    // Period 1 = first half, Period 2 = second half → sum = 90-min score
    if (hLS.length >= 2 && aLS.length >= 2) {
      const parse = (ls: any) => parseInt(ls.displayValue ?? ls.value ?? "0", 10);
      const regHome = parse(hLS[0]) + parse(hLS[1]);
      const regAway = parse(aLS[0]) + parse(aLS[1]);
      return {
        homeScore: regHome, awayScore: regAway,
        fullHomeScore, fullAwayScore,
        extraTime: true, penalties: isPenalties,
      };
    }
  } catch {
    // Fall through to return full score as fallback
  }

  // Fallback: can't get per-period breakdown — return full score
  return {
    homeScore: fullHomeScore, awayScore: fullAwayScore,
    fullHomeScore, fullAwayScore,
    extraTime: true, penalties: isPenalties,
  };
}
