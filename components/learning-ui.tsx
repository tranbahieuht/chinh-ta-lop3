import Link from "next/link";
import type { SpellingWeek, WeekStatus } from "@/types/spelling";

export function XPBar({ totalXP, level, compact = false }: { totalXP: number; level: number; compact?: boolean }) {
  const bounds = level <= 1 ? { start: 0, end: 100 } : level === 2 ? { start: 100, end: 250 } : level === 3 ? { start: 250, end: 450 } : level === 4 ? { start: 450, end: 700 } : { start: 700 + (level - 5) * 350, end: 1050 + (level - 5) * 350 };
  const percent = Math.max(0, Math.min(100, ((totalXP - bounds.start) / (bounds.end - bounds.start)) * 100));
  return <div className={`xp-bar ${compact ? "compact" : ""}`}><div><b>Level {level}</b><span>{totalXP.toLocaleString("vi-VN")} / {bounds.end.toLocaleString("vi-VN")} XP</span></div><div className="bar-track" role="progressbar" aria-label="Tiến độ XP tới level tiếp theo" aria-valuemin={bounds.start} aria-valuemax={bounds.end} aria-valuenow={totalXP}><i style={{ width: `${percent}%` }}/></div></div>;
}

export function MasteryBar({ value, label = "Mastery" }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return <div className="mastery-bar"><div><span>{label}</span><b>{safe}%</b></div><div className="bar-track"><i style={{ width: `${safe}%` }}/></div></div>;
}

export function StreakBadge({ streak }: { streak: number }) {
  return <div className="streak-badge" aria-label={`${streak} ngày học liên tiếp`}><span aria-hidden>🔥</span><div><b>{streak} ngày liên tiếp</b><small>Chuỗi học hiện tại</small></div></div>;
}

const statusLabels: Record<WeekStatus, string> = { completed: "Đã xong", current: "Đang học", locked: "Chưa mở", review: "Nên ôn lại" };
const statusIcons: Record<WeekStatus, string> = { completed: "✓", current: "★", locked: "🔒", review: "↻" };

export function WeekCard({ item, status, mastery, xp }: { item: SpellingWeek; status: WeekStatus; mastery?: number; xp?: number }) {
  const disabled = status === "locked";
  const href = disabled ? `/journey/${item.week}` : status === "current" ? `/learn/${item.week}` : `/journey/${item.week}`;
  return <article className={`week-card ${status} ${item.type}`}>
    <div className="week-card-top"><span className="week-number">Tuần {item.week}</span><span className="status-pill"><i aria-hidden>{statusIcons[status]}</i>{statusLabels[status]}</span></div>
    <h3>{item.title}</h3><p>{item.topic}</p>
    {(mastery !== undefined || xp !== undefined) && <div className="week-meta">{mastery !== undefined && <span>Mastery <b>{mastery}%</b></span>}{xp !== undefined && <span><b>{xp}</b> XP</span>}</div>}
    <Link href={href} aria-disabled={disabled} className="card-action">{disabled ? "Xem điều kiện" : status === "current" ? "Tiếp tục" : "Xem tuần"}<span>→</span></Link>
  </article>;
}

export function BadgeCard({ icon, title, description, earned }: { icon: string; title: string; description: string; earned: boolean }) {
  return <article className={`badge-card ${earned ? "earned" : "locked"}`}><span className="badge-icon" aria-hidden>{earned ? icon : "◇"}</span><div><h3>{title}</h3><p>{description}</p><small>{earned ? "Đã đạt" : "Chưa mở khóa"}</small></div></article>;
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return <div className="loading-stack" aria-label="Đang tải">{Array.from({ length: rows }, (_, index) => <i key={index}/>)}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-card error-state"><span aria-hidden>☁</span><h2>Chưa tải được dữ liệu</h2><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>Thử lại</button>}</div>;
}

export function EmptyState({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return <div className="state-card"><span aria-hidden>✦</span><h2>{title}</h2><p>{text}</p><Link className="button primary" href={href}>{action}</Link></div>;
}

export function TeacherStatCard({ icon, label, value, note }: { icon: string; label: string; value: string | number; note: string }) {
  return <article className="teacher-stat"><span aria-hidden>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}
