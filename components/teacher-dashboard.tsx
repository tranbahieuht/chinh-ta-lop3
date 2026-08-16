"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingState, MasteryBar, TeacherStatCard } from "@/components/learning-ui";
import type { TeacherSummary } from "@/types/spelling";

export function TeacherDashboard() {
  const [className, setClassName] = useState("3A");
  const [summary, setSummary] = useState<TeacherSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (target: string) => {
    if (!target.trim()) return;
    setLoading(true); setError("");
    try { const response = await fetch(`/api/teacher/class-summary?className=${encodeURIComponent(target.trim())}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok || data.success === false) throw new Error(data.error || "Chưa tải được lớp."); setSummary(data as TeacherSummary); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa tải được lớp."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => load("3A")); }, [load]);
  return <main className="page-shell teacher-page">
    <header className="teacher-header"><div><p className="eyebrow">Góc giáo viên</p><h1>Theo dõi lớp học</h1><p>Dữ liệu tổng hợp trực tiếp từ tiến độ học sinh, không dùng số liệu minh họa.</p></div><form onSubmit={(event) => { event.preventDefault(); void load(className); }}><label htmlFor="class-filter">Lớp</label><input id="class-filter" value={className} onChange={(event) => setClassName(event.target.value)} maxLength={40}/><button className="button primary">Xem lớp</button></form></header>
    {loading ? <LoadingState rows={5}/> : error ? <ErrorState message={error} retry={() => void load(className)}/> : summary && <>
      <section className="teacher-stats"><TeacherStatCard icon="👥" label="Sĩ số" value={summary.numberOfStudents} note={`${summary.activeStudents} em hoạt động 7 ngày qua`}/><TeacherStatCard icon="🗺️" label="Tiến độ trung bình" value={`${summary.averageProgress}%`} note="Trên hành trình 35 tuần"/><TeacherStatCard icon="🎯" label="Mastery trung bình" value={`${summary.averageMastery}%`} note="Theo các chủ điểm đã học"/><TeacherStatCard icon="💛" label="Cần hỗ trợ" value={summary.studentsNeedingSupport.length} note="Dựa trên lỗi và số gợi ý"/></section>
      {!summary.numberOfStudents ? <div className="state-card"><span>📚</span><h2>Lớp chưa có học sinh</h2><p>Học sinh cần nhập đúng tên lớp khi tạo hồ sơ.</p></div> : <>
        <section className="teacher-grid"><article className="teacher-panel"><div className="section-title"><div><p className="eyebrow">Phân bố</p><h2>Hoàn thành theo tuần</h2></div></div><div className="week-bars">{(summary.progressByWeek || []).map((row) => <div key={row.week} title={`Tuần ${row.week}: ${row.completed} học sinh`}><i style={{ height: `${summary.numberOfStudents ? Math.max(5, row.completed / summary.numberOfStudents * 100) : 5}%` }}/><small>{row.week}</small></div>)}</div></article><article className="teacher-panel"><div className="section-title"><div><p className="eyebrow">Cần tập trung</p><h2>Chủ điểm khó nhất</h2></div></div>{summary.hardestTopics.length ? summary.hardestTopics.map((topic) => <MasteryBar key={topic.topic} value={topic.mastery} label={topic.topic}/>) : <p className="muted">Chưa đủ dữ liệu mastery.</p>}</article></section>
        <section className="teacher-panel student-table-panel"><div className="section-title"><div><p className="eyebrow">Danh sách lớp</p><h2>Tiến độ từng học sinh</h2></div></div><div className="table-scroll"><table><thead><tr><th>Học sinh</th><th>Tuần</th><th>XP</th><th>Level</th><th>Mastery</th><th>Gợi ý</th><th>Trạng thái</th></tr></thead><tbody>{(summary.students || []).map((student) => <tr key={student.studentId}><td><b>{student.name}</b></td><td>{student.currentWeek}/35</td><td>{student.xp}</td><td>{student.level}</td><td>{student.mastery}%</td><td>{student.hints}</td><td><span className={`student-status ${student.status === "Tốt" ? "good" : student.status === "Cần hỗ trợ" ? "support" : "quiet"}`}>{student.status}</span></td></tr>)}</tbody></table></div></section>
      </>}
    </>}
  </main>;
}
