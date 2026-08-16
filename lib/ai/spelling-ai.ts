import "server-only";

import { GoogleGenAI } from "@google/genai";

import {
  GEMINI_MAX_OUTPUT_TOKENS, GEMINI_MODEL, GEMINI_TIMEOUT_MS, SPELLING_SYSTEM_PROMPT,
  type AIDifficulty, type MistakeType,
} from "./config.ts";
import { getStaticSimilarQuestion } from "./static-question-bank.ts";
import { validateGeneratedQuestion } from "./question-validator.ts";
import {
  ExplainResponseJsonSchema, FeedbackResponseJsonSchema, GeneratedQuestionJsonSchema, MistakeAnalysisJsonSchema,
  parseExplainResponse, parseFeedbackResponse, parseGeneratedQuestion, parseMistakeAnalysis,
  type ExplainResponse, type FeedbackResponse, type GeneratedQuestionResponse, type MistakeAnalysisResponse,
} from "./schemas.ts";

export type ExplainRuleInput = {
  week: number;
  topic: string;
  rule: string;
  studentQuestion?: string;
  previousMistakes?: string[];
  hintLevel?: number;
};

export type FeedbackAnswerInput = {
  week: number;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  attempt: number;
  hintLevel: number;
  difficulty: AIDifficulty;
};

export type AnalyzeMistakeInput = {
  week: number;
  topic: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  recentMistakes: string[];
};

export type CreateSimilarQuestionInput = {
  week: number;
  topic: string;
  rule: string;
  sourceExamples: string[];
  sourceQuestion?: string;
  difficulty: AIDifficulty;
  avoidWords: string[];
  mistakeType?: MistakeType;
};

export type AIResultMetadata = { success: boolean; usedFallback: boolean; error?: string };
export type ExplainRuleOutput = ExplainResponse & AIResultMetadata;
export type FeedbackAnswerOutput = FeedbackResponse & AIResultMetadata;
export type AnalyzeMistakeOutput = MistakeAnalysisResponse & AIResultMetadata;
export type CreateSimilarQuestionOutput = GeneratedQuestionResponse & AIResultMetadata & { validationErrors?: string[] };

export type StructuredGenerationRequest = {
  action: "explain" | "feedback" | "analyze_mistake" | "similar_question";
  contents: string;
  responseJsonSchema: unknown;
  signal: AbortSignal;
  timeoutMs: number;
};
export type StructuredGenerator = (request: StructuredGenerationRequest) => Promise<unknown>;
export type AIDependencies = { generate?: StructuredGenerator; timeoutMs?: number };

let geminiClient: GoogleGenAI | undefined;
const explainCache = new Map<string, { expiresAt: number; value: ExplainRuleOutput }>();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

const defaultGenerator: StructuredGenerator = async (request) => {
  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: request.contents,
    config: {
      systemInstruction: SPELLING_SYSTEM_PROMPT,
      temperature: 0.2,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseJsonSchema: request.responseJsonSchema,
      httpOptions: { timeout: request.timeoutMs },
      abortSignal: request.signal,
    },
  });
  return response.text;
};

class AITimeoutError extends Error {
  constructor() { super("GEMINI_TIMEOUT"); }
}

