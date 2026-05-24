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
      return details.some(
        (d) =>
          d.type?.abbreviation?.toUpperCase() === "RC" ||
          d.type?.text?.toLowerCase().includes("red card") ||
          d.type?.id === "93" // ESPN type ID for red card in soccer
      );
    }

    case "brace": {
      if (!details.length) return null;
      // Count goals per athlete ID
      const goalCounts: Record<string, number> = {};
      details.forEach((d) => {
        const isGoal =
          d.type?.abbreviation?.toUpperCase() === "G" ||
          d.type?.abbreviation?.toUpperCase() === "PG" || // penalty goal
          d.type?.text?.toLowerCase().includes("goal");
        if (!isGoal) return;
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
