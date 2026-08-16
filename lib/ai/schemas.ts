import { ALLOWED_DIFFICULTIES, MISTAKE_TYPES, type AIDifficulty, type MistakeType } from "./config.ts";

export type ExplainResponse = { explanation: string; example?: string; followUpQuestion?: string };
export type FeedbackResponse = { feedback: string; shouldOfferHint: boolean; suggestedHintLevel: number };
export type MistakeAnalysisResponse = { mistakeType: MistakeType; shortReason: string; recommendation: string; confidence: number };
export type GeneratedQuestionResponse = { question: string; answer: string; hint1: string; hint2: string; hint3: string; difficulty: AIDifficulty };

export const ExplainResponseJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    explanation: { type: "string", description: "Giải thích ngắn, dễ hiểu cho học sinh lớp 3." },
    example: { type: "string", description: "Một ví dụ ngắn, không bắt buộc." },
    followUpQuestion: { type: "string", description: "Một câu hỏi gợi mở ngắn, không bắt buộc." },
  },
  required: ["explanation"],
} as const;

export const FeedbackResponseJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    feedback: { type: "string" },
    shouldOfferHint: { type: "boolean" },
    suggestedHintLevel: { type: "integer", minimum: 0, maximum: 3 },
  },
  required: ["feedback", "shouldOfferHint", "suggestedHintLevel"],
} as const;

export const MistakeAnalysisJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    mistakeType: { type: "string", enum: [...MISTAKE_TYPES] },
    shortReason: { type: "string" },
    recommendation: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["mistakeType", "shortReason", "recommendation", "confidence"],
} as const;

export const GeneratedQuestionJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    question: { type: "string" }, answer: { type: "string" },
    hint1: { type: "string" }, hint2: { type: "string" }, hint3: { type: "string" },
    difficulty: { type: "string", enum: [...ALLOWED_DIFFICULTIES] },
  },
  required: ["question", "answer", "hint1", "hint2", "hint3", "difficulty"],
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return clean && clean.length <= maxLength ? clean : undefined;
}

export function parseExplainResponse(value: unknown): ExplainResponse | null {
  const row = record(value);
  const explanation = cleanString(row?.explanation, 600);
  if (!row || !explanation) return null;
  const example = cleanString(row.example, 200);
  const followUpQuestion = cleanString(row.followUpQuestion, 220);
  return { explanation, ...(example ? { example } : {}), ...(followUpQuestion ? { followUpQuestion } : {}) };
}

export function parseFeedbackResponse(value: unknown): FeedbackResponse | null {
  const row = record(value);
  const feedback = cleanString(row?.feedback, 600);
  if (!row || !feedback || typeof row.shouldOfferHint !== "boolean" || !Number.isInteger(row.suggestedHintLevel)) return null;
  const suggestedHintLevel = Number(row.suggestedHintLevel);
  if (suggestedHintLevel < 0 || suggestedHintLevel > 3) return null;
  return { feedback, shouldOfferHint: row.shouldOfferHint, suggestedHintLevel };
}

export function parseMistakeAnalysis(value: unknown): MistakeAnalysisResponse | null {
  const row = record(value);
  const shortReason = cleanString(row?.shortReason, 300);
  const recommendation = cleanString(row?.recommendation, 350);
  if (!row || !MISTAKE_TYPES.includes(row.mistakeType as MistakeType) || !shortReason || !recommendation || typeof row.confidence !== "number") return null;
  if (row.confidence < 0 || row.confidence > 1) return null;
  return { mistakeType: row.mistakeType as MistakeType, shortReason, recommendation, confidence: row.confidence };
}

export function parseGeneratedQuestion(value: unknown): GeneratedQuestionResponse | null {
  const row = record(value);
  if (!row || !ALLOWED_DIFFICULTIES.includes(row.difficulty as AIDifficulty)) return null;
  const question = cleanString(row.question, 300);
  const answer = cleanString(row.answer, 100);
  const hint1 = cleanString(row.hint1, 220);
  const hint2 = cleanString(row.hint2, 220);
  const hint3 = cleanString(row.hint3, 220);
  return question && answer && hint1 && hint2 && hint3
    ? { question, answer, hint1, hint2, hint3, difficulty: row.difficulty as AIDifficulty }
    : null;
}

