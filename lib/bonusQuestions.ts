export type BonusQuestionType =
  | "red_card"
  | "penalty_goal"
  | "three_yellows"
  | "both_teams_yellow"
  | "own_goal"
  | "double_yellow_red"
  | "four_plus_yellows"
  | "penalty_or_red"
  | "defender_scores"
  | "player_scores";

export interface BonusQuestion {
  type: BonusQuestionType;
  text: string;
  points: number;
  tag: string;
  /** English player name for ESPN matching — only set when type === "player_scores" */
  playerName?: string;
}

// ─── Static question pool (used when no star player is in the match) ──────────
export const BONUS_QUESTION_POOL: BonusQuestion[] = [
  { type: "red_card",          text: "האם יוצא לפחות כרטיס אדום אחד במשחק?",                  points: 1, tag: "🟥"   },
  { type: "penalty_goal",      text: "האם יבוצע שער מפנדל?",                                    points: 1, tag: "🎯"   },
  { type: "three_yellows",     text: "האם יוצגו לפחות 3 כרטיסים צהובים?",                       points: 1, tag: "🟨"   },
  { type: "both_teams_yellow", text: "האם שתי הקבוצות יקבלו לפחות כרטיס צהוב אחד?",            points: 1, tag: "⚠️"   },
  { type: "own_goal",          text: "האם יהיה שער עצמי במשחק?",                                points: 1, tag: "🤦"   },
  { type: "double_yellow_red", text: "האם שחקן כלשהו יגורש בשל שני כרטיסים צהובים?",           points: 1, tag: "🟡🟥" },
  { type: "four_plus_yellows", text: "האם יחולקו לפחות 4 כרטיסים צהובים במשחק?",               points: 1, tag: "🟨🟨" },
  { type: "penalty_or_red",    text: "האם יהיה לפחות אירוע דרמטי אחד — פנדל או כרטיס אדום?", points: 1, tag: "⚡"   },
  { type: "defender_scores",   text: "האם מגן יבקיע במשחק?",                                   points: 1, tag: "🛡️"  },
];

// ─── World Cup 2026 star players — keyed by ESPN team display name ─────────────
interface StarPlayer { hebrewName: string; displayName: string }

export const WORLD_CUP_STAR_PLAYERS: Record<string, StarPlayer> = {
  "Argentina":     { hebrewName: "מסי",       displayName: "Lionel Messi"       },
  "France":        { hebrewName: "מבאפה",      displayName: "Kylian Mbappe"      },
  "Portugal":      { hebrewName: "רונאלדו",    displayName: "Cristiano Ronaldo"  },
  "Norway":        { hebrewName: "הולאנד",     displayName: "Erling Haaland"     },
  "England":       { hebrewName: "קיין",       displayName: "Harry Kane"         },
  "Brazil":        { hebrewName: "ויניציוס",   displayName: "Vinicius Jr."       },
  "Uruguay":       { hebrewName: "ולוורדה",    displayName: "Federico Valverde"  },
  "Spain":         { hebrewName: "יאמאל",      displayName: "Lamine Yamal"       },
  "United States": { hebrewName: "פוליסיץ׳",  displayName: "Christian Pulisic"  },
  "USA":           { hebrewName: "פוליסיץ׳",  displayName: "Christian Pulisic"  },
  "Turkey":        { hebrewName: "ילדיז",      displayName: "Kenan Yildiz"       },
  "Türkiye":       { hebrewName: "ילדיז",      displayName: "Kenan Yildiz"       },
  "Germany":       { hebrewName: "הברץ",       displayName: "Kai Havertz"        },
  "Egypt":         { hebrewName: "סאלח",       displayName: "Mohamed Salah"      },
  "Sweden":        { hebrewName: "איסאק",      displayName: "Alexander Isak"     },
  "Netherlands":   { hebrewName: "גאקפו",      displayName: "Cody Gakpo"         },
  "Belgium":       { hebrewName: "דוקו",       displayName: "Jeremy Doku"        },
  "Senegal":       { hebrewName: "מאנה",       displayName: "Sadio Mane"         },
};

/**
 * Returns the bonus question for a match.
 * Player-score questions are mixed into the pool as 3 extra virtual slots (~25% of picks).
 * When a player slot is selected but neither team has a mapped star player, falls back
 * to a regular pool question. All selections are deterministic per matchId.
 */
export function getBonusQuestion(
  matchId: string,
  homeTeam?: string,
  awayTeam?: string,
): BonusQuestion {
  const hash = matchId
    .split("")
    .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

  // Virtual pool: 9 static slots + 3 player slots = 12 total → ~25% player questions
  const PLAYER_SLOTS = 3;
  const idx = hash % (BONUS_QUESTION_POOL.length + PLAYER_SLOTS);

  if (idx >= BONUS_QUESTION_POOL.length) {
    // Player question slot — use it if a star player is available for this match
    const candidates: StarPlayer[] = [];
    for (const team of [homeTeam, awayTeam]) {
      if (team && WORLD_CUP_STAR_PLAYERS[team]) candidates.push(WORLD_CUP_STAR_PLAYERS[team]);
    }
    if (candidates.length > 0) {
      const player = candidates[hash % candidates.length];
      return {
        type: "player_scores",
        text: `האם ${player.hebrewName} יבקיע במשחק?`,
        points: 1,
        tag: "⭐",
        playerName: player.displayName,
      };
    }
    // No star player for this match → fall back to a regular pool question
    return BONUS_QUESTION_POOL[hash % BONUS_QUESTION_POOL.length];
  }

  return BONUS_QUESTION_POOL[idx];
}

