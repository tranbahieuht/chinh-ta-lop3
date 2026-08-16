import { createHash } from "node:crypto";

import { safeBoolean, safeIdentifier, safeInteger, safeText } from "../security/input.ts";
import type { AnswerEvent, WeekCompleteEvent } from "../gamification/types.ts";

export type DialogflowEventType =
  | "ANSWER_RESULT" | "WEEK_COMPLETE" | "GET_PROGRESS" | "GET_SCORE" | "GET_LEADERBOARD" | "GET_BADGES"
  | "AI_EXPLAIN" | "AI_FEEDBACK" | "AI_ANALYZE_MISTAKE" | "AI_CREATE_SIMILAR_QUESTION" | "UNKNOWN";

type JsonObject = Record<string, unknown>;
export type DialogflowContext = { name?: string; lifespanCount?: number; parameters?: JsonObject } & JsonObject;

export type ParsedIntentName = {
  week?: number;
  questionId?: string;
  result?: "correct" | "wrong";
  support: boolean;
  eventType: DialogflowEventType;
};

export type ParsedDialogflowRequest = {
  sessionPath: string;
  sessionId: string;
  responseId: string;
  intentDisplayName: string;
  queryText: string;
  parameters: JsonObject;
  outputContexts: DialogflowContext[];
  languageCode: string;
  payload: JsonObject;
  payloads: JsonObject[];
  values: JsonObject;
  studentId: string;
  displayName: string;
  className: string;
  week: number;
  topic: string;
  questionId: string;
  answer: string;
  attempt: number;
  hintLevel: number;
  difficulty: string;
  eventId: string;
};