async function generateWithTimeout(request: Omit<StructuredGenerationRequest, "signal" | "timeoutMs">, dependencies: AIDependencies) {
  const timeoutMs = dependencies.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AITimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (dependencies.generate ?? defaultGenerator)({ ...request, signal: controller.signal, timeoutMs }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseJsonPayload(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function logAI(status: "success" | "timeout" | "validation_failure" | "fallback", action: string, week: number, topic: string, detail?: string) {
  const safeDetail = detail?.slice(0, 120);
  console.info("[spelling-ai]", { status, action, week, topic: topic.slice(0, 80), model: GEMINI_MODEL, ...(safeDetail ? { detail: safeDetail } : {}) });
}

function studentFacingTextErrors(values: Array<string | undefined>): string[] {
  const text = values.filter(Boolean).join(" ");
  const errors: string[] = [];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 100) errors.push("response_too_long");
  if (/```|\[[^\]]+\]\([^)]+\)|<\/?[a-z][^>]*>/i.test(text)) errors.push("markdown_or_html_noise");
  if (/\b(?:api|gemini|system prompt|developer message|mô hình ngôn ngữ|hệ thống nội bộ)\b/i.test(text)) errors.push("internal_system_language");
  if (/(?:số điện thoại|địa chỉ nhà|tên đầy đủ của em|mật khẩu|email của em)/i.test(text)) errors.push("personal_information_request");
  return errors;
}

async function runStructured<T>(options: {
  action: StructuredGenerationRequest["action"];
  week: number;
  topic: string;
  prompt: string;
  schema: unknown;
  parse: (value: unknown) => T | null;
  fallback: T;
  dependencies: AIDependencies;
  validate?: (value: T) => string[];
}): Promise<T & AIResultMetadata & { validationErrors?: string[] }> {
  try {
    const raw = await generateWithTimeout({ action: options.action, contents: options.prompt, responseJsonSchema: options.schema }, options.dependencies);
    const parsed = options.parse(parseJsonPayload(raw));
    const errors = parsed ? options.validate?.(parsed) ?? [] : ["malformed_structured_response"];
    if (!parsed || errors.length) {
      logAI("validation_failure", options.action, options.week, options.topic, errors.join(","));
      logAI("fallback", options.action, options.week, options.topic, "validation");
      return { ...options.fallback, success: false, usedFallback: true, error: "AI_RESPONSE_INVALID", validationErrors: errors };
    }
    logAI("success", options.action, options.week, options.topic);
    return { ...parsed, success: true, usedFallback: false };
  } catch (reason) {
    const timeout = reason instanceof AITimeoutError || (reason instanceof Error && /timeout|aborted/i.test(reason.message));
    const malformed = reason instanceof SyntaxError;
    logAI(timeout ? "timeout" : malformed ? "validation_failure" : "fallback", options.action, options.week, options.topic,
      reason instanceof Error ? reason.message : "unknown_error");
    if (timeout || malformed) logAI("fallback", options.action, options.week, options.topic, timeout ? "timeout" : "malformed_json");
    return { ...options.fallback, success: false, usedFallback: true, error: timeout ? "AI_TIMEOUT" : "AI_UNAVAILABLE" };
  }
}

function explainFallback(input: ExplainRuleInput): ExplainResponse {
  if (/c\s*[/_-]\s*k/i.test(input.topic) || /c\s*[/_-]\s*k/i.test(input.rule)) {
    return {
      explanation: "Em nhìn chữ đứng sau âm đầu nhé. Trước e, ê, i, ta thường viết k, như kẹo, kê, kim. Với nhiều nguyên âm khác, ta thường viết c, như cá, cô, cua.",
      followUpQuestion: "Trong từ “kẹo”, vì sao em chọn k?",
    };
  }
  return {
    explanation: "Em hãy nhìn lại quy tắc của bài và chữ đứng ngay sau âm đầu hoặc vần cần điền nhé.",
    followUpQuestion: "Em thấy dấu hiệu nào giúp mình chọn cách viết?",
  };
}

function feedbackFallback(input: FeedbackAnswerInput): FeedbackResponse {
  if (input.isCorrect) return { feedback: `Em làm đúng rồi! Cách viết này phù hợp với quy tắc ${input.topic}.`, shouldOfferHint: false, suggestedHintLevel: input.hintLevel };
  if (input.hintLevel >= 3) return { feedback: `Mình cùng đối chiếu nhé: đáp án đúng là “${input.correctAnswer}”. Em đọc lại quy tắc rồi thử với một từ khác.`, shouldOfferHint: false, suggestedHintLevel: 3 };
  const nextHint = Math.min(3, input.hintLevel + 1);
  return { feedback: "Câu này chưa đúng. Em hãy nhìn lại dấu hiệu của quy tắc rồi thử thêm một lần nhé.", shouldOfferHint: true, suggestedHintLevel: nextHint };
}

function stripTone(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi");
}

function mistakeFallback(input: AnalyzeMistakeInput): MistakeAnalysisResponse {
  const student = input.studentAnswer.trim();
  const correct = input.correctAnswer.trim();
  let mistakeType: MistakeType = "UNKNOWN";
  let shortReason = "Chưa đủ dữ liệu để xác định rõ kiểu nhầm.";
  if (student.toLocaleLowerCase("vi") === correct.toLocaleLowerCase("vi") && student !== correct) {
    mistakeType = "CAPITALIZATION"; shortReason = "Em đang nhầm chữ hoa và chữ thường trong tên riêng.";
  } else if (stripTone(student) === stripTone(correct) && student !== correct) {
    mistakeType = "TONE_MARK"; shortReason = "Các chữ giống nhau nhưng dấu thanh chưa đúng.";
  } else if (student && correct && stripTone(student).slice(1) === stripTone(correct).slice(1)) {
    mistakeType = "CONFUSING_INITIAL"; shortReason = "Em đang nhầm âm đầu của tiếng.";
  } else if (/tên người nước ngoài|nước ngoài/i.test(input.topic) || /-/.test(correct)) {
    mistakeType = "FOREIGN_NAME"; shortReason = "Em đang nhầm cách viết tên riêng nước ngoài.";
  } else if (student && correct) {
    mistakeType = "CONFUSING_RHYME"; shortReason = "Âm đầu có vẻ đúng nhưng phần vần chưa khớp.";
  }
  return { mistakeType, shortReason, recommendation: `Em đọc chậm từng tiếng và đối chiếu lại quy tắc ${input.topic}.`, confidence: mistakeType === "UNKNOWN" ? 0.35 : 0.82 };
}

function textContainsAnswer(text: string, answer: string): boolean {
  const cleanAnswer = answer.trim().toLocaleLowerCase("vi");
  return cleanAnswer.length > 1 && text.toLocaleLowerCase("vi").includes(cleanAnswer);
}

export async function explainRule(input: ExplainRuleInput, dependencies: AIDependencies = {}): Promise<ExplainRuleOutput> {
  const cacheable = !dependencies.generate && !input.studentQuestion && !(input.previousMistakes?.length);
  const cacheKey = `${input.week}|${input.topic}|${input.rule}`;
  const cached = cacheable ? explainCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const result = await runStructured({
    action: "explain", week: input.week, topic: input.topic, schema: ExplainResponseJsonSchema,
    prompt: `Giải thích quy tắc bằng JSON. Dữ liệu bài học: ${JSON.stringify(input)}. Không đưa đáp án của câu đang luyện nếu hintLevel dưới 3.`,
    parse: parseExplainResponse, fallback: explainFallback(input), dependencies,
    validate: (value) => studentFacingTextErrors([value.explanation, value.example, value.followUpQuestion]),
  });
  if (cacheable && result.success) {
    if (explainCache.size >= 100) explainCache.delete(explainCache.keys().next().value ?? "");
    explainCache.set(cacheKey, { expiresAt: Date.now() + 30 * 60_000, value: result });
  }
  return result;
}

export function feedbackAnswer(input: FeedbackAnswerInput, dependencies: AIDependencies = {}): Promise<FeedbackAnswerOutput> {
  return runStructured({
    action: "feedback", week: input.week, topic: input.topic, schema: FeedbackResponseJsonSchema,
    prompt: `Phản hồi câu trả lời bằng JSON. isCorrect do backend xác định và không được thay đổi. Dữ liệu: ${JSON.stringify(input)}. ${!input.isCorrect && input.hintLevel < 3 ? "Không tiết lộ correctAnswer trong feedback." : "Có thể nêu đáp án vì backend cho phép."}`,
    parse: parseFeedbackResponse, fallback: feedbackFallback(input), dependencies,
    validate: (value) => [
      ...studentFacingTextErrors([value.feedback]),
      ...(input.isCorrect && value.shouldOfferHint ? ["correct_answer_must_not_offer_hint"] : []),
      ...(!input.isCorrect && input.hintLevel < 3 && textContainsAnswer(value.feedback, input.correctAnswer) ? ["reveals_answer_too_early"] : []),
      ...(value.suggestedHintLevel < input.hintLevel ? ["hint_level_regression"] : []),
    ],
  });
}

export function analyzeMistake(input: AnalyzeMistakeInput, dependencies: AIDependencies = {}): Promise<AnalyzeMistakeOutput> {
  return runStructured({
    action: "analyze_mistake", week: input.week, topic: input.topic, schema: MistakeAnalysisJsonSchema,
    prompt: `Phân tích lỗi đơn giản bằng JSON. Chỉ chọn mistakeType trong enum schema. Không chẩn đoán học sinh. Dữ liệu: ${JSON.stringify(input)}.`,
    parse: parseMistakeAnalysis, fallback: mistakeFallback(input), dependencies,
    validate: (value) => studentFacingTextErrors([value.shortReason, value.recommendation]),
  });
}

export function createSimilarQuestion(input: CreateSimilarQuestionInput, dependencies: AIDependencies = {}): Promise<CreateSimilarQuestionOutput> {
  const fallback = getStaticSimilarQuestion(input);
  return runStructured({
    action: "similar_question", week: input.week, topic: input.topic, schema: GeneratedQuestionJsonSchema,
    prompt: `Tạo đúng một câu luyện tương tự bằng JSON. Chỉ dùng quy tắc của tuần, không lặp sourceExamples, sourceQuestion hoặc avoidWords. Dữ liệu: ${JSON.stringify(input)}.`,
    parse: parseGeneratedQuestion, fallback, dependencies,
    validate: (question) => validateGeneratedQuestion({ question, avoidWords: input.avoidWords, sourceExamples: input.sourceExamples, sourceQuestion: input.sourceQuestion }).errors,
  });
}
