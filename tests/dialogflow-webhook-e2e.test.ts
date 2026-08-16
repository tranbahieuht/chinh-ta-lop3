import assert from "node:assert/strict";

import { explainRule } from "../lib/ai/spelling-ai.ts";
import { buildDialogflowResponse } from "../lib/dialogflow/response.ts";
import { parseDialogflowWebhook, parseIntentName } from "../lib/dialogflow/webhook.ts";
import { InMemoryGamificationEngine } from "../lib/gamification/simulation.ts";

type EventOverrides = {
  eventId: string;
  queryText?: string;
  attempt?: number;
  hintLevel?: number;
  action?: string;
};

function dialogflowBody(intentDisplayName: string, overrides: EventOverrides) {
  const session = "projects/local/agent/sessions/webhook-simulation";
  return {
    responseId: `response-${overrides.eventId}`,
    session,
    payload: overrides.action ? { action: overrides.action, eventId: overrides.eventId } : { eventId: overrides.eventId },
    queryResult: {
      queryText: overrides.queryText ?? "",
      languageCode: "vi",
      intent: { displayName: intentDisplayName },
      parameters: {},
      outputContexts: [{
        name: `${session}/contexts/week01_active`,
        lifespanCount: 5,
        parameters: {
          studentId: "HS-AJ-001", displayName: "An", className: "3A", week: 1,
          topic: "c / k", questionId: "Q01", answer: overrides.queryText ?? "",
          attempt: overrides.attempt ?? 1, hintLevel: overrides.hintLevel ?? 0,
          difficulty: "basic", correctAnswer: "cây",
        },
      }],
    },
  };
}

const results: Array<{ scenario: string; result: string }> = [];
const engine = new InMemoryGamificationEngine();

const a = parseDialogflowWebhook(dialogflowBody("W01_Q01_Correct", { eventId: "aj-answer-1", queryText: "cây" }));
assert.equal(a.eventType, "ANSWER_RESULT");
assert.equal(a.correct, true);
assert.ok(a.answerEvent);
const aGame = engine.recordAnswer(a.answerEvent);
assert.equal(aGame.xpEarned, 10);
results.push({ scenario: "A W01_Q01_Correct", result: "+10 XP" });

const b = parseDialogflowWebhook(dialogflowBody("W01_Q01_Correct", { eventId: "aj-answer-1", queryText: "cây" }));
const bGame = engine.recordAnswer(b.answerEvent!);
assert.equal(bGame.duplicate, true);
assert.equal(bGame.xpEarned, 0);
results.push({ scenario: "B retry cùng eventId", result: "+0 XP, duplicate" });

const c = parseDialogflowWebhook(dialogflowBody("W01_Q02_Wrong", { eventId: "aj-answer-2-wrong", queryText: "mất tinh", attempt: 1 }));
const cGame = engine.recordAnswer(c.answerEvent!);
assert.equal(c.correct, false);
assert.equal(cGame.xpEarned, 0);
results.push({ scenario: "C W01_Q02_Wrong", result: "+0 XP" });

const d = parseDialogflowWebhook(dialogflowBody("W01_Q02_Correct", { eventId: "aj-answer-2-correct", queryText: "kính mắt", attempt: 2 }));
const dGame = engine.recordAnswer(d.answerEvent!);
assert.equal(dGame.xpEarned, 8);
results.push({ scenario: "D đúng sau retry", result: "+8 XP" });

