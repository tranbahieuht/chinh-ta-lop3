import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

try { loadEnvFile(".env.local"); } catch { /* Vercel/CI injects environment variables directly. */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error("Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY để seed demo.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Không seed demo trong production.");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const students = [
  ["3A001", "An"], ["3A002", "Bình"], ["3A003", "Chi"], ["3A004", "Dũng"], ["3A005", "Em"],
] as const;

for (const [index, [studentCode, displayName]] of students.entries()) {
  for (let question = 1; question <= index + 1; question += 1) {
    const { error } = await db.rpc("chinh_ta_record_answer", {
      p_event_id: `demo-${studentCode}-w1-q${question}`,
      p_student_code: studentCode,
      p_display_name: displayName,
      p_class_name: "3A",
      p_week: 1,
      p_question_id: `W01_Q${String(question).padStart(2, "0")}`,
      p_topic: "c / k",
      p_answer: "demo",
      p_correct: true,
      p_attempt: index % 2 ? 2 : 1,
      p_hint_level: index % 3,
      p_difficulty: index > 2 ? "medium" : "basic",
      p_mastery_signal: "demo_seed",
      p_event_type: "ANSWER_RESULT",
      p_occurred_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

console.log("Seeded 5 demo students in class 3A. Re-running is safe because event IDs are idempotent.");

