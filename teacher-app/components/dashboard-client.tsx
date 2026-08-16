"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, MetricCard, PageHeading, ProgressBar, StatusPill, StudentLink } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { DashboardSummary } from "@/types/teacher";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

export function DashboardClient() {
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    fetch("/api/classes").then((response) => response.json() as Promise<ApiResult<string[]>>)
      .then((result) => result.success && setClasses(result.data ?? [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/dashboard${className ? `?className=${encodeURIComponent(className)}` : ""}`, { signal: controller.signal })
      .then(async (response) => ({ response, result: await response.json() as ApiResult<DashboardSummary> }))
      .then(({ response, result }) => {
        if (!response.ok || !result.success || !result.data) throw new Error(result.error ?? "Không tải được dashboard.");
        if (active) setDashboard(result.data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (active) setError(reason instanceof Error ? reason.message : "Không tải được dashboard.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [className, retry]);

  const chooseClass = (value: string) => {
    setLoading(true);
    setError("");
    setClassName(value);
  };
  const retryDashboard = () => {
    setLoading(true);
    setError("");
    setRetry((value) => value + 1);
  };

  return <section className="page-shell">
    <PageHeading eyebrow="Tổng quan lớp học" title="Chào thầy cô" text="Theo dõi nhanh tiến độ, mức độ nắm bài và những học sinh đang cần được hỗ trợ." action={<div className="class-filter"><label htmlFor="dashboardClass">Lớp</label><select id="dashboardClass" value={className} onChange={(event) => chooseClass(event.target.value)}><option value="">Tất cả lớp</option>{classes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>}/>
    {loading && !dashboard ? <div className="skeleton-grid">{Array.from({ length: 6 }, (_, index) => <i className="skeleton" key={index}/>)}</div> : error ? <div className="empty-state error-state"><span aria-hidden>!</span><h2>Chưa tải được dữ liệu</h2><p>{error}</p><button onClick={retryDashboard}>Thử lại</button></div> : dashboard && <>
      <div className="metric-grid">
        <MetricCard icon="HS" label="Tổng số học sinh" value={dashboard.totalStudents} note={className ? `Lớp ${className}` : "Tất cả lớp"}/>
        <MetricCard icon="7N" label="Đang hoạt động" value={dashboard.activeStudents} note="Có hoạt động trong 7 ngày" tone="blue"/>
        <MetricCard icon="35" label="Tiến độ trung bình" value={`${dashboard.averageProgress}%`} note="Trên hành trình 35 tuần" tone="orange"/>
        <MetricCard icon="M" label="Mastery trung bình" value={`${dashboard.averageMastery}%`} note="Tổng hợp theo chủ đề"/>
        <MetricCard icon="!" label="Chủ đề khó nhất" value={dashboard.hardestTopic?.topic ?? "Chưa có"} note={dashboard.hardestTopic ? `${dashboard.hardestTopic.averageMastery}% mastery` : "Chưa đủ dữ liệu"} tone="red"/>
        <MetricCard icon="+" label="Cần hỗ trợ" value={dashboard.studentsNeedingSupport.length} note="Mastery thấp hoặc sai/gợi ý nhiều" tone="red"/>
      </div>
      {!dashboard.totalStudents ? <EmptyState title="Chưa có học sinh" text="Dữ liệu sẽ xuất hiện khi học sinh bắt đầu sử dụng ứng dụng."/> : <div className="dashboard-grid">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Ưu tiên hôm nay</p><h2>Học sinh cần hỗ trợ</h2></div><Link href={`/students${className ? `?className=${encodeURIComponent(className)}` : ""}`}>Xem tất cả</Link></div>{dashboard.studentsNeedingSupport.length ? <div className="support-list">{dashboard.studentsNeedingSupport.map((student) => <div key={student.id}><div><StudentLink id={student.id}>{student.name}</StudentLink><small>{student.className} · Tuần {student.currentWeek}</small></div><div className="support-mastery"><ProgressBar value={student.mastery}/><StatusPill status={student.status}/></div></div>)}</div> : <p className="muted">Không có học sinh nào trong ngưỡng cần hỗ trợ.</p>}</article>
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Thi đua tích cực</p><h2>Top XP</h2></div><Link href="/students">Danh sách</Link></div><ol className="top-list">{dashboard.topXP.map((student, index) => <li key={student.id}><b>{index + 1}</b><div><StudentLink id={student.id}>{student.name}</StudentLink><small>{student.className} · Level {student.level}</small></div><strong>{formatNumber(student.xp)} XP</strong></li>)}</ol></article>
      </div>}
    </>}
  </section>;
}
