"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryLinks = [
  { href: "/", label: "Trang chủ", icon: "⌂" },
  { href: "/journey", label: "Hành trình", icon: "⌁" },
  { href: "/practice", label: "Luyện tập", icon: "✎" },
  { href: "/achievements", label: "Thành tích", icon: "☆" },
  { href: "/leaderboard", label: "Bảng xếp hạng", icon: "♛" },
  { href: "/assistant", label: "Trợ lý AI", icon: "✦" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const learning = pathname.startsWith("/learn/");
  if (learning) return null;
  return <>
    <header className="app-header">
      <Link href="/" className="wordmark" aria-label="Hành trình Chính tả lớp 3"><span>✍️</span><b>Chính Tả 3</b></Link>
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        {primaryLinks.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}>{item.label}</Link>)}
      </nav>
      <Link href="/teacher" className={`teacher-link ${pathname.startsWith("/teacher") ? "active" : ""}`}>Dành cho giáo viên</Link>
    </header>
    <nav className="bottom-nav" aria-label="Điều hướng di động">
      {primaryLinks.slice(0, 5).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}><span aria-hidden>{item.icon}</span><small>{item.label.replace("Bảng xếp hạng", "Xếp hạng")}</small></Link>)}
    </nav>
  </>;
}
