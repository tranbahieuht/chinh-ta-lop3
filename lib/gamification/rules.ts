export const XP_RULES = {
  correctFirstTry: 10,
  correctAfterRetry: 8,
  hint1: 7,
  hint2: 5,
  hint3: 3,
  answerRevealed: 0,
  weekComplete: 30,
  noHintWeekBonus: 20,
} as const;

export type XPInput = {
  correct: boolean;
  attempt: number;
  hintLevel: number;
  eventType?: "ANSWER_RESULT" | "ANSWER_REVEALED";
};

export function calculateAnswerXP(input: XPInput): number {
  if (!input.correct || input.eventType === "ANSWER_REVEALED") return XP_RULES.answerRevealed;
  if (input.hintLevel >= 3) return XP_RULES.hint3;
  if (input.hintLevel === 2) return XP_RULES.hint2;
  if (input.hintLevel === 1) return XP_RULES.hint1;
  return input.attempt <= 1 ? XP_RULES.correctFirstTry : XP_RULES.correctAfterRetry;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700] as const;

export function calculateLevel(totalXP: number): number {
  const xp = Math.max(0, Math.floor(totalXP));
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (xp >= LEVEL_THRESHOLDS[index]) {
      const baseLevel = index + 1;
      if (baseLevel < 5) return baseLevel;
      return 5 + Math.floor((xp - LEVEL_THRESHOLDS[4]) / 350);
    }
  }
  return 1;
}

export type MasteryInput = Pick<XPInput, "correct" | "attempt" | "hintLevel">;

export function updateMastery(currentMastery: number, input: MasteryInput): number {
  let delta: number;
  if (!input.correct) delta = -5;
  else if (input.hintLevel >= 3) delta = 0;
  else if (input.hintLevel === 2) delta = 1;
  else if (input.hintLevel === 1) delta = 3;
  else if (input.attempt > 1) delta = 5;
  else delta = 8;
  return Math.min(100, Math.max(0, Math.round(currentMastery + delta)));
}

function vietnamDayOrdinal(value: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000);
}

export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActivityAt: string | null,
  occurredAt: string,
) {
  const currentDay = vietnamDayOrdinal(new Date(occurredAt));
  const lastDay = lastActivityAt ? vietnamDayOrdinal(new Date(lastActivityAt)) : null;
  const streak = lastDay === currentDay
    ? Math.max(1, currentStreak)
    : lastDay === currentDay - 1
      ? Math.max(1, currentStreak + 1)
      : 1;
  return { streak, longestStreak: Math.max(longestStreak, streak), lastActivityAt: occurredAt };
}

