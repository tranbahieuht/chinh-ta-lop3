import type { GamePayload, StudentProgress } from "../types/spelling.ts";

export function mergeGameProgress(current: StudentProgress, game: GamePayload): StudentProgress {
  const totalXP = typeof game.totalXP === "number" ? game.totalXP : current.totalXP;
  const level = typeof game.level === "number" ? game.level : current.level;
  const streak = typeof game.streak === "number" ? game.streak : current.streak;
  let weekProgress = current.weekProgress;
  if (typeof game.week === "number") {
    const existing = current.weekProgress.some((row) => row.week === game.week);
    weekProgress = current.weekProgress.map((row) => row.week === game.week ? {
      ...row,
      xp_earned: typeof game.weekXP === "number" ? game.weekXP : row.xp_earned,
      score: typeof game.score === "number" ? game.score : row.score,
      correct_count: typeof game.correctCount === "number" ? game.correctCount : row.correct_count,
      wrong_count: typeof game.wrongCount === "number" ? game.wrongCount : row.wrong_count,
      hints_used: typeof game.hintsUsed === "number" ? game.hintsUsed : row.hints_used,
      mastery_score: typeof game.mastery === "number" ? game.mastery : row.mastery_score,
    } : row);
    if (!existing) weekProgress = [...weekProgress, {
      week: game.week,
      topic: game.topic ?? "Chính tả tổng hợp",
      status: "in_progress",
      xp_earned: game.weekXP ?? game.xpEarned ?? 0,
      score: game.score ?? 0,
      correct_count: game.correctCount ?? 0,
      wrong_count: game.wrongCount ?? 0,
      hints_used: game.hintsUsed ?? 0,
      highest_difficulty: "basic",
      mastery_score: game.mastery ?? 50,
    }];
  }
  return { ...current, totalXP, level, streak, weekProgress,
    student: { ...current.student, total_xp: totalXP, level, streak } };
}
