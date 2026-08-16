import assert from "node:assert/strict";

import { getQuestionDefinition } from "../lib/dialogflow/answer-validator.ts";
import { parseDialogflowWebhook } from "../lib/dialogflow/webhook.ts";
import { mergeGameProgress } from "../lib/frontend-game.ts";
import { InMemoryGamificationEngine } from "../lib/gamification/simulation.ts";
import type { GamePayload, StudentProgress } from "../types/spelling.ts";

const studentCode = "integration-student-a";
const session = "projects/local/agent/sessions/integration-a";
const engine = new InMemoryGamificationEngine();
let ui: StudentProgress = {
  student: { id: "db-a", student_code: studentCode, display_name: "An", class_name: "3A", total_xp: 0,
    level: 1, current_week: 1, streak: 0, longest_streak: 0, last_activity_at: null },
  totalXP: 0, level: 1, streak: 0, currentWeek: 1, completedWeeks: [], weekProgress: [],
  topicMastery: [], mastery: {}, badges: [],
};

function body(intent: string, answer: string, eventId: string, questionContext: string, hintLevel = 0) {
  return {
    responseId: `response-${eventId}`, session,
    originalDetectIntentRequest: { payload: { studentId: studentCode, displayName: "An", className: "3A" } },
    payload: { eventId },
    queryResult: { queryText: answer, languageCode: "vi", intent: { displayName: intent }, parameters: {},
      outputContexts: [{ name: `${session}/contexts/${questionContext}`, lifespanCount: 10,
        parameters: { week: 1, topic: "c / k", attempt: 1, hintLevel, difficulty: "basic" } }] },
  };
}

function payload(result: ReturnType<InMemoryGamificationEngine["recordAnswer"]>, questionId: string): GamePayload {
  return { studentCode, week: 1, topic: "c / k", questionId, xpEarned: result.xpEarned,
    weekXP: result.weekXP, totalXP: result.totalXP, level: result.level, streak: result.streak,
    mastery: result.mastery, correctCount: result.correctCount, wrongCount: result.wrongCount,
    hintsUsed: result.hintsUsed, score: result.score, duplicate: result.duplicate };
}

// A. Correct answer persists +10 and updates the optimistic sidebar.
const first = parseDialogflowWebhook(body("W01_Q01_Correct", "cây", "a-correct", "week01_question01"));
const firstGame = engine.recordAnswer(first.answerEvent!);
ui = mergeGameProgress(ui, payload(firstGame, first.questionId));
assert.equal(firstGame.xpEarned, 10);
assert.equal(ui.totalXP, 10);
assert.equal(ui.weekProgress[0].correct_count, 1);

// B. A false-positive Correct intent is rejected by the deterministic authority.
const wrong = parseDialogflowWebhook(body("W01_Q02_Correct", "mất tinh", "b-wrong", "week01_question02"));
assert.equal(wrong.correct, false);
const wrongGame = engine.recordAnswer(wrong.answerEvent!);
ui = mergeGameProgress(ui, payload(wrongGame, wrong.questionId));
assert.equal(wrongGame.xpEarned, 0);
assert.equal(ui.totalXP, 10);

// C. Hint is direct human text, persisted once, and never exposes a context expression.
const hint = parseDialogflowWebhook(body("W01_Hint_1", "gợi ý", "c-hint", "week01_question02", 1));
const hintText = `Gợi ý 1: ${getQuestionDefinition(hint.questionId)?.hint1 ?? ""}`;
assert.doesNotMatch(hintText, /#week|#context|hint1Text/);
const hintGame = engine.recordHint(hint.hintEvent!);
ui = mergeGameProgress(ui, payload(hintGame, hint.questionId));
assert.equal(ui.weekProgress[0].hints_used, 1);

// D. Correct after Hint 1 uses the backend XP rule and updates all counters.
const corrected = parseDialogflowWebhook(body("W01_Q02_Correct", "kính mắt", "d-correct", "week01_question02", 1));
const correctedGame = engine.recordAnswer(corrected.answerEvent!);
ui = mergeGameProgress(ui, payload(correctedGame, corrected.questionId));
assert.equal(correctedGame.xpEarned, 7);
assert.equal(ui.totalXP, 17);
assert.equal(ui.weekProgress[0].correct_count, 2);
assert.equal(ui.weekProgress[0].wrong_count, 1);
assert.equal(ui.weekProgress[0].hints_used, 1);

// E. A fresh read returns the same persisted source of truth.
const reloaded = engine.snapshot(studentCode)!;
assert.equal(reloaded.totalXP, 17);
assert.deepEqual(reloaded.weeks[1], { xp: 17, score: 20, correct: 2, wrong: 1, hints: 1 });

// F. Retrying the same event does not add XP or counters.
const duplicate = engine.recordAnswer(corrected.answerEvent!);
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.xpEarned, 0);
assert.equal(engine.snapshot(studentCode)?.totalXP, 17);
assert.deepEqual(engine.snapshot(studentCode)?.weeks[1], reloaded.weeks[1]);

console.log("Production-like learning flow A-F: PASS");
