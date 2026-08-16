import { ALLOWED_DIFFICULTIES } from "./config.ts";
import type { GeneratedQuestionResponse } from "./schemas.ts";

export type GeneratedQuestionValidationInput = {
  question: GeneratedQuestionResponse;
  avoidWords?: string[];
  sourceQuestion?: string;
  sourceExamples?: string[];
};

function normalize(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("vi").replace(/[“”"'.,!?;:()]/g, " ").replace(/\s+/g, " ").trim();
}

function containsTerm(value: string, term: string): boolean {
  const cleanTerm = normalize(term);
  return Boolean(cleanTerm) && ` ${normalize(value)} `.includes(` ${cleanTerm} `);
}

export function validateGeneratedQuestion(input: GeneratedQuestionValidationInput) {
  const { question } = input;
  const errors: string[] = [];
  const fields = [question.question, question.answer, question.hint1, question.hint2, question.hint3];
  if (fields.some((field) => !field.trim())) errors.push("missing_required_text");
  if (!ALLOWED_DIFFICULTIES.includes(question.difficulty)) errors.push("invalid_difficulty");
  if (question.question.length > 220 || question.answer.length > 70 || [question.hint1, question.hint2, question.hint3].some((hint) => hint.length > 180)) {
    errors.push("too_long_for_grade_3");
  }
  const combined = fields.join(" ");
  if (/```|\[[^\]]+\]\([^)]+\)|(?:^|\s)#{1,6}\s|<\/?[a-z][^>]*>/i.test(combined)) errors.push("markdown_or_html_noise");
  if (/\b(?:api|gemini|system prompt|developer message|mô hình ngôn ngữ|hệ thống nội bộ)\b/i.test(combined)) errors.push("internal_system_language");
  if (/(?:số điện thoại|địa chỉ nhà|tên đầy đủ của em|mật khẩu|email của em)/i.test(combined)) errors.push("personal_information_request");
  const forbidden = [...(input.avoidWords ?? []), ...(input.sourceExamples ?? [])].filter((value) => value.trim().length > 1);
  if (forbidden.some((word) => containsTerm(`${question.question} ${question.answer}`, word))) errors.push("reuses_avoided_word");
  if (input.sourceQuestion && normalize(question.question) === normalize(input.sourceQuestion)) errors.push("duplicates_source_question");
  return { valid: errors.length === 0, errors };
}

