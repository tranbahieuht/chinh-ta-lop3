import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricCard, PageHeading, ProgressBar, StatusPill } from "@/components/ui";
import { getStudentDetail } from "@/lib/data";
import { eventLabel, formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudentDetail(decodeURIComponent(id));
  if (!student) notFound();
  return <section className="page-shell">
    <Link className="back-link" href="/students">← Danh sách học sinh</Link>
    <PageHeading eyebrow={`${student.className} · ${student.code}`} title={student.name} text={`Hoạt động gần nhất: ${formatDateTime(student.lastActivityAt)}`} action={<StatusPill status={student.status}/>}/>
    <div className="metric-grid detail-metrics">
      <MetricCard icon="35" label="Tuần đã hoàn thành" value={`${student.completedWeeks}/35`} note={`Hiện ở tuần ${student.currentWeek}`} tone="orange"/>
      <MetricCard icon="XP" label="Tổng XP" value={formatNumber(student.xp)} note={`Level ${student.level}`}/>
      <MetricCard icon="M" label="Mastery" value={`${student.mastery}%`} note={`${student.correct} đúng · ${student.wrong} sai`} tone="blue"/>
      <MetricCard icon="?" label="Gợi ý đã dùng" value={student.hints} note={`Streak ${student.streak} ngày`} tone="red"/>
    </div>
    <div className="detail-grid">
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Năng lực</p><h2>Mastery theo chủ đề</h2></div></div>
        {student.topicMastery.length ? <div className="topic-list">{student.topicMastery.map((topic) => <div className={topic.isWeak ? "weak" : ""} key={topic.topic}><div><b>{topic.topic}</b>{topic.isWeak && <small>Cần củng cố</small>}</div><ProgressBar value={topic.averageMastery}/><span>{topic.correct} đúng · {topic.wrong} sai · {topic.hints} gợi ý</span></div>)}</div> : <p className="muted">Chưa có dữ liệu mastery.</p>}
      </article>
      <article className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Hành trình</p><h2>Tiến độ 35 tuần</h2></div></div>
        <div className="week-dots" aria-label={`${student.completedWeeks} trên 35 tuần đã hoàn thành`}>{Array.from({ length: 35 }, (_, index) => { const week=index+1; const completed=student.completedWeekNumbers.includes(week); const current=week===student.currentWeek; return <span key={week} className={completed ? "completed" : current ? "current" : ""} title={`Tuần ${week}`}>{week}</span>; })}</div>
        <div className="summary-row"><span>Đã hoàn thành <b>{student.completedWeeks}</b></span><span>Tuần hiện tại <b>{student.currentWeek}</b></span><span>Chuỗi dài nhất <b>{student.longestStreak} ngày</b></span></div>
      </article>
    </div>
    <article className="panel section-panel">
      <div className="panel-heading"><div><p className="eyebrow">Gần đây</p><h2>Hoạt động học tập</h2></div></div>
      {student.recentActivity.length ? <div className="activity-list">{student.recentActivity.map((event) => <div key={event.event_id}><span className="activity-dot"/><div><b>{eventLabel(event.event_type)}</b><small>{event.week ? `Tuần ${event.week}` : "Toàn hành trình"}{event.topic ? ` · ${event.topic}` : ""}</small></div><strong>{event.xp_awarded > 0 ? `+${event.xp_awarded} XP` : ""}</strong><time>{formatDateTime(event.created_at)}</time></div>)}</div> : <p className="muted">Chưa có hoạt động được ghi nhận.</p>}
    </article>
  </section>;
}
