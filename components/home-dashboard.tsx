"use client";

import Link from "next/link";
import { getSpellingWeek } from "@/data/spelling-weeks";
import { useStudent } from "@/components/student-provider";
import { EmptyState, ErrorState, LoadingState, MasteryBar, XPBar } from "@/components/learning-ui";

export function HomeDashboard() {
  const { identity, progress, loading, error, refreshProgress, openOnboarding } = useStudent();
  if (loading) return <div className="page-container"><LoadingState rows={5}/></div>;
  if (error) return <div className="page-container"><ErrorState message={error} retry={() => void refreshProgress()}/></div>;
  if (!identity) return <div className="page-container"><EmptyState title="Em chưa bắt đầu hành trình" text="Tạo hồ sơ nhỏ để Mít ghi nhớ XP và tuần học của em." href="#" action="Bắt đầu"/><button className="button primary" onClick={openOnboarding}>Tạo hồ sơ</button></div>;

  const currentWeek = progress?.currentWeek ?? 1;
  const current = getSpellingWeek(currentWeek) ?? getSpellingWeek(1)!;
  const weakest = progress?.topicMastery.length
    ? [...progress.topicMastery].sort((a, b) => a.mastery_score - b.mastery_score)[0]
    : null;
  const completed = progress?.completedWeeks.length ?? 0;

  return <div className="page-container home-dashboard">
    <section className="welcome-panel">
      <div className="welcome-copy">
        <p className="eyebrow">Hành trình Chính tả lớp 3</p>
        <span className="hero-subtitle">35 tuần chinh phục tiếng Việt</span>
        <h1>Chào {identity.displayName} <span aria-hidden>👋</span></h1>
        <p>Mỗi câu đúng là một bước tiến. Hôm nay mình tiếp tục hành trình nhé!</p>
        <div className="hero-actions">
          <Link className="button primary large" href={`/learn/${currentWeek}`}>Tiếp tục học Tuần {currentWeek} <span>→</span></Link>
          <Link className="button secondary" href="/practice">Luyện lại bài còn yếu</Link>
        </div>
      </div>
      <div className="mascot-note" aria-label="Mít nhắn em"><span className="mascot-face">M</span><div><b>Mít nhắn em</b><p>“Đi chậm cũng được, miễn là mình không bỏ cuộc!”</p></div></div>
    </section>

    <section className="stat-grid" aria-label="Thành tích hiện tại">
      <article className="stat-card level"><span>LEVEL</span><strong>{progress?.level ?? 1}</strong><p>Cấp độ hiện tại</p></article>
      <article className="stat-card xp"><span>TỔNG XP</span><strong>{(progress?.totalXP ?? 0).toLocaleString("vi-VN")}</strong><p>Điểm đã tích lũy</p></article>
      <article className="stat-card streak"><span>CHUỖI HỌC</span><strong>🔥 {progress?.streak ?? 0}</strong><p>ngày liên tiếp</p></article>
      <article className="stat-card journey"><span>TIẾN ĐỘ</span><strong>{completed} / 35</strong><p>tuần hoàn thành</p></article>
    </section>

    <section className="dashboard-grid">
      <article className="content-card current-mission">
        <div className="section-heading"><div><p className="eyebrow">Nhiệm vụ tiếp theo</p><h2>Tuần {current.week}: {current.title}</h2></div><span className="week-orb">{current.week}</span></div>
        <p className="topic-line">Trọng tâm <b>{current.topic}</b></p>
        <XPBar totalXP={progress?.totalXP ?? 0} level={progress?.level ?? 1}/>
        <Link href={`/learn/${current.week}`} className="text-link">Vào bài học tuần <span>→</span></Link>
      </article>
      <article className="content-card focus-card">
        <p className="eyebrow">Góc luyện tập</p>
        {weakest ? <><h2>Chủ đề cần chú ý</h2><p className="focus-topic">{weakest.topic}</p><MasteryBar value={weakest.mastery_score}/><Link href="/practice" className="button soft wide">Luyện ngay</Link></> : <><h2>Sẵn sàng cho bài đầu tiên</h2><p>Hoàn thành vài câu để Mít nhận ra phần em cần luyện thêm.</p><Link href="/learn/1" className="button soft wide">Bắt đầu Tuần 1</Link></>}
      </article>
    </section>
  </div>;
}
