"use client";

import Link from "next/link";
import { MasteryBar } from "@/components/learning-ui";
import { useStudent } from "@/components/student-provider";
import { weekProgressRow, weekStatus } from "@/lib/spelling-progress";
import type { SpellingWeek } from "@/types/spelling";

export function WeekDetail({ item }: { item: SpellingWeek }) {
  const { progress } = useStudent();
  const row = weekProgressRow(progress, item.week);
  const status = weekStatus(progress, item.week);
  const locked = status === "locked";
  const completed = status === "completed" || status === "review";
  return <div className="page-container week-detail-page">
    <Link href="/journey" className="back-link">← Quay lại bản đồ</Link>
    <section className={`week-detail-hero ${item.type}`}>
      <div><span className="status-pill">{item.type === "boss" ? "Boss" : item.type === "checkpoint" ? "Checkpoint" : `Tuần ${item.week}`}</span><h1>{item.title}</h1><p>{item.topic}</p></div>
      <span className="giant-week-number">{item.week}</span>
    </section>
    {locked ? <section className="locked-panel"><span aria-hidden>🔒</span><div><h2>Tuần này chưa mở</h2><p>Em hãy hoàn thành Tuần {Math.max(1, item.week - 1)} trước để mở khóa trạm tiếp theo.</p><Link href={`/learn/${progress?.currentWeek ?? 1}`} className="button primary">Tiếp tục tuần hiện tại</Link></div></section> : <>
      <section className="detail-stat-grid">
        <article><span>Câu đã làm</span><strong>{(row?.correct_count ?? 0) + (row?.wrong_count ?? 0)}</strong></article>
        <article><span>Gợi ý đã dùng</span><strong>{row?.hints_used ?? 0}</strong></article>
        <article><span>XP tuần này</span><strong>{row?.xp_earned ?? 0}</strong></article>
        <article><span>Độ khó cao nhất</span><strong>{row?.highest_difficulty?.replace("basic_support", "hỗ trợ") ?? "cơ bản"}</strong></article>
      </section>
      <section className="content-card detail-progress"><div><p className="eyebrow">Năng lực tuần</p><h2>{completed ? "Em đã hoàn thành trạm này" : "Tiến độ đang học"}</h2><p>{completed ? "Em có thể luyện lại bất cứ lúc nào để nâng mastery." : "Mít sẽ tự điều chỉnh câu hỏi theo cách em làm bài."}</p></div><MasteryBar value={row?.mastery_score ?? 50}/></section>
      <div className="detail-actions"><Link href={`/learn/${item.week}`} className="button primary large">{completed ? "Luyện lại" : row ? "Tiếp tục" : "Bắt đầu bài"} <span>→</span></Link><Link href="/practice" className="button secondary">Chọn bài luyện khác</Link></div>
    </>}
  </div>;
}
