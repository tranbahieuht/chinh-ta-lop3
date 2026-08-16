export type StudentRow = {
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

export type WeekProgressRow = {
  student_id: string;
  week: number;
  topic: string;
  status: string;
  xp_earned: number;
  score: number;
  correct_count: number;
  wrong_count: number;
  hints_used: number;
  mastery_score: number;
  completed_at: string | null;
  updated_at?: string | null;
};

export type TopicMasteryRow = {
  student_id: string;
  topic: string;
  mastery_score: number;
  total_questions: number;
  correct_first_try: number;
  correct_after_hint: number;
  wrong_answers: number;
  hints_used: number;
  updated_at?: string | null;
};

export type LearningEventRow = {
  event_id: string;
  event_type: string;
  week: number | null;
  topic: string | null;
  xp_awarded: number;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type StudentStatus = "Tốt" | "Cần hỗ trợ" | "Ít hoạt động";

export type StudentListItem = {
  id: string;
  code: string;
  name: string;
  className: string;
  currentWeek: number;
  completedWeeks: number;
  progressPercent: number;
  xp: number;
  level: number;
  mastery: number;
  hints: number;
  correct: number;
  wrong: number;
  status: StudentStatus;
  lastActivityAt: string | null;
};

export type TopicSummary = {
  topic: string;
  averageMastery: number;
  studentCount: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  hints: number;
  isWeak: boolean;
};

export type WeekSummary = {
  week: number;
  completedStudents: number;
  startedStudents: number;
  completionPercent: number;
  averageMastery: number;
  averageHints: number;
};

export type DashboardSummary = {
  totalStudents: number;
  activeStudents: number;
  averageProgress: number;
  averageMastery: number;
  hardestTopic: TopicSummary | null;
  studentsNeedingSupport: StudentListItem[];
  topXP: StudentListItem[];
};

export type StudentDetail = StudentListItem & {
  streak: number;
  longestStreak: number;
  completedWeekNumbers: number[];
  topicMastery: TopicSummary[];
  weekProgress: WeekProgressRow[];
  recentActivity: LearningEventRow[];
};
