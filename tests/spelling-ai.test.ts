import assert from "node:assert/strict";

import { analyzeMistake, createSimilarQuestion, explainRule, feedbackAnswer, type StructuredGenerator } from "../lib/ai/spelling-ai.ts";
import { validateGeneratedQuestion } from "../lib/ai/question-validator.ts";

const returns = (value: unknown): StructuredGenerator => async () => typeof value === "string" ? value : JSON.stringify(value);
const unavailable: StructuredGenerator = async () => { throw new Error("mock unavailable"); };

const explanation = await explainRule({ week: 1, topic: "c / k", rule: "c/k trước các nguyên âm" }, {
  generate: returns({ explanation: "Trước e, ê, i, ta thường viết k; với nhiều nguyên âm khác, ta thường viết c.", example: "kẹo, cá", followUpQuestion: "Từ kim bắt đầu bằng chữ nào?" }),
});
assert.equal(explanation.success, true);
assert.match(explanation.explanation, /e, ê, i/, "1. explain c/k");

const correctFeedback = await feedbackAnswer({ week: 1, topic: "c / k", question: "Điền _ây", studentAnswer: "cây", correctAnswer: "cây", isCorrect: true, attempt: 1, hintLevel: 0, difficulty: "basic" }, {
  generate: returns({ feedback: "Em làm đúng rồi! Chữ c phù hợp khi đứng trước â.", shouldOfferHint: false, suggestedHintLevel: 0 }),
});
assert.equal(correctFeedback.shouldOfferHint, false, "2. feedback đúng");

const wrongFeedback = await feedbackAnswer({ week: 1, topic: "c / k", question: "Điền _ây", studentAnswer: "kây", correctAnswer: "cây", isCorrect: false, attempt: 1, hintLevel: 0, difficulty: "basic" }, {
  generate: returns({ feedback: "Em nhìn chữ đứng sau âm đầu rồi thử lại nhé.", shouldOfferHint: true, suggestedHintLevel: 1 }),
});
assert.equal(wrongFeedback.shouldOfferHint, true);
assert.doesNotMatch(wrongFeedback.feedback, /cây/i, "3. feedback sai không lộ đáp án");

const hint3 = await feedbackAnswer({ week: 1, topic: "c / k", question: "Điền _ây", studentAnswer: "kây", correctAnswer: "cây", isCorrect: false, attempt: 3, hintLevel: 3, difficulty: "basic_support" }, {
  generate: returns({ feedback: "Đáp án đúng là cây. Em đọc lại quy tắc nhé.", shouldOfferHint: false, suggestedHintLevel: 3 }),
});
assert.match(hint3.feedback, /cây/i, "4. hintLevel 3 được phép nêu đáp án");

const initial = await analyzeMistake({ week: 1, topic: "c / k", question: "Điền _ây", studentAnswer: "kây", correctAnswer: "cây", recentMistakes: [] }, { generate: unavailable });
assert.equal(initial.mistakeType, "CONFUSING_INITIAL", "5. analyze initial confusion");

const capitalization = await analyzeMistake({ week: 21, topic: "Viết hoa tên riêng", question: "Tên nào đúng?", studentAnswer: "ninh bình", correctAnswer: "Ninh Bình", recentMistakes: [] }, { generate: unavailable });
assert.equal(capitalization.mistakeType, "CAPITALIZATION", "6. analyze capitalization");

const similar = await createSimilarQuestion({ week: 1, topic: "c / k", rule: "c/k", sourceExamples: ["cá"], difficulty: "basic", avoidWords: ["cây"] }, {
  generate: returns({ question: "Điền c hoặc k: _ẹo ngọt", answer: "kẹo", hint1: "Nhìn chữ e.", hint2: "Trước e thường dùng k.", hint3: "Điền k để được kẹo.", difficulty: "basic" }),
});
assert.equal(similar.success, true);
assert.equal(similar.answer, "kẹo", "7. generate similar c/k");

const invalid = validateGeneratedQuestion({
  question: { question: "``` Điền c: cây", answer: "cây", hint1: "h1", hint2: "h2", hint3: "h3", difficulty: "basic" },
  avoidWords: ["cây"], sourceQuestion: "Điền c: cây",
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.includes("reuses_avoided_word"), "8. reject invalid generated question");

const timedOut = await explainRule({ week: 2, topic: "g / gh", rule: "g/gh" }, {
  generate: async () => new Promise(() => undefined), timeoutMs: 10,
});
assert.equal(timedOut.usedFallback, true);
assert.equal(timedOut.error, "AI_TIMEOUT", "9. Gemini timeout fallback");

const malformed = await createSimilarQuestion({ week: 1, topic: "c / k", rule: "c/k", sourceExamples: [], difficulty: "basic", avoidWords: [] }, {
  generate: returns("{not-json"),
});
assert.equal(malformed.usedFallback, true);
assert.ok(malformed.question.length > 0);
assert.ok(malformed.hint3.length > 0, "10. malformed JSON fallback static");

console.log("Spelling AI scenarios (10): PASS");

