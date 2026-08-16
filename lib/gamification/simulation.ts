import { calculateAnswerXP, calculateLevel, updateMastery, updateStreak, XP_RULES } from "./rules.ts";
import type { AnswerEvent, GamificationResult, WeekCompleteEvent } from "./types.ts";

type SimStudent = {
  id: string;
  studentCode: string;
  displayName: string;
  className: string;
  totalXP: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  mastery: Map<string, number>;
  hintsByWeek: Map<number, number>;
  completedWeeks: Set<number>;
  badges: Set<string>;
  recentCorrect: boolean[];
  correctNoHint: number;
  comebacks: number;
};

type LedgerEntry = { eventId: string; studentId: string; xp: number; occurredAt: string; type: string; week: number };

export class InMemoryGamificationEngine {
  private readonly students = new Map<string, SimStudent>();
  private readonly eventIds = new Set<string>();
  private readonly completedKeys = new Set<string>();
  private readonly ledger: LedgerEntry[] = [];

  private student(code: string, displayName = "Học sinh", className = "3A"): SimStudent {
    const existing = this.students.get(code);
    if (existing) return existing;
    const created: SimStudent = {
      id: `student-${code}`, studentCode: code, displayName, className, totalXP: 0, level: 1,
      streak: 0, longestStreak: 0, lastActivityAt: null, mastery: new Map(), hintsByWeek: new Map(),
      completedWeeks: new Set(), badges: new Set(), recentCorrect: [], correctNoHint: 0, comebacks: 0,
    };
    this.students.set(code, created);
    return created;
  }

  private result(student: SimStudent, xpEarned: number, previousLevel: number, duplicate: boolean, newBadges: string[], topic: string): GamificationResult {
    return { success: true, duplicate, studentId: student.id, xpEarned, totalXP: student.totalXP,
      level: student.level, levelUp: student.level > previousLevel, mastery: student.mastery.get(topic) ?? 50,
      streak: student.streak, newBadges };
  }

  private applyActivity(student: SimStudent, occurredAt: string) {
    const streak = updateStreak(student.streak, student.longestStreak, student.lastActivityAt, occurredAt);
    Object.assign(student, streak);
  }

  private awardBadges(student: SimStudent): string[] {
    const eligible = [
      student.completedWeeks.size >= 1 && "FIRST_WEEK",
      student.correctNoHint >= 10 && "NO_HINT_10",
      student.recentCorrect.length >= 10 && student.recentCorrect.slice(-10).every(Boolean) && "PERFECT_10",
      student.comebacks >= 5 && "COMEBACK",
      student.streak >= 3 && "STREAK_3",
      student.streak >= 7 && "STREAK_7",
      (student.mastery.get("c / k") ?? 0) >= 90 && "MASTER_CK",
      student.completedWeeks.has(18) && "BOSS_HKI",
      student.completedWeeks.has(35) && "FINAL_BOSS",
    ].filter((value): value is string => Boolean(value));
    const fresh = eligible.filter((badge) => !student.badges.has(badge));
    for (const badge of fresh) student.badges.add(badge);
    return fresh;
  }

  recordAnswer(event: AnswerEvent): GamificationResult {
    const student = this.student(event.studentCode, event.displayName, event.className);
    if (this.eventIds.has(event.eventId)) return this.result(student, 0, student.level, true, [], event.topic);
    this.eventIds.add(event.eventId);
    const previousLevel = student.level;
    const occurredAt = event.occurredAt ?? new Date().toISOString();
    const xp = calculateAnswerXP(event);
    student.totalXP += xp;
    student.level = calculateLevel(student.totalXP);
    student.mastery.set(event.topic, updateMastery(student.mastery.get(event.topic) ?? 50, event));
    student.hintsByWeek.set(event.week, (student.hintsByWeek.get(event.week) ?? 0) + event.hintLevel);
    student.recentCorrect.push(event.correct);
    if (event.correct && event.hintLevel === 0) student.correctNoHint += 1;
    if (event.correct && event.attempt > 1) student.comebacks += 1;
    this.applyActivity(student, occurredAt);
    this.ledger.push({ eventId: event.eventId, studentId: student.id, xp, occurredAt, type: event.eventType ?? "ANSWER_RESULT", week: event.week });
    return this.result(student, xp, previousLevel, false, this.awardBadges(student), event.topic);
  }

  completeWeek(event: WeekCompleteEvent): GamificationResult {
    const student = this.student(event.studentCode, event.displayName, event.className);
    const completionKey = `${event.studentCode}:${event.week}`;
    if (this.eventIds.has(event.eventId) || this.completedKeys.has(completionKey)) return this.result(student, 0, student.level, true, [], event.topic);
    this.eventIds.add(event.eventId);
    this.completedKeys.add(completionKey);
    const previousLevel = student.level;
    const occurredAt = event.occurredAt ?? new Date().toISOString();
    const xp = XP_RULES.weekComplete + ((student.hintsByWeek.get(event.week) ?? 0) === 0 ? XP_RULES.noHintWeekBonus : 0);
    student.totalXP += xp;
    student.level = calculateLevel(student.totalXP);
    student.completedWeeks.add(event.week);
    this.applyActivity(student, occurredAt);
    this.ledger.push({ eventId: event.eventId, studentId: student.id, xp, occurredAt, type: "WEEK_COMPLETE", week: event.week });
    return this.result(student, xp, previousLevel, false, this.awardBadges(student), event.topic);
  }

  leaderboard(period: "weekly" | "all_time", range?: { start: string; end: string }) {
    const weeklyXP = new Map<string, number>();
    if (period === "weekly" && range) {
      for (const event of this.ledger) if (event.occurredAt >= range.start && event.occurredAt < range.end) {
        weeklyXP.set(event.studentId, (weeklyXP.get(event.studentId) ?? 0) + event.xp);
      }
    }
    return [...this.students.values()].map((student) => ({ studentId: student.id, name: student.displayName,
      xp: period === "all_time" ? student.totalXP : weeklyXP.get(student.id) ?? 0, level: student.level }))
      .sort((a, b) => b.xp - a.xp).map((row, index) => ({ rank: index + 1, ...row }));
  }
}

