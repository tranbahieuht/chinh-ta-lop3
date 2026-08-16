import "server-only";

import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { isUuid, safeIdentifier, safeText } from "@/lib/security/input";
import type { AnswerEvent, GamificationResult, WeekCompleteEvent } from "./types";

export class GamificationDatabaseError extends Error {
  constructor() {
    super("Không thể cập nhật tiến độ lúc này.");
    this.name = "GamificationDatabaseError";
  }
}

function databaseError(message: string): Error {
  console.error("[chinh-ta/database]", message);
  return new GamificationDatabaseError();
}

function asGamificationResult(value: unknown): GamificationResult {
  if (!value || typeof value !== "object") throw databaseError("RPC returned an invalid result");
  return value as GamificationResult;
}

function logGamificationResult(eventType: "ANSWER_RESULT" | "WEEK_COMPLETE", week: number, result: GamificationResult) {
  console.info("[chinh-ta/gamification]", {
    eventType,
    week,
    status: result.duplicate ? "duplicate" : "committed",
    xpAwarded: result.xpEarned,
    level: result.level,
    badgesAwarded: result.newBadges.length,
  });
}

export async function recordAnswerEvent(event: AnswerEvent): Promise<GamificationResult> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("chinh_ta_record_answer", {
    p_event_id: event.eventId,
    p_student_code: event.studentCode,
    p_display_name: event.displayName ?? "",
    p_class_name: event.className ?? "",
    p_week: event.week,
    p_question_id: event.questionId,
    p_topic: event.topic,
    p_answer: event.answer ?? "",
    p_correct: event.correct,
    p_attempt: event.attempt,
    p_hint_level: event.hintLevel,
    p_difficulty: event.difficulty,
    p_mastery_signal: event.masterySignal ?? "",
    p_event_type: event.eventType ?? "ANSWER_RESULT",
    p_occurred_at: event.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw databaseError(`record answer: ${error.message}`);
  const result = asGamificationResult(data);
  logGamificationResult("ANSWER_RESULT", event.week, result);
  return result;
}

export async function completeWeekEvent(event: WeekCompleteEvent): Promise<GamificationResult> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("chinh_ta_complete_week", {
    p_event_id: event.eventId,
    p_student_code: event.studentCode,
    p_display_name: event.displayName ?? "",
    p_class_name: event.className ?? "",
    p_week: event.week,
    p_topic: event.topic,
    p_occurred_at: event.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw databaseError(`complete week: ${error.message}`);
  const result = asGamificationResult(data);
  logGamificationResult("WEEK_COMPLETE", event.week, result);
  return result;
}

type StudentRow = {
  id: string;
  student_code: string;
  display_name: string;
  class_name: string;
  total_xp: number;
  level: number;
  current_week: number;
  streak: number;
  longest_streak: number;
  last_activity_at: string | null;
};

async function findStudent(studentReference: string): Promise<StudentRow | null> {
  const db = getSupabaseAdmin();
  const reference = safeIdentifier(studentReference);
  let query = db.from("students").select("*");
  query = isUuid(studentReference) ? query.eq("id", studentReference) : query.eq("student_code", reference);
  const { data, error } = await query.maybeSingle();
  if (error) throw databaseError(`find student: ${error.message}`);
  return data as StudentRow | null;
}

export async function getStudentProgress(studentReference: string) {
  const db = getSupabaseAdmin();
  const student = await findStudent(studentReference);
  if (!student) return null;
  const [weekResult, masteryResult, badgeResult] = await Promise.all([
    db.from("week_progress").select("*").eq("student_id", student.id).order("week"),
    db.from("topic_mastery").select("*").eq("student_id", student.id).order("topic"),
    db.from("student_badges").select("earned_at,badges(badge_code,name,description,icon)").eq("student_id", student.id).order("earned_at"),
  ]);
  const firstError = weekResult.error ?? masteryResult.error ?? badgeResult.error;
  if (firstError) throw databaseError(`progress query: ${firstError.message}`);
  const weekProgress = weekResult.data ?? [];
  const topicMastery = masteryResult.data ?? [];
  return {
    student,
    totalXP: student.total_xp,
    level: student.level,
    streak: student.streak,
    currentWeek: student.current_week,
    completedWeeks: weekProgress.filter((row) => row.status === "completed").map((row) => row.week),
    weekProgress,
    topicMastery,
    mastery: Object.fromEntries(topicMastery.map((row) => [topicKey(String(row.topic)), row.mastery_score])),
    badges: badgeResult.data ?? [],
  };
}

function topicKey(topic: string): string {
  return topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function currentVietnamWeekRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const numberPart = (name: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === name)?.value);
  const localMidnightAsUtc = Date.UTC(numberPart("year"), numberPart("month") - 1, numberPart("day"));
  const daysSinceMonday = (new Date(localMidnightAsUtc).getUTCDay() + 6) % 7;
  const startMs = localMidnightAsUtc - daysSinceMonday * 86_400_000 - 7 * 3_600_000;
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + 7 * 86_400_000).toISOString() };
}