// ─── ESPN detail type ──────────────────────────────────────────────────────────
export interface ESPNDetail {
  type?: { id?: string; text?: string; abbreviation?: string };
  athletesInvolved?: {
    id?: string;
    displayName?: string;
    position?: { name?: string; abbreviation?: string };
  }[];
  team?: { id?: string };
  clock?: { value?: number };
}

// Strips accents and lowercases for resilient name matching
function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Checks whether an ESPN athlete display name refers to the same person as our
// stored target name. Applies to ALL player_scores questions (every player in the
// star-player map). Uses three strategies so edge cases like "Vinicius Jr." vs
// "Vinicius Junior", "K. Havertz" vs "Kai Havertz", or accented "Vinícius" all match.
function playerNameMatches(espnRaw: string, targetRaw: string): boolean {
  const espn   = normalize(espnRaw);
  const target = normalize(targetRaw);
  // 1. One name fully contains the other
  if (espn.includes(target) || target.includes(espn)) return true;
  // 2. Word-level: any significant word (≥4 chars, not a common suffix) from the
  //    target appears inside the ESPN name — catches "Havertz", "Isak", "Vinicius"
  const SUFFIXES = new Set(["jr.", "jr", "junior", "senior", "sr.", "sr"]);
  const words = target.split(/\s+/).filter(w => w.length >= 4 && !SUFFIXES.has(w));
  return words.some(w => espn.includes(w));
}

/**
 * Detect the yes/no answer for a bonus question from ESPN match data.
 * Returns null when detection is impossible (missing ESPN data).
 */
export function detectBonusAnswer(
  bonusQ: BonusQuestion,
  _homeScore: number,
  _awayScore: number,
  details: ESPNDetail[]
): boolean | null {
  switch (bonusQ.type) {

    case "red_card": {
      if (!details.length) return null;
      const RED_IDS = new Set(["86", "93", "200"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const id   = d.type?.id ?? "";
        return abbr === "RC" || abbr === "YRC" || abbr === "RY" ||
          text.includes("red card") || text.includes("sending off") || text.includes("dismissed") ||
          RED_IDS.has(id);
      });
    }

    case "penalty_goal": {
      if (!details.length) return null;
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "PG" || (text.includes("penalty") && text.includes("goal"));
      });
    }

    case "three_yellows": {
      if (!details.length) return null;
      const count = details.filter((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "YC" || text === "yellow card";
      }).length;
      return count >= 3;
    }

    case "both_teams_yellow": {
      if (!details.length) return null;
      const teamsWithYellow = new Set<string>();
      for (const d of details) {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        if ((abbr === "YC" || text === "yellow card") && d.team?.id) {
          teamsWithYellow.add(d.team.id);
        }
      }
      return teamsWithYellow.size >= 2;
    }

    case "own_goal": {
      if (!details.length) return null;
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "OG" || text.includes("own goal");
      });
    }

    case "double_yellow_red": {
      if (!details.length) return null;
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "YRC" || abbr === "RY" || text.includes("second yellow") || text.includes("yellow red");
      });
    }

    case "four_plus_yellows": {
      if (!details.length) return null;
      const count = details.filter((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "YC" || text === "yellow card";
      }).length;
      return count >= 4;
    }

    case "penalty_or_red": {
      if (!details.length) return null;
      const RED_IDS = new Set(["86", "93", "200"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const id   = d.type?.id ?? "";
        return abbr === "PG" || (text.includes("penalty") && text.includes("goal")) ||
          abbr === "RC" || abbr === "YRC" || abbr === "RY" ||
          text.includes("red card") || text.includes("sending off") || RED_IDS.has(id);
      });
    }

    case "defender_scores": {
      if (!details.length) return null;
      const GOAL_ABBRS = new Set(["G", "PG"]);
      const goalEvents = details.filter((d) =>
        GOAL_ABBRS.has(d.type?.abbreviation?.toUpperCase() ?? "")
      );
      if (!goalEvents.length) return false;

      const DEFENDER_TERMS = ["defender", "back", "cb", "lb", "rb", "df", "centre back", "center back", "full back", "fullback"];
      let hasPositionData = false;

      for (const goal of goalEvents) {
        for (const athlete of (goal.athletesInvolved ?? [])) {
          const posName = (athlete.position?.name ?? "").toLowerCase();
          const posAbbr = (athlete.position?.abbreviation ?? "").toLowerCase();
          if (posName || posAbbr) hasPositionData = true;
          if (DEFENDER_TERMS.some((t) => posName.includes(t)) || posAbbr === "df" || posAbbr === "d") {
            return true;
          }
        }
      }
      // If ESPN provided position data but no defender scored → false. If no position data → null.
      return hasPositionData ? false : null;
    }

    case "player_scores": {
      if (!details.length || !bonusQ.playerName) return null;
      const GOAL_ABBRS = new Set(["G", "PG"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        // Accept ESPN abbreviation OR text fallback (e.g. "Goal Scored", "goal")
        const isGoal = GOAL_ABBRS.has(abbr) ||
          (text.includes("goal") && !text.includes("own goal") && !text.includes("no goal"));
        if (!isGoal) return false;
        return (d.athletesInvolved ?? []).some((a) =>
          playerNameMatches(a.displayName ?? "", bonusQ.playerName!)
        );
      });
    }

    default:
      return null;
  }
}