const eHint = parseDialogflowWebhook({
  ...dialogflowBody("W01_Hint_2", { eventId: "aj-hint-2", queryText: "gợi ý", hintLevel: 2, action: "HINT_USED" }),
  queryResult: {
    ...dialogflowBody("W01_Hint_2", { eventId: "aj-hint-2", queryText: "gợi ý", hintLevel: 2, action: "HINT_USED" }).queryResult,
    outputContexts: [{ name: "projects/local/agent/sessions/webhook-simulation/contexts/week01_question03",
      parameters: { studentId: "HS-AJ-001", displayName: "An", className: "3A",
        week: 1, topic: "c / k", hintLevel: 2, difficulty: "basic" } }],
  },
});
engine.recordHint(eHint.hintEvent!);
const e = parseDialogflowWebhook(dialogflowBody("W01_Q03_Correct", { eventId: "aj-answer-3", queryText: "cái cân", hintLevel: 2 }));
const eGame = engine.recordAnswer(e.answerEvent!);
assert.equal(eGame.xpEarned, 5);
results.push({ scenario: "E đúng với Hint 2", result: "+5 XP" });

const f = parseDialogflowWebhook(dialogflowBody("W01_Q09_Correct", { eventId: "aj-week-1", queryText: "kể chuyện" }));
assert.equal(f.eventType, "WEEK_COMPLETE");
assert.ok(f.weekCompleteEvent);
const fGame = engine.completeWeek(f.weekCompleteEvent);
assert.equal(fGame.xpEarned, 30);
results.push({ scenario: "F W01_Complete", result: "+30 XP" });

const g = parseDialogflowWebhook(dialogflowBody("W01_Q09_Correct", { eventId: "aj-week-1", queryText: "kể chuyện" }));
const gGame = engine.completeWeek(g.weekCompleteEvent!);
assert.equal(gGame.duplicate, true);
assert.equal(gGame.xpEarned, 0);
results.push({ scenario: "G W01_Complete duplicate", result: "+0 XP, duplicate" });

const h = parseDialogflowWebhook(dialogflowBody("Global_Progress", { eventId: "aj-progress" }));
assert.equal(h.eventType, "GET_PROGRESS");
const hResponse = buildDialogflowResponse({
  text: "Em đang ở Tuần 1 và có 53 XP.",
  payload: { success: true, eventType: h.eventType, progress: { currentWeek: 1, totalXP: 53 } },
  existingContexts: h.outputContexts,
});
assert.equal((hResponse.outputContexts?.[0]?.name ?? "").endsWith("/contexts/week01_active"), true);
results.push({ scenario: "H Global_Progress", result: "GET_PROGRESS + giữ context" });

assert.deepEqual(parseIntentName("W05_SUPPORT_Q02_Correct"), {
  week: 5, questionId: "W05_SUPPORT_Q02", result: "correct", support: true, eventType: "ANSWER_RESULT",
});

const falsePositive = parseDialogflowWebhook(dialogflowBody("W01_Q02_Correct", { eventId: "bad-answer", queryText: "mất tinh" }));
assert.equal(falsePositive.correct, false);
assert.equal(falsePositive.eventType, "ANSWER_RESULT");
results.push({ scenario: "K backend authority", result: "mất tinh bị chấm sai" });
const i = await explainRule({ week: 1, topic: "c / k", rule: "c / k", studentQuestion: "Khi nào viết k?" }, {
  generate: async () => JSON.stringify({
    explanation: "Trước e, ê, i, em thường viết k.",
    example: "Ví dụ: kẹo.",
    followUpQuestion: "Từ kim bắt đầu bằng chữ nào?",
  }),
});
assert.equal(i.success, true);
assert.equal(i.usedFallback, false);
results.push({ scenario: "I AI_Explain", result: "structured success" });

const j = await explainRule({ week: 2, topic: "g / gh", rule: "g / gh", studentQuestion: "Khi nào viết gh?" }, {
  generate: async () => new Promise<never>(() => undefined),
  timeoutMs: 5,
});
assert.equal(j.success, false);
assert.equal(j.usedFallback, true);
assert.equal(j.error, "AI_TIMEOUT");
assert.ok(j.explanation.length > 0);
results.push({ scenario: "J AI timeout", result: "static fallback" });

console.table(results);
console.log("Dialogflow webhook scenarios A-J: PASS");
