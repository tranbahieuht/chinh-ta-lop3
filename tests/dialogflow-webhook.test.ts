import assert from "node:assert/strict";

import { parseDialogflowRequest, parseDialogflowWebhook } from "../lib/dialogflow/webhook.ts";

const body = {
  session: "projects/demo/agent/sessions/session-123",
  originalDetectIntentRequest: { payload: { metadata: { studentId: "3A001", displayName: "An", className: "3A" } } },
  queryResult: {
    queryText: "cây",
    action: "",
    intent: { displayName: "W01_Q01_Correct" },
    parameters: { eventId: "browser-event-1" },
    outputContexts: [{ parameters: { week: 1, questionId: "W01_Q01", topic: "c / k", correct: true, attempt: 1, hintLevel: 0, difficulty: "basic" } }],
  },
};

const answer = parseDialogflowWebhook(body);
assert.equal(answer.eventType, "ANSWER_RESULT");
assert.equal(answer.studentId, "3A001");
assert.equal(answer.eventId, "browser-event-1");
assert.equal(answer.answerEvent?.answer, "cây");
assert.equal(answer.answerEvent?.correct, true);

const complete = parseDialogflowWebhook({
  ...body,
  queryResult: { ...body.queryResult, queryText: "kể chuyện", intent: { displayName: "W01_Q09_Correct" }, parameters: { eventId: "week-event-1" } },
});
assert.equal(complete.eventType, "WEEK_COMPLETE");
assert.equal(complete.weekCompleteEvent?.week, 1);

const payloadWins = parseDialogflowWebhook({
  ...body,
  payload: { action: "GET_LEADERBOARD" },
  queryResult: { ...body.queryResult, intent: { displayName: "Unrelated Intent" }, parameters: { className: "3A" } },
});
assert.equal(payloadWins.eventType, "GET_LEADERBOARD");

const fulfillmentPayloadBody = {
  ...body,
  queryResult: {
    ...body.queryResult,
    intent: { displayName: "Unrelated Intent" },
    fulfillmentMessages: [{ payload: { schemaVersion: "3.0", action: "GET_SCORE", eventType: "GET_SCORE" } }],
  },
};
assert.equal(parseDialogflowRequest(fulfillmentPayloadBody).payload.action, "GET_SCORE");
assert.equal(parseDialogflowWebhook(fulfillmentPayloadBody).eventType, "GET_SCORE");

const guest = parseDialogflowWebhook({
  session: "projects/demo/agent/sessions/guest-session",
  queryResult: { intent: { displayName: "W02_Q01_Correct" }, parameters: {}, outputContexts: [{ parameters: { week: 2 } }] },
});
assert.equal(guest.studentId, "guest-guest-session");
const sameGuest = parseDialogflowWebhook({
  session: "projects/demo/agent/sessions/guest-session",
  queryResult: { intent: { displayName: "W02_Q02_Wrong" }, parameters: {}, outputContexts: [{ parameters: { week: 2 } }] },
});
assert.equal(sameGuest.studentId, guest.studentId, "Cùng Dialogflow session phải map vào cùng guest student.");

const falsePositive = parseDialogflowWebhook({
  ...body,
  queryResult: { ...body.queryResult, queryText: "mất tinh", intent: { displayName: "W01_Q02_Correct" } },
});
assert.equal(falsePositive.correct, false, "Backend phải bác đáp án sai dù Dialogflow match Correct Intent.");
assert.equal(falsePositive.questionId, "W01_Q02");

const hint = parseDialogflowWebhook({
  ...body,
  queryResult: { ...body.queryResult, queryText: "gợi ý", intent: { displayName: "W01_Hint_1" },
    outputContexts: [{ name: "projects/demo/agent/sessions/session-123/contexts/week01_question02", parameters: { week: 1, topic: "c / k" } }] },
});
assert.equal(hint.eventType, "HINT_USED");
assert.equal(hint.hintEvent?.questionId, "W01_Q02");

console.log("Dialogflow spelling webhook parsing: PASS");
