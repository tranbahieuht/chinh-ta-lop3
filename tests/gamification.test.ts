import assert from "node:assert/strict";

import { InMemoryGamificationEngine } from "../lib/gamification/simulation.ts";
import { calculateAnswerXP, calculateLevel, updateMastery, updateStreak } from "../lib/gamification/rules.ts";

assert.equal(calculateAnswerXP({ correct: true, attempt: 1, hintLevel: 0 }), 10, "1. đúng lần đầu +10 XP");
assert.equal(calculateAnswerXP({ correct: true, attempt: 2, hintLevel: 2 }), 5, "2. Hint 2 +5 XP");

const engine = new InMemoryGamificationEngine();
const base = { studentCode: "HS001", displayName: "An", className: "3A", week: 1, questionId: "W01_Q01", topic: "c / k", answer: "cây", correct: true, attempt: 1, hintLevel: 0, difficulty: "basic", occurredAt: "2026-08-10T02:00:00.000Z" };
const first = engine.recordAnswer({ ...base, eventId: "event-1" });
const duplicate = engine.recordAnswer({ ...base, eventId: "event-1" });
assert.equal(first.xpEarned, 10);
assert.equal(duplicate.xpEarned, 0);
assert.equal(duplicate.totalXP, 10, "3. duplicate không cộng XP");

const withHint = new InMemoryGamificationEngine();
withHint.recordAnswer({ ...base, eventId: "hint-event", hintLevel: 1 });
assert.equal(withHint.completeWeek({ eventId: "complete-hint", studentCode: "HS001", week: 1, topic: "c / k" }).xpEarned, 30, "4. hoàn thành tuần +30");
assert.equal(engine.completeWeek({ eventId: "complete-no-hint", studentCode: "HS001", week: 1, topic: "c / k" }).xpEarned, 50, "5. no-hint bonus +20");

assert.equal(calculateLevel(100), 2);
assert.equal(calculateLevel(700), 5, "6. level up");
const streak1 = updateStreak(0, 0, null, "2026-08-10T02:00:00.000Z");
const streakSameDay = updateStreak(streak1.streak, streak1.longestStreak, streak1.lastActivityAt, "2026-08-10T12:00:00.000Z");
const streakNextDay = updateStreak(streakSameDay.streak, streakSameDay.longestStreak, streakSameDay.lastActivityAt, "2026-08-11T02:00:00.000Z");
assert.equal(streakSameDay.streak, 1);
assert.equal(streakNextDay.streak, 2, "7. streak theo Asia/Ho_Chi_Minh");
assert.equal(updateMastery(50, { correct: true, attempt: 1, hintLevel: 0 }), 58);
assert.equal(updateMastery(2, { correct: false, attempt: 1, hintLevel: 0 }), 0, "8. mastery clamp");
const badgeEngine = new InMemoryGamificationEngine();
const completion = badgeEngine.completeWeek({ eventId: "first-week", studentCode: "HS003", week: 1, topic: "c / k" });
assert.ok(completion.newBadges.includes("FIRST_WEEK"), "9. badge FIRST_WEEK");

engine.recordAnswer({ ...base, eventId: "event-student-2", studentCode: "HS002", displayName: "Bình", occurredAt: "2026-07-01T02:00:00.000Z" });
const weekly = engine.leaderboard("weekly", { start: "2026-08-10T00:00:00.000Z", end: "2026-08-17T00:00:00.000Z" });
assert.equal(weekly[0].name, "An", "10. leaderboard weekly chỉ tính ledger trong kỳ");

console.log("Chính tả gamification scenarios (10): PASS");
