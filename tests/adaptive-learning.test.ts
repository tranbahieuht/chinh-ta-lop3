import assert from "node:assert/strict";
import { getNextDifficulty, getPracticeDifficulty } from "../lib/adaptive-learning.ts";

assert.equal(getPracticeDifficulty(0), "advanced");
assert.equal(getPracticeDifficulty(1), "standard");
assert.equal(getPracticeDifficulty(2), "basic");
assert.equal(getPracticeDifficulty(3), "very_basic");

console.log("Level 0 -> advanced: PASS");
console.log("Level 1 -> standard: PASS");
console.log("Level 2 -> basic: PASS");
console.log("Level 3 -> very_basic: PASS");

assert.equal(getNextDifficulty("basic", { isCorrect: true, attemptCount: 1, hintCount: 0 }), "standard");
assert.equal(getNextDifficulty("standard", { isCorrect: true, attemptCount: 1, hintCount: 0 }), "advanced");
assert.equal(getNextDifficulty("advanced", { isCorrect: false, attemptCount: 2, hintCount: 0 }), "standard");
assert.equal(getNextDifficulty("very_basic", { isCorrect: true, attemptCount: 1, hintCount: 0 }), "basic");
assert.equal(getNextDifficulty("standard", { isCorrect: true, attemptCount: 1, hintCount: 1 }), "standard");
assert.equal(getNextDifficulty("basic", { isCorrect: true, attemptCount: 2, hintCount: 2 }), "very_basic");

console.log("Adaptive practice transitions: PASS");
