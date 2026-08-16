import { createServer } from "node:http";

const studentId = "11111111-1111-4111-8111-111111111111";
const students = [
  { id: studentId, student_code: "3A001", display_name: "Nguyễn Minh An", class_name: "3A", total_xp: 380, level: 3, current_week: 3, streak: 3, longest_streak: 5, last_activity_at: "2026-08-16T01:00:00Z" },
  { id: "22222222-2222-4222-8222-222222222222", student_code: "3A002", display_name: "Trần Gia Bình", class_name: "3A", total_xp: 140, level: 2, current_week: 2, streak: 1, longest_streak: 2, last_activity_at: "2026-08-15T02:00:00Z" },
];
const weekProgress = [
  { student_id: studentId, week: 1, topic: "c / k", status: "completed", xp_earned: 100, score: 90, correct_count: 8, wrong_count: 1, hints_used: 1, mastery_score: 88, completed_at: "2026-08-12T01:00:00Z", updated_at: "2026-08-12T01:00:00Z" },
  { student_id: studentId, week: 2, topic: "g / gh", status: "completed", xp_earned: 110, score: 95, correct_count: 9, wrong_count: 1, hints_used: 0, mastery_score: 91, completed_at: "2026-08-15T01:00:00Z", updated_at: "2026-08-15T01:00:00Z" },
  { student_id: students[1].id, week: 1, topic: "c / k", status: "in_progress", xp_earned: 35, score: 40, correct_count: 3, wrong_count: 5, hints_used: 4, mastery_score: 48, completed_at: null, updated_at: "2026-08-15T02:00:00Z" },
];
const topicMastery = [
  { student_id: studentId, topic: "c / k", mastery_score: 88, total_questions: 9, correct_first_try: 7, correct_after_hint: 1, wrong_answers: 1, hints_used: 1, updated_at: "2026-08-12T01:00:00Z" },
  { student_id: studentId, topic: "g / gh", mastery_score: 91, total_questions: 10, correct_first_try: 9, correct_after_hint: 0, wrong_answers: 1, hints_used: 0, updated_at: "2026-08-15T01:00:00Z" },
  { student_id: students[1].id, topic: "c / k", mastery_score: 48, total_questions: 8, correct_first_try: 3, correct_after_hint: 0, wrong_answers: 5, hints_used: 4, updated_at: "2026-08-15T02:00:00Z" },
];
const events = [
  { event_id: "mock-event-1", student_id: studentId, event_type: "WEEK_COMPLETE", week: 2, topic: "g / gh", xp_awarded: 30, payload: {}, created_at: "2026-08-15T01:00:00Z" },
  { event_id: "mock-event-2", student_id: studentId, event_type: "ANSWER_RESULT", week: 2, topic: "g / gh", xp_awarded: 10, payload: {}, created_at: "2026-08-15T00:55:00Z" },
];

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3102");
  let rows = [];
  if (url.pathname.endsWith("/students")) rows = students;
  else if (url.pathname.endsWith("/week_progress")) rows = weekProgress;
  else if (url.pathname.endsWith("/topic_mastery")) rows = topicMastery;
  else if (url.pathname.endsWith("/learning_events")) rows = events;
  const idFilter = url.searchParams.get("id")?.replace(/^eq\./, "");
  const classFilter = url.searchParams.get("class_name")?.replace(/^eq\./, "");
  const studentFilter = url.searchParams.get("student_id");
  if (idFilter) rows = rows.filter((row) => row.id === idFilter);
  if (classFilter) rows = rows.filter((row) => row.class_name === classFilter);
  if (studentFilter?.startsWith("eq.")) rows = rows.filter((row) => row.student_id === studentFilter.slice(3));
  if (studentFilter?.startsWith("in.(")) {
    const ids = studentFilter.slice(4, -1).split(",");
    rows = rows.filter((row) => ids.includes(row.student_id));
  }
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "content-range": `0-${Math.max(0, rows.length - 1)}/${rows.length}` });
  response.end(JSON.stringify(rows));
});

server.listen(3102, "127.0.0.1", () => console.log("Mock Supabase REST ready on 3102"));