export type NormalizedDialogflowEvent = {
  eventId: string;
  eventType: DialogflowEventType;
  studentId: string;
  sessionId: string;
  sessionPath: string;
  intentDisplayName: string;
  queryText: string;
  week: number;
  topic: string;
  questionId: string;
  answer: string;
  correct: boolean;
  attempt: number;
  hintLevel: number;
  difficulty: string;
  metadata: JsonObject;
  values: JsonObject;
  outputContexts: DialogflowContext[];
  displayName: string;
  className: string;
  answerEvent?: AnswerEvent;
  weekCompleteEvent?: WeekCompleteEvent;
};

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function resolvedValue(value: unknown): unknown {
  return typeof value === "string" && /^[#$][A-Za-z0-9_.-]+$/.test(value.trim()) ? undefined : value;
}

function deepFind(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFind(item, key);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const row = object(value);
  if (key in row) return row[key];
  for (const child of Object.values(row)) {
    const found = deepFind(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function directValue(payloads: JsonObject[], key: string): unknown {
  for (const payload of payloads) if (key in payload) return payload[key];
  return undefined;
}

function normalizeEventType(value: unknown): DialogflowEventType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[.\s-]+/g, "_").toUpperCase();
  const aliases: Record<string, DialogflowEventType> = {
    ANSWER_RESULT: "ANSWER_RESULT", ANSWER_CORRECT: "ANSWER_RESULT", ANSWER_WRONG: "ANSWER_RESULT",
    ACCUMULATE_XP: "ANSWER_RESULT", WEEK_COMPLETE: "WEEK_COMPLETE",
    PROGRESS_REQUESTED: "GET_PROGRESS", GET_PROGRESS: "GET_PROGRESS",
    SCORE_REQUESTED: "GET_SCORE", GET_SCORE: "GET_SCORE",
    LEADERBOARD_REQUESTED: "GET_LEADERBOARD", GET_LEADERBOARD: "GET_LEADERBOARD",
    BADGES_REQUESTED: "GET_BADGES", GET_BADGES: "GET_BADGES",
    AI_EXPLAIN: "AI_EXPLAIN", AI_FEEDBACK: "AI_FEEDBACK", AI_ANALYZE_MISTAKE: "AI_ANALYZE_MISTAKE",
    AI_CREATE_SIMILAR_QUESTION: "AI_CREATE_SIMILAR_QUESTION",
  };
  return aliases[normalized] ?? null;
}

export function parseIntentName(intentDisplayName: string): ParsedIntentName {
  const eventMap: Array<[RegExp, DialogflowEventType]> = [
    [/^AI_Explain$/i, "AI_EXPLAIN"], [/^AI_Feedback$/i, "AI_FEEDBACK"],
    [/^AI_AnalyzeMistake$/i, "AI_ANALYZE_MISTAKE"], [/^AI_CreateSimilarQuestion$/i, "AI_CREATE_SIMILAR_QUESTION"],
    [/^Global_Progress$/i, "GET_PROGRESS"], [/^Global_Score$/i, "GET_SCORE"],
    [/^Global_Leaderboard$/i, "GET_LEADERBOARD"], [/^Global_Badges$/i, "GET_BADGES"],
  ];
  for (const [pattern, eventType] of eventMap) if (pattern.test(intentDisplayName)) return { support: false, eventType };

  const weekMatch = intentDisplayName.match(/^W(\d{2})_/i);
  const week = weekMatch ? Number(weekMatch[1]) : undefined;
  if (week && /(?:^|_)Complete$/i.test(intentDisplayName)) return { week, support: false, eventType: "WEEK_COMPLETE" };

  const questionMatch = intentDisplayName.match(/^W\d{2}_(?:(Support)_)?Q(\d{2}).*?_(Correct|Wrong)(?:_|$)/i);
  if (questionMatch) {
    const support = Boolean(questionMatch[1]);
    const result = questionMatch[3].toLowerCase() as "correct" | "wrong";
    const questionId = `${support ? "SUPPORT_" : ""}Q${questionMatch[2]}`;
    return { week, questionId, result, support, eventType: questionMatch[2] === "09" && result === "correct" ? "WEEK_COMPLETE" : "ANSWER_RESULT" };
  }
  if (week && /_Wrong(?:_|$)/i.test(intentDisplayName)) return { week, result: "wrong", support: false, eventType: "ANSWER_RESULT" };
  return { week, support: /Support/i.test(intentDisplayName), eventType: "UNKNOWN" };
}

export function parseDialogflowRequest(bodyValue: unknown): ParsedDialogflowRequest {
  const body = object(bodyValue);
  const queryResult = object(body.queryResult);
  const intentDisplayName = safeText(object(queryResult.intent).displayName, "", 120);
  const intent = parseIntentName(intentDisplayName);
  const sessionPath = safeText(body.session, "anonymous-session", 300);
  const sessionId = safeIdentifier(sessionPath.split("/").at(-1), "anonymous-session");
  const responseId = safeIdentifier(body.responseId, "");
  const parameters = object(queryResult.parameters);
  const outputContexts = (Array.isArray(queryResult.outputContexts) ? queryResult.outputContexts : []).map((value) => object(value) as DialogflowContext);
  const contextValues: JsonObject = {};
  for (const context of outputContexts) Object.assign(contextValues, object(context.parameters));
  const originalPayload = object(object(body.originalDetectIntentRequest).payload);
  const fulfillmentPayloads = (Array.isArray(queryResult.fulfillmentMessages) ? queryResult.fulfillmentMessages : [])
    .map((message) => object(object(message).payload));
  const customPayload = object(body.payload);
  const payloads = [customPayload, originalPayload, ...fulfillmentPayloads];
  const payload = Object.assign({}, ...[...payloads].reverse()) as JsonObject;
  const sessionState = object(deepFind(payloads, "sessionState"));
  const values: JsonObject = { ...contextValues, ...parameters, ...sessionState };
  const payloadStudent = resolvedValue(deepFind([customPayload, originalPayload], "studentId"));
  const studentId = safeIdentifier(payloadStudent ?? resolvedValue(values.studentId), `guest-${sessionId}`);
  const displayName = safeText(resolvedValue(deepFind([customPayload, originalPayload], "displayName")) ?? resolvedValue(values.displayName), "Học sinh", 80);
  const className = safeText(resolvedValue(deepFind([customPayload, originalPayload], "className")) ?? resolvedValue(values.className), "Chưa xếp lớp", 40);
  const week = safeInteger(resolvedValue(values.week) ?? intent.week, 0, 0, 35);
  const contextQuestionId = safeIdentifier(resolvedValue(values.questionId), "");
  const questionId = intent.questionId ?? (contextQuestionId || "unknown-question");
  const topic = safeText(resolvedValue(values.topic), "Chính tả tổng hợp", 120);
  const queryText = safeText(queryResult.queryText, "", 300);
  const answer = safeText(resolvedValue(values.answer) ?? queryText, "", 300);
  const attempt = safeInteger(values.attempt, 1, 1, 20);
  const hintLevel = safeInteger(values.hintLevel, 0, 0, 3);
  const difficulty = safeIdentifier(values.difficulty, "basic");
  const explicitEventId = resolvedValue(directValue(payloads, "eventId") ?? parameters.eventId);
  const timestampBucket = Math.floor(Date.now() / (10 * 60_000));
  const retryKey = responseId || String(timestampBucket);
  const derivedKey = [sessionId, intentDisplayName, questionId, attempt, hintLevel, retryKey].join(":");
  const eventId = safeIdentifier(explicitEventId, `df-${createHash("sha256").update(derivedKey).digest("hex").slice(0, 40)}`);
  return {
    sessionPath, sessionId, responseId, intentDisplayName, queryText, parameters, outputContexts,
    languageCode: safeText(queryResult.languageCode, "vi", 12), payload, payloads, values,
    studentId, displayName, className, week, topic, questionId, answer, attempt, hintLevel, difficulty, eventId,
  };
}

export function normalizeDialogflowEvent(request: ParsedDialogflowRequest): NormalizedDialogflowEvent {
  const parsedIntent = parseIntentName(request.intentDisplayName);
  // Required detection order: payload.action, payload.eventType, intent pattern, then metadata/parameters.
  const payloadAction = normalizeEventType(directValue(request.payloads, "action"));
  const payloadEventType = normalizeEventType(directValue(request.payloads, "eventType"));
  const metadataEvent = normalizeEventType(request.parameters.eventType ?? request.parameters.action
    ?? deepFind(request.payloads, "event") ?? deepFind(deepFind(request.payloads, "webhook"), "action"));
  let eventType = payloadAction ?? payloadEventType ?? (parsedIntent.eventType !== "UNKNOWN" ? parsedIntent.eventType : null) ?? metadataEvent ?? "UNKNOWN";
  if (eventType === "ANSWER_RESULT" && parsedIntent.eventType === "WEEK_COMPLETE") eventType = "WEEK_COMPLETE";
  const correct = parsedIntent.result ? parsedIntent.result === "correct" : safeBoolean(request.values.correct, false);
  const metadata = {
    ...request.values,
    parameters: request.parameters,
    languageCode: request.languageCode,
    responseId: request.responseId,
    intentResult: parsedIntent.result,
    supportQuestion: parsedIntent.support,
  };
  const shared = { eventId: request.eventId, studentCode: request.studentId, displayName: request.displayName,
    className: request.className, week: request.week, topic: request.topic };
  const answerEvent = eventType === "ANSWER_RESULT" || eventType === "WEEK_COMPLETE"
    ? { ...shared, questionId: request.questionId, answer: request.answer, correct, attempt: request.attempt,
        hintLevel: request.hintLevel, difficulty: request.difficulty,
        masterySignal: safeIdentifier(request.values.masterySignal, "collecting"),
        eventType: safeBoolean(request.values.answerRevealed) ? "ANSWER_REVEALED" as const : "ANSWER_RESULT" as const }
    : undefined;
  const weekCompleteEvent = eventType === "WEEK_COMPLETE" && request.week > 0 ? shared : undefined;
  return {
    eventId: request.eventId, eventType, studentId: request.studentId, sessionId: request.sessionId,
    sessionPath: request.sessionPath, intentDisplayName: request.intentDisplayName, queryText: request.queryText,
    week: request.week, topic: request.topic, questionId: request.questionId, answer: request.answer,
    correct, attempt: request.attempt, hintLevel: request.hintLevel, difficulty: request.difficulty,
    metadata, values: request.values, outputContexts: request.outputContexts,
    displayName: request.displayName, className: request.className, answerEvent, weekCompleteEvent,
  };
}

export function parseDialogflowWebhook(bodyValue: unknown): NormalizedDialogflowEvent {
  return normalizeDialogflowEvent(parseDialogflowRequest(bodyValue));
}
