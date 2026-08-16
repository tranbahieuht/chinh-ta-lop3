import Link from "next/link";
import type { ReactNode } from "react";
import type { StudentStatus } from "@/types/teacher";

export function PageHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

export function ClassFilter({ classes, selected }: { classes: string[]; selected?: string }) {
  return <form className="class-filter" method="get">
    <label htmlFor="className">Lớp</label>
    <select id="className" name="className" defaultValue={selected ?? ""}>
      <option value="">Tất cả lớp</option>
      {classes.map((className) => <option key={className} value={className}>{className}</option>)}
    </select>
    <button type="submit">Xem dữ liệu</button>
  </form>;
}

export function MetricCard({ icon, label, value, note, tone = "green" }: { icon: string; label: string; value: string | number; note: string; tone?: "green" | "orange" | "blue" | "red" }) {
  return <article className={`metric-card ${tone}`}><span aria-hidden>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return <div className="progress-bar" aria-label={label ?? `Tiến độ ${safe}%`}><i style={{ width: `${safe}%` }}/><span>{safe}%</span></div>;
}

export function StatusPill({ status }: { status: StudentStatus }) {
  const className = status === "Tốt" ? "good" : status === "Cần hỗ trợ" ? "support" : "quiet";
  return <span className={`status-pill ${className}`}>{status}</span>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span aria-hidden>◇</span><h2>{title}</h2><p>{text}</p></div>;
}

export function StudentLink({ id, children }: { id: string; children: ReactNode }) {
  return <Link className="student-link" href={`/students/${encodeURIComponent(id)}`}>{children}<span aria-hidden>→</span></Link>;
}
