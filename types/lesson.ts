export type HintLevel = 0 | 1 | 2 | 3;
export type LearningPhase = "theory" | "check_understanding" | "example" | "practice" | "summary";
export type PracticeDifficulty = "advanced" | "standard" | "basic" | "very_basic";
export type LearningIntent =
  | "start_lesson"
  | "answer_example"
  | "request_hint"
  | "not_understand"
  | "start_practice"
  | "answer_practice"
  | "next_question"
  | "end_lesson";

export type Question = {
  id: string;
  prompt: string;
  answer: string;
  hints: [string, string, string];
  explanation: string;
};

export type Topic = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  questions: Question[];
};

export type ChatMessage = { id: string; role: "student" | "assistant"; content: string };

export type PracticeQuestion = {
  id: string;
  difficulty: PracticeDifficulty;
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
};
