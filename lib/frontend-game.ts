import type { GamePayload, StudentProgress } from "../types/spelling.ts";

export function mergeGameProgress(current: StudentProgress, game: GamePayload): StudentProgress {
  const totalXP = typeof game.totalXP === "number" ? game.totalXP : current.totalXP;
  const level = typeof game.level === "number" ? game.level : current.level;
  const streak = typeof game.streak === "number" ? game.streak : current.streak;
  return { ...current, totalXP, level, streak, student: { ...current.student, total_xp: totalXP, level, streak } };
}
