/**
 * Bonus Questions System
 * ─────────────────────────────────────────────────────────────────────────────
 * Each match gets ONE bonus yes/no question worth 2 points.
 * The question is selected deterministically from the pool based on the matchId,
 * so every player sees the same question for the same match.
 *
 * Detection runs automatically during the sync API call using ESPN data.
 */

export type BonusQuestionType =
  | "five_plus_goals"
  | "big_win"
  | "draw"
  | "red_card"
  | "brace";

export interface BonusQuestion {
  type: BonusQuestionType;
  /** Hebrew question text shown to players */
  text: string;
  /** Points awarded for correct answer */
  points: number;
  /** Short emoji tag shown on the card */
  tag: string;
}

export const BONUS_QUESTION_POOL: BonusQuestion[] = [
  {
    type: "five_plus_goals",
    text: "האם יהיו 5 שערים ומעלה בסך הכל?",
    points: 2,
    tag: "⚽",
  },
  {
    type: "big_win",
    text: "האם קבוצה תנצח ב-3 שערי הפרש ומעלה?",
    points: 2,
    tag: "💥",
  },
  {
    type: "draw",
    text: "האם המשחק יסתיים בתיקו?",
    points: 2,
    tag: "🤝",
  },
  {
    type: "red_card",
    text: "האם יהיה לפחות כרטיס אדום אחד?",
    points: 2,
    tag: "🟥",
  },
  {
    type: "brace",
    text: "האם שחקן כלשהו יגבה 2 שערים ומעלה?",
    points: 2,
    tag: "🎯",
  },
];

/**
 * Deterministic selection: same matchId always returns the same question.
 * Uses a weighted char-code hash so adjacent IDs pick different questions.
 */
export function getBonusQuestion(matchId: string): BonusQuestion {
  const hash = matchId
    .split("")
    .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  return BONUS_QUESTION_POOL[hash % BONUS_QUESTION_POOL.length];
}

/**
 * ESPN match detail item (from competition.details[]).
 * Only the fields we actually use are typed.
 */
export interface ESPNDetail {
  type?: { id?: string; text?: string; abbreviation?: string };
  athletesInvolved?: { id?: string; displayName?: string }[];
  team?: { id?: string };
  clock?: { value?: number };
}

/**
 * Detect the correct yes/no answer for a bonus question from ESPN match data.
 *
 * @param type        The question type
 * @param homeScore   Final home score (from scoreboard)
 * @param awayScore   Final away score (from scoreboard)
 * @param details     competition.details[] from ESPN (may be empty)
 * @returns           true/false if detectable, null if detection impossible
 */
export function detectBonusAnswer(
  type: BonusQuestionType,
  homeScore: number,
  awayScore: number,
  details: ESPNDetail[]
): boolean | null {
  switch (type) {
    // ── Score-based (always reliable) ────────────────────────────────────────
    case "five_plus_goals":
      return homeScore + awayScore >= 5;

    case "big_win":
      return Math.abs(homeScore - awayScore) >= 3;

    case "draw":
      return homeScore === awayScore;

    // ── Detail-based (requires ESPN details array) ────────────────────────────
    case "red_card": {
      if (!details.length) return null; // can't detect
      // ESPN known type IDs: 86 = Red Card, 93 = Sending Off (alt), 200 = Red Card (some comps)
      // Also catches second-yellow situations via text/abbreviation
      const RED_IDS = new Set(["86", "93", "200"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const id   = d.type?.id ?? "";
        return (
          abbr === "RC"  ||
          abbr === "YRC" ||  // second yellow → red
          abbr === "RY"  ||
          text.includes("red card") ||
          text.includes("sending off") ||
          text.includes("dismissed") ||
          RED_IDS.has(id)
        );
      });
    }

    case "brace": {
      if (!details.length) return null;
      const GOAL_ABBRS = new Set(["G", "PG"]); // G=goal PG=penalty; OG=own goal excluded
      const goalCounts: Record<string, number> = {};
      details.forEach((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const isOwnGoal = abbr === "OG" || text.includes("own goal");
        const isGoal    = GOAL_ABBRS.has(abbr) ||
                          (!isOwnGoal && text.includes("goal scored"));
        if (!isGoal || isOwnGoal) return;
        d.athletesInvolved?.forEach((a) => {
          if (a.id) goalCounts[a.id] = (goalCounts[a.id] ?? 0) + 1;
        });
      });
      return Object.values(goalCounts).some((count) => count >= 2);
    }

    default:
      return null;
  }
}
