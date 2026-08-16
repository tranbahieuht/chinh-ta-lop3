"use client";

import Link from "next/link";
import { EmptyState, ErrorState, LoadingState, MasteryBar } from "@/components/learning-ui";
import { useStudent } from "@/components/student-provider";
import { spellingWeeks } from "@/data/spelling-weeks";

export function PracticeDashboard() {
  const { progress, loading, error, refreshProgress } = useStudent();
  if (loading) return <main className="page-shell"><LoadingState rows={5}/></main>;
  if (error) return <main className="page-shell"><ErrorState message={error} retry={() => void refreshProgress()}/></main>;
  const weakTopics = [...(progress?.topicMastery ?? [])].filter((item) => item.mastery_score < 70).sort((a, b) => a.mastery_score - b.mastery_score);
  const reviewWeeks = (progress?.weekProgress ?? []).filter((item) => item.status === "completed" && item.mastery_score < 80).sort((a, b) => a.mastery_score - b.mastery_score);
  const current = Math.max(1, progress?.currentWeek ?? 1);
  return <main className="page-shell">
    <header className="page-heading"><div><p className="eyebrow">Luyện tập thông minh</p><h1>Ôn đúng chỗ, tiến bộ từng ngày</h1><p>Mít ưu tiên những chủ điểm em còn chưa chắc. Kết quả dưới đây lấy từ lịch sử học thật.</p></div><span className="heading-sticker">🎯</span></header>
    {!weakTopics.length && !reviewWeeks.length ? <EmptyState title="Chưa có chủ điểm cần ôn" text="Hãy hoàn thành thêm vài câu để Mít tìm ra bài luyện phù hợp." href={`/learn/${current}`} action="Tiếp tục bài học"/> : <>
      <section className="section-block"><div className="section-title"><div><p className="eyebrow">Ưu tiên hôm nay</p><h2>Chủ điểm cần củng cố</h2></div></div><div className="practice-grid">{weakTopics.slice(0, 6).map((topic, index) => {
        const match = spellingWeeks.find((week) => week.topic.includes(topic.topic)) ?? spellingWeeks[Math.min(current - 1, 34)];
        return <article className="practice-card" key={topic.topic}><span className="priority-number">{index + 1}</span><h3>{topic.topic}</h3><MasteryBar value={topic.mastery_score} label="Thành thạo"/><p>{topic.wrong_answers} lần cần sửa · {topic.hints_used} gợi ý đã dùng</p><Link className="button secondary" href={`/learn/${match.week}`}>Luyện ngay →</Link></article>;
      })}</div></section>
      {reviewWeeks.length > 0 && <section className="section-block"><div className="section-title"><div><p className="eyebrow">Ôn theo tuần</p><h2>Những tuần nên quay lại</h2></div></div><div className="compact-list">{reviewWeeks.slice(0, 6).map((row) => <Link href={`/learn/${row.week}`} key={row.week}><span>Tuần {row.week}</span><b>{spellingWeeks[row.week - 1]?.title}</b><em>{Math.round(row.mastery_score)}%</em><i>→</i></Link>)}</div></section>}
    </>}
  </main>;
}
