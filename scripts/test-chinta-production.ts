import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

import { getSupabaseAdmin } from "../lib/db/supabase-admin.ts";

try { loadEnvFile(".env.local"); } catch { /* CI can inject variables directly. */ }

if (process.env.DATABASE_TEST_MODE !== "cleanup") {
  throw new Error("Đặt DATABASE_TEST_MODE=cleanup để production smoke test được phép cleanup dữ liệu tổng hợp.");
}

const configuredBaseUrl = process.env.CHINHTA_BASE_URL?.trim();
if (!configuredBaseUrl) throw new Error("Thiếu CHINHTA_BASE_URL, ví dụ https://your-app.vercel.app.");
const baseUrl = new URL(configuredBaseUrl);
if (baseUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(baseUrl.hostname)) {
  throw new Error("CHINHTA_BASE_URL production phải dùng HTTPS.");
}
const root = baseUrl.toString().replace(/\/$/, "");
const db = getSupabaseAdmin();
const runId = randomUUID();
const studentCode = `prodtest_${runId.replaceAll("-", "").slice(0, 20)}`;
const sessionPath = `projects/production-smoke/agent/sessions/${runId}`;
const answerEventId = `production-smoke-${runId}-answer`;
const wrongEventId = `production-smoke-${runId}-wrong`;
const hintEventId = `production-smoke-${runId}-hint`;
const correctedEventId = `production-smoke-${runId}-corrected`;
const webhookHeaders: Record<string, string> = { "content-type": "application/json" };
if (process.env.DIALOGFLOW_WEBHOOK_SECRET?.trim()) {
  webhookHeaders["x-dialogflow-webhook-secret"] = process.env.DIALOGFLOW_WEBHOOK_SECRET.trim();
}

type Json = Record<string, unknown>;

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

async function jsonResponse(response: Response): Promise<Json> {
  const data = await response.json() as Json;
  assert.ok(response.ok, `HTTP ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

function webhookBody(intentDisplayName: string, action: string, eventId: string, values: Json = {}, contextName = "week01_active") {
  return {
    responseId: `response-${eventId}`,
    session: sessionPath,
    payload: { action, eventType: action, eventId, studentId: studentCode, displayName: "Production smoke test", className: "SMOKE_TEST" },
    queryResult: {
      queryText: String(values.answer ?? values.studentQuestion ?? ""),
      languageCode: "vi",
      intent: { displayName: intentDisplayName },
      parameters: {},
      outputContexts: [{
        name: `${sessionPath}/contexts/${contextName}`,
        lifespanCount: 5,
        parameters: { studentId: studentCode, displayName: "Production smoke test", className: "SMOKE_TEST",
          week: 1, topic: "c / k", attempt: 1, hintLevel: 0, difficulty: "basic", ...values },
      }],
    },
  };
}

async function postWebhook(body: Json) {
  return jsonResponse(await fetch(`${root}/api/dialogflow/webhook`, {
    method: "POST",
    headers: webhookHeaders,
    body: JSON.stringify(body),
  }));
}

try {
  const health = await jsonResponse(await fetch(`${root}/api/dialogflow/health`, { cache: "no-store" }));
  assert.equal(health.ok, true);
  assert.equal(health.database, true);
  assert.equal(typeof health.timestamp, "string");

  const answerBody = webhookBody("W01_Q01_Correct", "ANSWER_RESULT", answerEventId, {
    questionId: "Q01", prompt: "Điền c hoặc k: _ây", answer: "cây", correctAnswer: "cây", correct: true,
  });
  const answer = await postWebhook(answerBody);
  const answerGame = record(record(answer.payload).game);
  assert.equal(answerGame.xpEarned, 10);
  assert.equal(answerGame.duplicate, false);

  const duplicate = await postWebhook(answerBody);
  const duplicateGame = record(record(duplicate.payload).game);
  assert.equal(duplicateGame.xpEarned, 0);
  assert.equal(duplicateGame.duplicate, true);

  const progressBefore = await jsonResponse(await fetch(`${root}/api/students/${encodeURIComponent(studentCode)}/progress`, { cache: "no-store" }));
  assert.equal(progressBefore.totalXP, 10);
  assert.deepEqual(progressBefore.completedWeeks, []);
  const firstWeek = (progressBefore.weekProgress as Json[])[0];
  assert.equal(firstWeek.correct_count, 1);

  const wrong = await postWebhook(webhookBody("W01_Q02_Correct", "ANSWER_RESULT", wrongEventId, {
    questionId: "W01_Q02", prompt: "Điền c/k: _ính mắt", answer: "mất tinh", correctAnswer: "kính mắt", correct: true,
  }, "week01_question02"));
  const wrongGame = record(record(wrong.payload).game);
  assert.equal(wrongGame.xpEarned, 0);

  const hint = await postWebhook(webhookBody("W01_Hint_1", "HINT_USED", hintEventId, {
    questionId: "W01_Q02", hintLevel: 1,
  }, "week01_question02"));
  assert.doesNotMatch(String(hint.fulfillmentText ?? ""), /#week|#context|hint1Text/);
  const hintGame = record(record(hint.payload).game);
  assert.equal(hintGame.hintsUsed, 1);

  const correctedBody = webhookBody("W01_Q02_Correct", "ANSWER_RESULT", correctedEventId, {
    questionId: "W01_Q02", prompt: "Điền c/k: _ính mắt", answer: "kính mắt", correctAnswer: "kính mắt",
    correct: true, hintLevel: 0,
  }, "week01_question02");
  const corrected = await postWebhook(correctedBody);
  const correctedGame = record(record(corrected.payload).game);
  assert.equal(correctedGame.xpEarned, 7, "RPC phải lấy Hint 1 đã lưu làm nguồn sự thật.");

  const correctedRetry = await postWebhook(correctedBody);
  const retryGame = record(record(correctedRetry.payload).game);
  assert.equal(retryGame.xpEarned, 0);
  assert.equal(retryGame.duplicate, true);

  const progressAfter = await jsonResponse(await fetch(`${root}/api/students/${encodeURIComponent(studentCode)}/progress`, { cache: "no-store" }));
  assert.equal(progressAfter.totalXP, 17);
  const finalWeek = (progressAfter.weekProgress as Json[])[0];
  assert.equal(finalWeek.correct_count, 2);
  assert.equal(finalWeek.wrong_count, 1);
  assert.equal(finalWeek.hints_used, 1);

  const explain = await postWebhook(webhookBody("AI_Explain", "AI_EXPLAIN", `production-smoke-${runId}-explain`, {
    rule: "Trước e, ê, i thường viết k.", studentQuestion: "Khi nào viết k?",
  }));
  assert.ok(String(explain.fulfillmentText ?? "").length > 0);

  console.log("Chính tả production smoke A-F: PASS (+10 XP, deterministic wrong, hint persistence, +7 after hint, refresh persistence, duplicate +0).");
} finally {
  const cleanup = await db.from("students").delete().eq("student_code", studentCode);
  if (cleanup.error) throw new Error(`Không cleanup được production smoke student: ${cleanup.error.message}`);
  console.log("Chính tả production smoke cleanup: PASS");
}
