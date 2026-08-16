export type Difficulty = "basic" | "basic_support" | "example" | "medium" | "hard" | string;

export type AnswerEvent = {
  eventId: string;
  studentCode: string;
  displayName?: string;
  className?: string;
  week: number;
  questionId: string;
  topic: string;
  answer?: string;
  correct: boolean;
  attempt: number;
  hintLevel: number;
  difficulty: Difficulty;
  masterySignal?: string;
  eventType?: "ANSWER_RESULT" | "ANSWER_REVEALED";
  occurredAt?: string;
};

export type WeekCompleteEvent = {
  eventId: string;
  studentCode: string;
  displayName?: string;
  className?: string;
  week: number;
  topic: string;
  occurredAt?: string;
};

export type HintEvent = {
  eventId: string;
  studentCode: string;
  displayName?: string;
  className?: string;
  week: number;
  questionId: string;
  topic: string;
  hintLevel: number;
  difficulty: Difficulty;
  occurredAt?: string;
};

export type GamificationResult = {
  success: true;
  duplicate: boolean;
  studentId: string;
  xpEarned: number;
  totalXP: number;
  level: number;
  levelUp: boolean;
  mastery: number;
  streak: number;
  newBadges: string[];
  week?: number;
  weekXP?: number;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  hintsUsed?: number;
};