export async function getLeaderboard(className: string, period: "weekly" | "all_time") {
  const db = getSupabaseAdmin();
  const safeClass = safeText(className, "", 40);
  let studentsQuery = db.from("students").select("id,student_code,display_name,total_xp,level,class_name");
  if (safeClass) studentsQuery = studentsQuery.eq("class_name", safeClass);
  const { data: students, error } = await studentsQuery;
  if (error) throw databaseError(`leaderboard students: ${error.message}`);
  const rows = students ?? [];
  let xpByStudent = new Map(rows.map((student) => [student.id, Number(student.total_xp)]));
  if (period === "weekly" && rows.length) {
    const range = currentVietnamWeekRange();
    const { data: events, error: eventsError } = await db.from("learning_events")
      .select("student_id,xp_awarded").in("student_id", rows.map((student) => student.id))
      .gte("created_at", range.start).lt("created_at", range.end);
    if (eventsError) throw databaseError(`weekly leaderboard: ${eventsError.message}`);
    xpByStudent = new Map(rows.map((student) => [student.id, 0]));
    for (const event of events ?? []) xpByStudent.set(event.student_id, (xpByStudent.get(event.student_id) ?? 0) + Number(event.xp_awarded));
  }
  return rows.map((student) => ({
    studentId: student.id,
    name: student.display_name,
    xp: xpByStudent.get(student.id) ?? 0,
    level: student.level,
  })).sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, "vi"))
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

export async function getTeacherClassSummary(className: string) {
  const db = getSupabaseAdmin();
  const safeClass = safeText(className, "", 40);
  if (!safeClass) throw new Error("className không hợp lệ.");
  const { data: students, error } = await db.from("students").select("id,student_code,display_name,total_xp,level,current_week,last_activity_at")
    .eq("class_name", safeClass);
  if (error) throw databaseError(`class students: ${error.message}`);
  const rows = students ?? [];
  if (!rows.length) return { numberOfStudents: 0, activeStudents: 0, averageProgress: 0, averageMastery: 0, hardestTopics: [], topXPStudents: [], studentsNeedingSupport: [] };
  const ids = rows.map((student) => student.id);
  const [progressResult, masteryResult] = await Promise.all([
    db.from("week_progress").select("student_id,week,status,wrong_count,hints_used").in("student_id", ids),
    db.from("topic_mastery").select("student_id,topic,mastery_score,wrong_answers,hints_used,total_questions").in("student_id", ids),
  ]);
  const firstError = progressResult.error ?? masteryResult.error;
  if (firstError) throw databaseError(`class summary: ${firstError.message}`);
  const progress = progressResult.data ?? [];
  const mastery = masteryResult.data ?? [];
  const activeCutoff = Date.now() - 7 * 86_400_000;
  const topicGroups = new Map<string, number[]>();
  for (const row of mastery) topicGroups.set(row.topic, [...(topicGroups.get(row.topic) ?? []), Number(row.mastery_score)]);
  const hardestTopics = [...topicGroups].map(([topic, scores]) => ({
    topic, mastery: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
  })).sort((a, b) => a.mastery - b.mastery).slice(0, 5);
  const supportIds = new Set(mastery.filter((row) => Number(row.mastery_score) < 65 || Number(row.hints_used) + Number(row.wrong_answers) >= Math.max(3, Number(row.total_questions) / 2)).map((row) => row.student_id));
  for (const row of progress) if (Number(row.wrong_count) + Number(row.hints_used) >= 5) supportIds.add(row.student_id);
  const completedCount = progress.filter((row) => row.status === "completed").length;
  return {
    numberOfStudents: rows.length,
    activeStudents: rows.filter((row) => row.last_activity_at && new Date(row.last_activity_at).getTime() >= activeCutoff).length,
    averageProgress: Math.round((completedCount / (rows.length * 35)) * 100),
    averageMastery: mastery.length ? Math.round(mastery.reduce((sum, row) => sum + Number(row.mastery_score), 0) / mastery.length) : 0,
    hardestTopics,
    topXPStudents: [...rows].sort((a, b) => Number(b.total_xp) - Number(a.total_xp)).slice(0, 5)
      .map((row) => ({ studentId: row.id, name: row.display_name, xp: row.total_xp, level: row.level })),
    studentsNeedingSupport: rows.filter((row) => supportIds.has(row.id))
      .map((row) => ({ studentId: row.id, studentCode: row.student_code, name: row.display_name, currentWeek: row.current_week })),
  };
}

export async function getStudentBadges(studentReference: string) {
  const progress = await getStudentProgress(studentReference);
  return progress ? progress.badges : null;
}
