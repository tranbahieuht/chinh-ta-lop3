import type { LearningIntent, LearningPhase } from "@/types/lesson";

const supportedIntents: LearningIntent[] = ["start_lesson", "answer_example", "request_hint", "not_understand", "start_practice", "answer_practice", "next_question", "end_lesson"];

export function normalizeIntent(displayName: string | null | undefined, phase: LearningPhase): LearningIntent {
  const normalized = displayName?.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (normalized && supportedIntents.includes(normalized as LearningIntent)) return normalized as LearningIntent;
  return phase === "example" ? "answer_example" : "answer_practice";
}

export function inferLocalIntent(message: string, phase: LearningPhase): LearningIntent {
  const text = message.trim().toLowerCase();
  if (/bắt đầu học|vào bài|học thôi/.test(text)) return "start_lesson";
  if (/gợi ý|giúp em một chút/.test(text)) return "request_hint";
  if (/chưa hiểu|không hiểu|giải thích lại/.test(text)) return "not_understand";
  if (/làm bài tiếp|bắt đầu luyện|luyện tập/.test(text)) return phase === "example" ? "start_practice" : "next_question";
  if (/câu tiếp|tiếp theo/.test(text)) return "next_question";
  if (/kết thúc|dừng học|học xong/.test(text)) return "end_lesson";
  return phase === "example" ? "answer_example" : "answer_practice";
}
