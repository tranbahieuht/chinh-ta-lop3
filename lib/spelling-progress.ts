import type { StudentProgress, WeekProgress, WeekStatus } from "@/types/spelling";

export function levelBounds(level: number) {
  if (level <= 1) return { start: 0, end: 100 };
  if (level === 2) return { start: 100, end: 250 };
  if (level === 3) return { start: 250, end: 450 };
  if (level === 4) return { start: 450, end: 700 };
  const start = 700 + (level - 5) * 350;
  return { start, end: start + 350 };
}

export function levelProgress(totalXP: number, level: number) {
  const { start, end } = levelBounds(level);
  const value = Math.min(100, Math.max(0, ((totalXP - start) / (end - start)) * 100));
  return { start, end, value };
}

export function weekProgressRow(progress: StudentProgress | null, week: number): WeekProgress | undefined {
  return progress?.weekProgress.find((item) => item.week === week);
}

export function weekStatus(progress: StudentProgress | null, week: number): WeekStatus {
  if (!progress) return week === 1 ? "current" : "locked";
  const row = weekProgressRow(progress, week);
  if (progress.completedWeeks.includes(week)) return row && row.mastery_score < 70 ? "review" : "completed";
  if (week === progress.currentWeek) return "current";
  return week > progress.currentWeek ? "locked" : "review";
}

export function earnedBadgeCodes(progress: StudentProgress | null) {
  const codes = new Set<string>();
  for (const row of progress?.badges ?? []) {
    const badges = Array.isArray(row.badges) ? row.badges : row.badges ? [row.badges] : [];
    for (const badge of badges) if (badge.badge_code) codes.add(badge.badge_code);
  }
  return codes;
}

export function topicKey(topic: string) {
  return topic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
