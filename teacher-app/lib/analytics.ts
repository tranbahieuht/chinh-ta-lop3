import type {
  DashboardSummary,
  StudentListItem,
  StudentRow,
  TopicMasteryRow,
  TopicSummary,
  WeekProgressRow,
  WeekSummary,
} from "@/types/teacher";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export function summarizeStudents(
  students: StudentRow[],
  progress: WeekProgressRow[],
  mastery: TopicMasteryRow[],
  now = Date.now(),
): StudentListItem[] {
  return students.map((student) => {
    const studentProgress = progress.filter((row) => row.student_id === student.id);
    const studentMastery = mastery.filter((row) => row.student_id === student.id);
    const completedWeeks = new Set(studentProgress.filter((row) => row.status === "completed").map((row) => row.week)).size;
    const masteryScores = studentMastery.map((row) => number(row.mastery_score));
    const hints = studentProgress.reduce((sum, row) => sum + number(row.hints_used), 0);
    const correct = studentProgress.reduce((sum, row) => sum + number(row.correct_count), 0);
    const wrong = studentProgress.reduce((sum, row) => sum + number(row.wrong_count), 0);
    const masteryAverage = average(masteryScores);
    const needsSupport = (masteryScores.length > 0 && masteryAverage < 65) || hints + wrong >= Math.max(5, correct / 2);
    const inactive = !student.last_activity_at || new Date(student.last_activity_at).getTime() < now - ACTIVE_WINDOW_MS;
    const status: StudentListItem["status"] = needsSupport ? "Cần hỗ trợ" : inactive ? "Ít hoạt động" : "Tốt";
    return {
      id: student.id,
      code: student.student_code,
      name: student.display_name,
      className: student.class_name,
      currentWeek: number(student.current_week),
      completedWeeks,
      progressPercent: Math.round((completedWeeks / 35) * 100),
      xp: number(student.total_xp),
      level: number(student.level),
      mastery: masteryAverage,
      hints,
      correct,
      wrong,
      status,
      lastActivityAt: student.last_activity_at,
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "vi"));
}

export function summarizeTopics(rows: TopicMasteryRow[]): TopicSummary[] {
  const groups = new Map<string, TopicMasteryRow[]>();
  for (const row of rows) groups.set(row.topic, [...(groups.get(row.topic) ?? []), row]);
  return [...groups.entries()].map(([topic, items]) => {
    const averageMastery = average(items.map((row) => number(row.mastery_score)));
    return {
      topic,
      averageMastery,
      studentCount: new Set(items.map((row) => row.student_id)).size,
      totalQuestions: items.reduce((sum, row) => sum + number(row.total_questions), 0),
      correct: items.reduce((sum, row) => sum + number(row.correct_first_try) + number(row.correct_after_hint), 0),
      wrong: items.reduce((sum, row) => sum + number(row.wrong_answers), 0),
      hints: items.reduce((sum, row) => sum + number(row.hints_used), 0),
      isWeak: averageMastery < 65,
    };
  }).sort((left, right) => left.averageMastery - right.averageMastery || left.topic.localeCompare(right.topic, "vi"));
}

export function summarizeWeeks(totalStudents: number, rows: WeekProgressRow[]): WeekSummary[] {
  return Array.from({ length: 35 }, (_, index) => {
    const week = index + 1;
    const items = rows.filter((row) => number(row.week) === week);
    const completedStudents = new Set(items.filter((row) => row.status === "completed").map((row) => row.student_id)).size;
    return {
      week,
      completedStudents,
      startedStudents: new Set(items.map((row) => row.student_id)).size,
      completionPercent: totalStudents ? Math.round((completedStudents / totalStudents) * 100) : 0,
      averageMastery: average(items.map((row) => number(row.mastery_score))),
      averageHints: items.length ? Math.round((items.reduce((sum, row) => sum + number(row.hints_used), 0) / items.length) * 10) / 10 : 0,
    };
  });
}

export function summarizeDashboard(students: StudentListItem[], topics: TopicSummary[], now = Date.now()): DashboardSummary {
  const activeStudents = students.filter((student) => student.lastActivityAt && new Date(student.lastActivityAt).getTime() >= now - ACTIVE_WINDOW_MS).length;
  return {
    totalStudents: students.length,
    activeStudents,
    averageProgress: average(students.map((student) => student.progressPercent)),
    averageMastery: average(students.filter((student) => student.mastery > 0).map((student) => student.mastery)),
    hardestTopic: topics[0] ?? null,
    studentsNeedingSupport: students.filter((student) => student.status === "Cần hỗ trợ").sort((left, right) => left.mastery - right.mastery).slice(0, 8),
    topXP: [...students].sort((left, right) => right.xp - left.xp || left.name.localeCompare(right.name, "vi")).slice(0, 8),
  };
}
