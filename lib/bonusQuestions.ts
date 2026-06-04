export type BonusQuestionType =
  | "red_card"
  | "penalty_goal"
  | "three_yellows"
  | "both_teams_yellow"
  | "own_goal";

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
    type: "red_card",
    text: "האם יוצא לפחות כרטיס אדום אחד במשחק?",
    points: 2,
    tag: "🟥",
  },
  {
    type: "penalty_goal",
    text: "האם יבוצע שער מפנדל?",
    points: 2,
    tag: "🎯",
  },
  {
    type: "three_yellows",
    text: "האם יוצגו לפחות 3 כרטיסים צהובים?",
    points: 2,
    tag: "🟨",
  },
  {
    type: "both_teams_yellow",
    text: "האם שתי הקבוצות יקבלו לפחות כרטיס צהוב אחד?",
    points: 2,
    tag: "⚠️",
  },
  {
    type: "own_goal",
    text: "האם יהיה שער עצמי במשחק?",
    points: 2,
    tag: "🤦",
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
 * @param type      The question type
 * @param homeScore Final home score (from scoreboard)
 * @param awayScore Final away score (from scoreboard)
 * @param details   competition.details[] from ESPN (may be empty)
 * @returns         true/false if detectable, null if detection impossible
 */
export function detectBonusAnswer(
  type: BonusQuestionType,
  homeScore: number,
  awayScore: number,
  details: ESPNDetail[]
): boolean | null {
  switch (type) {
    case "red_card": {
      if (!details.length) return null;
      const RED_IDS = new Set(["86", "93", "200"]);
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        const id   = d.type?.id ?? "";
        return (
          abbr === "RC"  ||
          abbr === "YRC" ||
          abbr === "RY"  ||
          text.includes("red card") ||
          text.includes("sending off") ||
          text.includes("dismissed") ||
          RED_IDS.has(id)
        );
      });
    }

    case "penalty_goal": {
      if (!details.length) return null;
      return details.some((d) => {
        const abbr = d.type?.abbreviation?.toUpperCase() ?? "";
        const text = d.type?.text?.toLowerCase() ?? "";
        return abbr === "PG" || text.includes("penalty") && text.includes("goal");
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
        const isYellow = abbr === "YC" || text === "yellow card";
        if (isYellow && d.team?.id) teamsWithYellow.add(d.team.id);
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

    default:
      return null;
  }
}
