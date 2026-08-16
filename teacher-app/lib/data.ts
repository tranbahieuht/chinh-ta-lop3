import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { summarizeDashboard, summarizeStudents, summarizeTopics, summarizeWeeks } from "@/lib/analytics";
import type { LearningEventRow, StudentDetail, StudentRow, TopicMasteryRow, WeekProgressRow } from "@/types/teacher";

const STUDENT_COLUMNS = "id,student_code,display_name,class_name,total_xp,level,current_week,streak,longest_streak,last_activity_at";
const PROGRESS_COLUMNS = "student_id,week,topic,status,xp_earned,score,correct_count,wrong_count,hints_used,mastery_score,completed_at,updated_at";
const MASTERY_COLUMNS = "student_id,topic,mastery_score,total_questions,correct_first_try,correct_after_hint,wrong_answers,hints_used,updated_at";

function cleanClassName(className?: string) {
  return className?.trim().slice(0, 40) || undefined;
}

async function getStudentRows(className?: string) {
  const db = getSupabaseAdmin();
  let query = db.from("students").select(STUDENT_COLUMNS).order("display_name", { ascending: true });
  const safeClassName = cleanClassName(className);
  if (safeClassName) query = query.eq("class_name", safeClassName);
  const { data, error } = await query;
  if (error) throw new Error(`Không tải được danh sách học sinh: ${error.message}`);
  return (data ?? []) as StudentRow[];
}

async function getLearningRows(studentIds: string[]) {
  if (!studentIds.length) return { progress: [] as WeekProgressRow[], mastery: [] as TopicMasteryRow[] };
  const db = getSupabaseAdmin();
  const [progressResult, masteryResult] = await Promise.all([
    db.from("week_progress").select(PROGRESS_COLUMNS).in("student_id", studentIds),
    db.from("topic_mastery").select(MASTERY_COLUMNS).in("student_id", studentIds),
  ]);
  const error = progressResult.error ?? masteryResult.error;
  if (error) throw new Error(`Không tải được dữ liệu tiến độ: ${error.message}`);
  return {
    progress: (progressResult.data ?? []) as WeekProgressRow[],
    mastery: (masteryResult.data ?? []) as TopicMasteryRow[],
  };
}

export async function getClasses() {
  const { data, error } = await getSupabaseAdmin().from("students").select("class_name").order("class_name");
  if (error) throw new Error(`Không tải được danh sách lớp: ${error.message}`);
  return [...new Set((data ?? []).map((row) => String(row.class_name)).filter(Boolean))];
}

export async function getStudents(className?: string) {
  const students = await getStudentRows(className);
  const { progress, mastery } = await getLearningRows(students.map((student) => student.id));
  return summarizeStudents(students, progress, mastery);
}

export async function getTopics(className?: string) {
  const students = await getStudentRows(className);
  const { mastery } = await getLearningRows(students.map((student) => student.id));
  return summarizeTopics(mastery);
}

export async function getProgress(className?: string) {
  const students = await getStudentRows(className);
  const { progress } = await getLearningRows(students.map((student) => student.id));
  return summarizeWeeks(students.length, progress);
}

export async function getDashboard(className?: string) {
  const students = await getStudentRows(className);
  const { progress, mastery } = await getLearningRows(students.map((student) => student.id));
  const studentSummaries = summarizeStudents(students, progress, mastery);
  const topicSummaries = summarizeTopics(mastery);
  return summarizeDashboard(studentSummaries, topicSummaries);
}

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const safeId = id.trim().slice(0, 80);
  if (!safeId) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("students").select(STUDENT_COLUMNS).eq("id", safeId).maybeSingle();
  if (error) throw new Error(`Không tải được học sinh: ${error.message}`);
  if (!data) return null;
  const student = data as StudentRow;
  const [{ progress, mastery }, eventsResult] = await Promise.all([
    getLearningRows([student.id]),
    db.from("learning_events").select("event_id,event_type,week,topic,xp_awarded,payload,created_at")
      .eq("student_id", student.id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (eventsResult.error) throw new Error(`Không tải được hoạt động gần đây: ${eventsResult.error.message}`);
  const summary = summarizeStudents([student], progress, mastery)[0];
  return {
    ...summary,
    streak: Number(student.streak),
    longestStreak: Number(student.longest_streak),
    completedWeekNumbers: progress.filter((row) => row.status === "completed").map((row) => row.week).sort((left, right) => left - right),
    topicMastery: summarizeTopics(mastery),
    weekProgress: [...progress].sort((left, right) => right.week - left.week),
    recentActivity: (eventsResult.data ?? []) as LearningEventRow[],
  };
}
