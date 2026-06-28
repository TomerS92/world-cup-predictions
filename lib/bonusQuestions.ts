export type BonusQuestionType =
  // ── Legacy types (group stage) — kept for Firestore backward compatibility ──
  | "red_card"
  | "penalty_goal"
  | "three_yellows"
  | "both_teams_yellow"
  | "own_goal"
  | "double_yellow_red"
  | "four_plus_yellows"
  | "penalty_or_red"
  | "two_plus_yellows"
  | "defender_scores"
  // ── Active types ─────────────────────────────────────────────────────────────
  | "player_scores"      // star-player question (auto-detected via ESPN)
  | "first_scorer_wins"  // team that scored first wins (admin answers)
  | "late_goal"          // a goal after minute 80 (admin answers)
  | "var_decision"       // VAR overturns at least one decision (admin answers)
  | "goal_first_30"      // first goal before minute 30 (admin answers)
  | "penalty_attempt"    // at least one penalty kick attempt (admin answers)
  | "substitute_scores"  // a substitute scores a goal (admin answers)
  | "player_brace"       // any player scores 2+ goals (admin answers)
  | "five_subs";         // 5+ substitutions across both teams (admin answers)

export interface BonusQuestion {
  type: BonusQuestionType;
  text: string;
  points: number;
  tag: string;
  /** English player name for ESPN matching — only set when type === "player_scores" */
  playerName?: string;
}

// ─── Static question pool — Round of 32+ creative questions ──────────────────
// Pool size MUST remain 9 so that hash % 12 virtual slots stay consistent.
// Order matters: the slot index each match lands on is fixed by its ESPN match ID.
export const BONUS_QUESTION_POOL: BonusQuestion[] = [
  { type: "first_scorer_wins", text: "האם הקבוצה שתבקיע ראשונה תנצח בסופו של דבר?",                  points: 1, tag: "🏆"  }, // slot 0
  { type: "late_goal",         text: "האם יהיה לפחות שער אחד לאחר הדקה ה-80?",                        points: 1, tag: "🕐"  }, // slot 1
  { type: "red_card",          text: "האם יוצא לפחות כרטיס אדום אחד במשחק?",                          points: 1, tag: "🟥"  }, // slot 2
  { type: "var_decision",      text: "האם ה-VAR ישנה לפחות החלטה אחת במשחק?",                         points: 1, tag: "📺"  }, // slot 3
  { type: "goal_first_30",     text: "האם השער הראשון של המשחק ייכנס לפני הדקה ה-30?",               points: 1, tag: "⏱️"  }, // slot 4
  { type: "penalty_attempt",   text: "האם יהיה לפחות ניסיון פנדל אחד בזמן המשחק (כולל מפספסים)?",   points: 1, tag: "🥅"  }, // slot 5
  { type: "substitute_scores", text: "האם שחקן שנכנס כחילוף יבקיע שער?",                             points: 1, tag: "🔁"  }, // slot 6
  { type: "player_brace",      text: "האם שחקן כלשהו יבקיע שני שערים לפחות במשחק?",                  points: 1, tag: "🎯"  }, // slot 7
  { type: "five_subs",         text: "האם יבוצעו 5 החלפות שחקנים לפחות (בסך שתי הקבוצות)?",         points: 1, tag: "🔄"  }, // slot 8
];

// ─── World Cup 2026 star players — keyed by ESPN team display name ─────────────
interface StarPlayer { hebrewName: string; displayName: string }

export const WORLD_CUP_STAR_PLAYERS: Record<string, StarPlayer> = {
  // Group stage
  "Argentina":          { hebrewName: "מסי",        displayName: "Lionel Messi"        },
  "France":             { hebrewName: "מבאפה",       displayName: "Kylian Mbappe"       },
  "Portugal":           { hebrewName: "רונאלדו",     displayName: "Cristiano Ronaldo"   },
  "Norway":             { hebrewName: "הולאנד",      displayName: "Erling Haaland"      },
  "England":            { hebrewName: "קיין",        displayName: "Harry Kane"          },
  "Brazil":             { hebrewName: "ויניציוס",    displayName: "Vinicius Jr."        },
  "Uruguay":            { hebrewName: "ולוורדה",     displayName: "Federico Valverde"   },
  "Spain":              { hebrewName: "יאמאל",       displayName: "Lamine Yamal"        },
  "United States":      { hebrewName: "פוליסיץ׳",   displayName: "Christian Pulisic"   },
  "USA":                { hebrewName: "פוליסיץ׳",   displayName: "Christian Pulisic"   },
  "Turkey":             { hebrewName: "ילדיז",       displayName: "Kenan Yildiz"        },
  "Türkiye":            { hebrewName: "ילדיז",       displayName: "Kenan Yildiz"        },
  "Germany":            { hebrewName: "הברץ",        displayName: "Kai Havertz"         },
  "Egypt":              { hebrewName: "סאלח",        displayName: "Mohamed Salah"       },
  "Sweden":             { hebrewName: "איסאק",       displayName: "Alexander Isak"      },
  "Netherlands":        { hebrewName: "גאקפו",       displayName: "Cody Gakpo"          },
  "Belgium":            { hebrewName: "דוקו",        displayName: "Jeremy Doku"         },
  "Senegal":            { hebrewName: "מאנה",        displayName: "Sadio Mane"          },
  // R32 additions
  "Croatia":            { hebrewName: "מודריץ׳",    displayName: "Luka Modric"         },
  "Morocco":            { hebrewName: "חכימי",       displayName: "Achraf Hakimi"       },
  "Colombia":           { hebrewName: "לואיס דיאס", displayName: "Luis Diaz"           },
  "Canada":             { hebrewName: "דייויס",      displayName: "Alphonso Davies"     },
};

