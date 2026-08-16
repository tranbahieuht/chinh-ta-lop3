export type WeekKind = "lesson" | "checkpoint" | "boss";
export type WeekStatus = "completed" | "current" | "locked" | "review";

export type SpellingWeek = {
  week: number;
  title: string;
  topic: string;
  semester: 1 | 2;
  type: WeekKind;
};

export type StudentIdentity = {
  studentCode: string;
  displayName: string;
  className: string;
};

export type WeekProgress = {
  week: number;
  topic: string;
  status: "not_started" | "in_progress" | "completed";
  xp_earned: number;
  score: number;
  correct_count: number;
  wrong_count: number;
  hints_used: number;
  highest_difficulty: string;
  mastery_score: number;
};

export type TopicMastery = {
  topic: string;
  mastery_score: number;
  total_questions: number;
  correct_first_try: number;
  correct_after_hint: number;
  wrong_answers: number;
  hints_used: number;
};

export type EarnedBadgeRow = {
  earned_at: string;
  badges?: { badge_code?: string; name?: string; description?: string; icon?: string } | Array<{ badge_code?: string; name?: string; description?: string; icon?: string }>;
};

export type StudentProgress = {
  student: {
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
  totalXP: number;
  level: number;
  streak: number;
  currentWeek: number;
  completedWeeks: number[];
  weekProgress: WeekProgress[];
  topicMastery: TopicMastery[];
  mastery: Record<string, number>;
  badges: EarnedBadgeRow[];
};

export type GamePayload = {
  studentCode?: string;
  week?: number;
  questionId?: string;
  topic?: string;
  xpEarned?: number;
  weekXP?: number;
  totalXP?: number;
  level?: number;
  streak?: number;
  mastery?: number;
  correctCount?: number;
  wrongCount?: number;
  hintsUsed?: number;
  score?: number;
  newBadges?: string[];
  duplicate?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  xp: number;
  level: number;
};

export type TeacherStudent = {
  studentId: string;
  name: string;
  currentWeek: number;
  xp: number;
  level: number;
  mastery: number;
  hints: number;
  status: "Tốt" | "Cần hỗ trợ" | "Ít hoạt động";
};

export type TeacherSummary = {
  numberOfStudents: number;
  activeStudents: number;
  averageProgress: number;
  averageMastery: number;
  hardestTopics: Array<{ topic: string; mastery: number }>;
  topXPStudents: Array<{ studentId: string; name: string; xp: number; level: number }>;
  studentsNeedingSupport: Array<{ studentId: string; studentCode: string; name: string; currentWeek: number }>;
  progressByWeek?: Array<{ week: number; completed: number }>;
  students?: TeacherStudent[];
};

export type ChatReply = {
  success: boolean;
  text?: string;
  message?: string;
  quickReplies?: string[];
  suggestions?: string[];
  payloads?: unknown[];
  game?: GamePayload;
  progressChanged?: boolean;
  contexts?: unknown[];
  error?: string;
  diagnostic?: string;
};
