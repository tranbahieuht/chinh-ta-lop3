"use client";

import { BadgeCard, LoadingState, MasteryBar, StreakBadge, XPBar } from "@/components/learning-ui";
import { useStudent } from "@/components/student-provider";
import { badgeCatalog } from "@/data/spelling-weeks";
import { earnedBadgeCodes } from "@/lib/spelling-progress";

export function AchievementsDashboard() {
  const { progress, loading } = useStudent();
  if (loading) return <main className="page-shell"><LoadingState rows={5}/></main>;
  const earned = earnedBadgeCodes(progress);
  return <main className="page-shell">
    <header className="page-heading achievement-hero"><div><p className="eyebrow">Bộ sưu tập thành tích</p><h1>Mỗi nỗ lực đều đáng tự hào</h1><p>Em đã mở {earned.size} / {badgeCatalog.length} huy hiệu. Huy hiệu chỉ sáng lên khi thành tích được lưu thật.</p><XPBar totalXP={progress?.totalXP ?? 0} level={progress?.level ?? 1}/><StreakBadge streak={progress?.streak ?? 0}/></div><span className="heading-sticker">🏅</span></header>
    <section className="achievement-overview"><article><span>Tuần hoàn thành</span><b>{progress?.completedWeeks.length ?? 0} / 35</b></article>{(progress?.topicMastery ?? []).slice().sort((a,b) => b.mastery_score-a.mastery_score).slice(0,3).map((topic) => <article key={topic.topic}><MasteryBar value={topic.mastery_score} label={topic.topic}/></article>)}</section>
    <section className="badge-grid">{badgeCatalog.map((badge) => <BadgeCard key={badge.code} {...badge} earned={earned.has(badge.code)}/>)}</section>
  </main>;
}