/**
 * Returns the bonus question for a match.
 *
 * Hash strategy: ESPN match IDs are always integers. Using the raw integer as the
 * hash distributes consecutive IDs evenly across all pool slots (no clustering).
 * Non-numeric IDs (e.g. test leagues) fall back to the old character-sum hash.
 *
 * Virtual pool: 9 static slots + 3 player slots = 12 total → ~25% player questions.
 */
export function getBonusQuestion(
  matchId: string,
  homeTeam?: string,
  awayTeam?: string,
): BonusQuestion {
  const numericId = +matchId;
  const hash = Number.isFinite(numericId) && numericId > 0
    ? numericId
    : matchId.split("").reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

  const PLAYER_SLOTS = 3;
  const idx = hash % (BONUS_QUESTION_POOL.length + PLAYER_SLOTS); // % 12

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
// stored target name. Uses three strategies so edge cases like "Vinicius Jr." vs
// "Vinicius Junior", "K. Havertz" vs "Kai Havertz", or accented "Vinícius" all match.
function playerNameMatches(espnRaw: string, targetRaw: string): boolean {
  const espn   = normalize(espnRaw);
  const target = normalize(targetRaw);
  if (espn.includes(target) || target.includes(espn)) return true;
  const SUFFIXES = new Set(["jr.", "jr", "junior", "senior", "sr.", "sr"]);
  const words = target.split(/\s+/).filter(w => w.length >= 4 && !SUFFIXES.has(w));
  return words.some(w => espn.includes(w));
}

/**
 * Detect the yes/no answer for a bonus question from ESPN match data.
 * Returns null when detection is impossible (admin must set the answer manually).
 */
export function detectBonusAnswer(
  bonusQ: BonusQuestion,
  _homeScore: number,
  _awayScore: number,
  details: ESPNDetail[]
): boolean | null {
  switch (bonusQ.type) {

    // ── Legacy group-stage types ───────────────────────────────────────────────

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

    case "two_plus_yellows": {
      if (!details.length) return null;
      const count = details.filter((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "YC" || text === "yellow card";
      }).length;
      return count >= 2;
    }

    case "defender_scores": {
      if (!details.length) return null;
      const GOAL_ABBRS = new Set(["G", "PG"]);
      const goalEvents = details.filter((d) =>
        GOAL_ABBRS.has(d.type?.abbreviation?.toUpperCase() ?? "")
      );
      if (!goalEvents.length) return false;
      const DEFENDER_TERMS = ["defender", "back", "cb", "lb", "rb", "df", "centre back", "center back", "full back", "fullback"];
      for (const goal of goalEvents) {
        for (const athlete of (goal.athletesInvolved ?? [])) {
          const posName = (athlete.position?.name ?? "").toLowerCase();
          const posAbbr = (athlete.position?.abbreviation ?? "").toLowerCase();
          if (DEFENDER_TERMS.some((t) => posName.includes(t)) || posAbbr === "df" || posAbbr === "d") {
            return true;
          }
        }
      }
      return null;
    }

    // ── Active star-player question (auto-detected via ESPN) ───────────────────

    case "player_scores": {
      if (!details.length || !bonusQ.playerName) return null;
      const GOAL_ABBRS = new Set(["G", "PG"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const isGoal = GOAL_ABBRS.has(abbr) ||
          (text.includes("goal") && !text.includes("own goal") && !text.includes("no goal"));
        if (!isGoal) return false;
        return (d.athletesInvolved ?? []).some((a) =>
          playerNameMatches(a.displayName ?? "", bonusQ.playerName!)
        );
      });
    }

    // ── New R32+ creative questions — admin must set the answer manually ────────

    case "first_scorer_wins":
    case "late_goal":
    case "var_decision":
    case "goal_first_30":
    case "penalty_attempt":
    case "substitute_scores":
    case "player_brace":
    case "five_subs":
      return null; // admin answers via the manual override tool in /admin

    default:
      return null;
  }
}
