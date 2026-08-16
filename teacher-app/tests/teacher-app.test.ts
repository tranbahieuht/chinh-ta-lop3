import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { summarizeDashboard, summarizeStudents, summarizeTopics, summarizeWeeks } from "../lib/analytics.ts";
import type { StudentRow, TopicMasteryRow, WeekProgressRow } from "../types/teacher.ts";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

const students: StudentRow[] = [
  { id: "s1", student_code: "3A001", display_name: "An", class_name: "3A", total_xp: 320, level: 3, current_week: 3, streak: 2, longest_streak: 4, last_activity_at: "2026-08-15T00:00:00Z" },
  { id: "s2", student_code: "3A002", display_name: "Bình", class_name: "3A", total_xp: 120, level: 2, current_week: 2, streak: 0, longest_streak: 1, last_activity_at: "2026-07-01T00:00:00Z" },
];
const progress: WeekProgressRow[] = [
  { student_id: "s1", week: 1, topic: "c / k", status: "completed", xp_earned: 80, score: 90, correct_count: 8, wrong_count: 1, hints_used: 1, mastery_score: 88, completed_at: "2026-08-14T00:00:00Z" },
  { student_id: "s2", week: 1, topic: "c / k", status: "in_progress", xp_earned: 20, score: 30, correct_count: 2, wrong_count: 6, hints_used: 4, mastery_score: 45, completed_at: null },
];
const mastery: TopicMasteryRow[] = [
  { student_id: "s1", topic: "c / k", mastery_score: 88, total_questions: 9, correct_first_try: 7, correct_after_hint: 1, wrong_answers: 1, hints_used: 1 },
  { student_id: "s2", topic: "c / k", mastery_score: 45, total_questions: 8, correct_first_try: 2, correct_after_hint: 0, wrong_answers: 6, hints_used: 4 },
];

test("dashboard aggregates real student, progress and mastery fields", () => {
  const list = summarizeStudents(students, progress, mastery, Date.parse("2026-08-16T00:00:00Z"));
  const topics = summarizeTopics(mastery);
  const dashboard = summarizeDashboard(list, topics, Date.parse("2026-08-16T00:00:00Z"));
  assert.equal(dashboard.totalStudents, 2);
  assert.equal(dashboard.activeStudents, 1);
  assert.equal(dashboard.hardestTopic?.topic, "c / k");
  assert.equal(dashboard.studentsNeedingSupport[0]?.name, "Bình");
  assert.equal(dashboard.topXP[0]?.name, "An");
});

test("progress always contains all 35 weeks", () => {
  const weeks = summarizeWeeks(students.length, progress);
  assert.equal(weeks.length, 35);
  assert.deepEqual(weeks.map((week) => week.week), Array.from({ length: 35 }, (_, index) => index + 1));
  assert.equal(weeks[0].completedStudents, 1);
});

test("weak topics are highlighted below 65 mastery", () => {
  const topics = summarizeTopics([{ ...mastery[1], topic: "s / x" }]);
  assert.equal(topics[0].isWeak, true);
});

test("all required pages and GET APIs exist", () => {
  for (const path of ["app/page.tsx", "app/students/page.tsx", "app/students/[id]/page.tsx", "app/progress/page.tsx", "app/topics/page.tsx"]) assert.ok(source(path).length > 0, path);
  for (const path of ["app/api/classes/route.ts", "app/api/dashboard/route.ts", "app/api/students/route.ts", "app/api/students/[id]/route.ts", "app/api/progress/route.ts", "app/api/topics/route.ts"]) assert.match(source(path), /export async function GET/);
});

test("teacher data layer and APIs expose no mutation methods", () => {
  const code = ["lib/data.ts", "app/api/classes/route.ts", "app/api/dashboard/route.ts", "app/api/students/route.ts", "app/api/students/[id]/route.ts", "app/api/progress/route.ts", "app/api/topics/route.ts"].map(source).join("\n");
  assert.doesNotMatch(code, /\.(insert|update|upsert|delete|rpc)\s*\(/);
  assert.doesNotMatch(code, /export async function (POST|PUT|PATCH|DELETE)/);
});

test("responsive layouts cover tablet and mobile widths", () => {
  const css = source("app/globals.css");
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /td::before \{ content: attr\(data-label\)/);
});

test("standalone CSS config does not inherit parent Tailwind", () => {
  const css = source("app/globals.css");
  const postcss = source("postcss.config.mjs");
  const packageJson = JSON.parse(source("package.json")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  assert.doesNotMatch(css, /@import\s+["']tailwindcss|@tailwind|@apply|@theme|@utility/);
  assert.match(postcss, /plugins:\s*\{\}/);
  assert.equal(packageJson.dependencies?.tailwindcss ?? packageJson.devDependencies?.tailwindcss, undefined);
  assert.equal(packageJson.dependencies?.["@tailwindcss/postcss"] ?? packageJson.devDependencies?.["@tailwindcss/postcss"], undefined);
});
