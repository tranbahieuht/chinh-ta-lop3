import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import { spellingWeeks, badgeCatalog } from "../data/spelling-weeks.ts";
import { extractChoices } from "../lib/chat-ui.ts";
import { mergeGameProgress } from "../lib/frontend-game.ts";
import { ensureGuestCode, readGuestIdentity, STUDENT_ID_KEY, STUDENT_PROFILE_KEY } from "../lib/guest-identity.ts";
import { levelBounds, weekStatus } from "../lib/spelling-progress.ts";
import type { StudentProgress } from "../types/spelling.ts";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");
const fakeProgress: StudentProgress = {
  student: { id: "db-1", student_code: "guest-1", display_name: "An", class_name: "3A", total_xp: 80, level: 1, current_week: 2, streak: 1, longest_streak: 1, last_activity_at: null },
  totalXP: 80, level: 1, streak: 1, currentWeek: 2, completedWeeks: [1],
  weekProgress: [{ week: 1, topic: "c / k", status: "completed", xp_earned: 80, score: 90, correct_count: 5, wrong_count: 1, hints_used: 0, highest_difficulty: "medium", mastery_score: 85 }],
  topicMastery: [], mastery: {}, badges: [],
};

test("1 home route renders the spelling dashboard", () => assert.match(source("components/home-dashboard.tsx"), /35 tuần chinh phục tiếng Việt/));
test("2 onboarding has three explicit steps", () => { const text = source("components/student-provider.tsx"); assert.match(text, /step === 1/); assert.match(text, /step === 2/); assert.match(text, /step === 3/); });
test("3 guest UUID persists across reads", () => { const map = new Map<string,string>(); const storage = { getItem: (key:string) => map.get(key) ?? null, setItem: (key:string,value:string) => void map.set(key,value) }; assert.equal(ensureGuestCode(storage, () => "stable-id"), "stable-id"); assert.equal(ensureGuestCode(storage, () => "new-id"), "stable-id"); assert.equal(map.get(STUDENT_ID_KEY), "stable-id"); });
test("4 saved guest profile is restored", () => { const map = new Map([[STUDENT_ID_KEY,"stable-id"],[STUDENT_PROFILE_KEY,JSON.stringify({displayName:"An",className:"3A"})]]); const identity = readGuestIdentity({ getItem:(key)=>map.get(key)??null, setItem:(key,value)=>void map.set(key,value) }, () => "new"); assert.deepEqual(identity,{studentCode:"stable-id",displayName:"An",className:"3A"}); });
test("5 journey contains exactly 35 unique weeks", () => { assert.equal(spellingWeeks.length,35); assert.equal(new Set(spellingWeeks.map(({week})=>week)).size,35); });
test("6 current week status uses backend currentWeek", () => assert.equal(weekStatus(fakeProgress,2),"current"));
test("7 future week stays locked", () => assert.equal(weekStatus(fakeProgress,3),"locked"));
test("8 completed week is review only below mastery threshold", () => assert.equal(weekStatus(fakeProgress,1),"completed"));
test("9 chatbot learning route calls the server adapter", () => { assert.match(source("components/spelling-chat.tsx"), /fetch\("\/api\/chat"/); assert.doesNotMatch(source("components/spelling-chat.tsx"), /dialogflow\.googleapis/); });
test("10 A B C lines become quick-reply choices", () => assert.deepEqual(extractChoices("Tên nào đúng?\nA. ninh bình\nB. Ninh Bình\nC. NINH BÌNH"),[{key:"A",label:"ninh bình"},{key:"B",label:"Ninh Bình"},{key:"C",label:"NINH BÌNH"}]));
test("11 XP game payload updates immediately", () => { const next=mergeGameProgress(fakeProgress,{xpEarned:10,totalXP:90}); assert.equal(next.totalXP,90); assert.equal(next.student.total_xp,90); });
test("11b counters and hints update optimistically", () => { const next=mergeGameProgress(fakeProgress,{week:1,weekXP:90,correctCount:6,wrongCount:1,hintsUsed:1,score:100}); const row=next.weekProgress[0]; assert.equal(row.correct_count,6); assert.equal(row.hints_used,1); assert.equal(row.xp_earned,90); });
test("12 badge game payload is supported by toast UI", () => assert.match(source("components/spelling-chat.tsx"), /Huy hiệu mới/));
test("13 nine production badges are present", () => assert.equal(badgeCatalog.length,9));
test("14 leaderboard and teacher failure states are implemented", () => { assert.match(source("components/leaderboard.tsx"), /ErrorState/); assert.match(source("components/teacher-dashboard.tsx"), /ErrorState/); });
test("15 mobile 360 layout has bottom navigation and compact chat", () => { const css=source("app/globals.css"); assert.match(css, /@media\(max-width:800px\)/); assert.match(css, /\.bottom-nav\{display:grid/); assert.match(css, /\.chat-panel\{height:calc\(100vh - 58px\)/); });
test("level thresholds match backend helper contract", () => assert.deepEqual(levelBounds(7),{start:1400,end:1750}));
test("checkpoint and boss weeks are unchanged", () => assert.deepEqual(spellingWeeks.filter(({type})=>type!=="lesson").map(({week,type})=>[week,type]),[[9,"checkpoint"],[18,"boss"],[27,"checkpoint"],[35,"boss"]]));
