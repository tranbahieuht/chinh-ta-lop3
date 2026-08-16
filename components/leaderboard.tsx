"use client";

import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/learning-ui";
import { useStudent } from "@/components/student-provider";
import type { LeaderboardEntry } from "@/types/spelling";

export function Leaderboard() {
  const { identity } = useStudent();
  const [period, setPeriod] = useState<"weekly" | "all_time">("weekly");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    fetch(`/api/leaderboard?period=${period}&className=${encodeURIComponent(identity.className)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Chưa tải được bảng xếp hạng."); return data as LeaderboardEntry[]; })
      .then(setRows).catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [identity, period]);
  return <main className="page-shell">
    <header className="page-heading"><div><p className="eyebrow">Lớp {identity?.className || "của em"}</p><h1>Bảng xếp hạng chăm chỉ</h1><p>Cùng thi đua tích cực — XP đến từ việc học, không phải từ hồ sơ mẫu.</p></div><span className="heading-sticker">🏆</span></header>
    <div className="segmented" role="tablist"><button className={period === "weekly" ? "active" : ""} onClick={() => { setLoading(true); setError(""); setPeriod("weekly"); }}>Tuần này</button><button className={period === "all_time" ? "active" : ""} onClick={() => { setLoading(true); setError(""); setPeriod("all_time"); }}>Tất cả</button></div>
    {loading ? <LoadingState rows={6}/> : error ? <ErrorState message={error}/> : rows.length === 0 ? <div className="state-card"><span>🌱</span><h2>Chưa có điểm xếp hạng</h2><p>Hãy hoàn thành bài học đầu tiên để xuất hiện ở đây.</p></div> : <section className="leaderboard-card">
      <div className="podium">{rows.slice(0, 3).map((row) => <article key={row.studentId} className={`place-${row.rank}`}><span>{row.rank === 1 ? "👑" : row.rank === 2 ? "🥈" : "🥉"}</span><b>{row.name}</b><small>{row.xp} XP</small></article>)}</div>
      <div className="ranking-list">{rows.slice(0, 10).map((row) => <div key={row.studentId} className={row.name === identity?.displayName ? "me" : ""}><strong>#{row.rank}</strong><span className="rank-avatar">{row.name.slice(0, 1).toUpperCase()}</span><b>{row.name}{row.name === identity?.displayName && <small> Em</small>}</b><em>Level {row.level}</em><strong>{row.xp} XP</strong></div>)}</div>
    </section>}
  </main>;
}
