import type { HintLevel, PracticeDifficulty } from "@/types/lesson";

export type PracticeResult = {
  isCorrect: boolean;
  attemptCount: number;
  hintCount: number;
};

const difficultyOrder: PracticeDifficulty[] = ["very_basic", "basic", "standard", "advanced"];

export function getPracticeDifficulty(exampleHintLevel: HintLevel): PracticeDifficulty {
  const difficultyByLevel: Record<HintLevel, PracticeDifficulty> = {
    0: "advanced",
    1: "standard",
    2: "basic",
    3: "very_basic",
  };
  return difficultyByLevel[exampleHintLevel];
}

export function getNextDifficulty(currentDifficulty: PracticeDifficulty, result: PracticeResult): PracticeDifficulty {
  const currentIndex = difficultyOrder.indexOf(currentDifficulty);
  const wrongAttemptCount = Math.max(0, result.attemptCount - (result.isCorrect ? 1 : 0));
  const shouldDecrease = result.hintCount >= 2 || wrongAttemptCount >= 2;

  if (shouldDecrease) return difficultyOrder[Math.max(0, currentIndex - 1)];
  if (result.isCorrect && result.attemptCount === 1 && result.hintCount === 0) {
    return difficultyOrder[Math.min(difficultyOrder.length - 1, currentIndex + 1)];
  }
  return currentDifficulty;
}
