import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

import { getSupabaseAdmin } from "../lib/db/supabase-admin.ts";

try { loadEnvFile(".env.local"); } catch { /* CI/Vercel can inject variables directly. */ }

if (process.env.DATABASE_TEST_MODE !== "cleanup") {
  throw new Error("Đặt DATABASE_TEST_MODE=cleanup để xác nhận test được phép tạo và xóa đúng một test student.");
}

const db = getSupabaseAdmin();
const runId = randomUUID();
const studentCode = `dbtest_${runId.replaceAll("-", "").slice(0, 20)}`;
const eventId = `db-smoke-${runId}`;
let studentId = "";

function rpcArguments() {
  return {
    p_event_id: eventId,
    p_student_code: studentCode,
    p_display_name: "Database smoke test",
    p_class_name: "SMOKE_TEST",
    p_week: 1,
    p_question_id: "W01_Q01",
    p_topic: "c / k",
    p_answer: "cây",
    p_correct: true,
    p_attempt: 1,
    p_hint_level: 0,
    p_difficulty: "basic",
    p_mastery_signal: "production_smoke",
    p_event_type: "ANSWER_RESULT",
    p_occurred_at: new Date().toISOString(),
  };
}

try {
  const connection = await db.from("badges").select("badge_code", { count: "exact" }).limit(9);
  assert.equal(connection.error, null, `Không kết nối được database: ${connection.error?.message}`);
  assert.ok((connection.count ?? 0) >= 9, "Badge seed chưa đầy đủ; hãy chạy supabase/production_setup.sql.");

  const first = await db.rpc("chinh_ta_record_answer", rpcArguments());
  assert.equal(first.error, null, `RPC ghi đáp án lỗi: ${first.error?.message}`);
  const firstResult = first.data as { duplicate?: boolean; xpEarned?: number; totalXP?: number };
  assert.equal(firstResult.duplicate, false);
  assert.equal(firstResult.xpEarned, 10);
  assert.equal(firstResult.totalXP, 10);

  const student = await db.from("students")
    .select("id,total_xp,current_week")
    .eq("student_code", studentCode)
    .single();
  assert.equal(student.error, null, `Không đọc được test student: ${student.error?.message}`);
  studentId = String(student.data?.id ?? "");
  assert.ok(studentId);
  assert.equal(student.data?.total_xp, 10);

  const [event, answer, week, mastery] = await Promise.all([
    db.from("learning_events").select("xp_awarded").eq("event_id", eventId).single(),
    db.from("answer_history").select("xp_earned,correct").eq("event_id", eventId).single(),
    db.from("week_progress").select("xp_earned,correct_count").eq("student_id", studentId).eq("week", 1).single(),
    db.from("topic_mastery").select("mastery_score,total_questions").eq("student_id", studentId).eq("topic", "c / k").single(),
  ]);
  for (const query of [event, answer, week, mastery]) assert.equal(query.error, null, query.error?.message);
  assert.equal(event.data?.xp_awarded, 10);
  assert.equal(answer.data?.xp_earned, 10);
  assert.equal(answer.data?.correct, true);
  assert.equal(week.data?.xp_earned, 10);
  assert.equal(week.data?.correct_count, 1);
  assert.equal(mastery.data?.mastery_score, 58);
  assert.equal(mastery.data?.total_questions, 1);

  const retry = await db.rpc("chinh_ta_record_answer", rpcArguments());
  assert.equal(retry.error, null, retry.error?.message);
  const retryResult = retry.data as { duplicate?: boolean; xpEarned?: number; totalXP?: number };
  assert.equal(retryResult.duplicate, true);
  assert.equal(retryResult.xpEarned, 0);
  assert.equal(retryResult.totalXP, 10);

  console.log("Database smoke: PASS (connect, badge seed, atomic answer event, XP, progress, mastery, duplicate protection).");
} finally {
  const cleanup = await db.from("students").delete().eq("student_code", studentCode);
  if (cleanup.error) throw new Error(`Không cleanup được test student: ${cleanup.error.message}`);
  const remaining = await db.from("students").select("id", { count: "exact", head: true }).eq("student_code", studentCode);
  if (remaining.error || remaining.count !== 0) throw new Error("Cleanup test student chưa hoàn tất.");
  console.log("Database smoke cleanup: PASS");
}
