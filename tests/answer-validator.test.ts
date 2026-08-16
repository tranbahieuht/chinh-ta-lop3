import assert from "node:assert/strict";

import { questionCatalogStats, validateQuestionAnswer } from "../lib/dialogflow/answer-validator.ts";

const stats = questionCatalogStats();
assert.equal(stats.questions, 420);
assert.equal(stats.uniqueQuestionIds, 420);
assert.equal(stats.questionsWithAcceptedAnswers, 420);

assert.equal(validateQuestionAnswer("W01_Q02", "kính mắt").accepted, true);
assert.equal(validateQuestionAnswer("W01_Q02", "k").accepted, true);
assert.equal(validateQuestionAnswer("W01_Q02", "mất tinh").accepted, false);
assert.equal(validateQuestionAnswer("W01_Q02", "kinh mat").accepted, false, "Dấu tiếng Việt phải được giữ.");

assert.equal(validateQuestionAnswer("W21_Q01", "B").accepted, true);
assert.equal(validateQuestionAnswer("W21_Q01", "Cúc Phương").accepted, true);
assert.equal(validateQuestionAnswer("W21_Q01", "cúc phương").accepted, false, "Viết hoa phải phân biệt hoa/thường.");

assert.equal(validateQuestionAnswer("W34_Q07", "Ô-lim-pi-a").accepted, true);
assert.equal(validateQuestionAnswer("W34_Q07", "Ô lim pi a").accepted, false, "Tên riêng có gạch nối phải giữ gạch nối.");

console.log("Deterministic spelling answer validator: PASS");
