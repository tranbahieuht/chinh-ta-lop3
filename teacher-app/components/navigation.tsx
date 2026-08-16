import Link from "next/link";

const links = [
  { href: "/", label: "Tổng quan" },
  { href: "/students", label: "Học sinh" },
  { href: "/progress", label: "Tiến độ" },
  { href: "/topics", label: "Chủ đề" },
];

export function Navigation() {
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand" href="/" aria-label="Trang chủ Góc giáo viên">
        <span aria-hidden>CT</span>
        <div><b>Góc giáo viên</b><small>Chính tả lớp 3</small></div>
      </Link>
      <nav aria-label="Điều hướng giáo viên">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <span className="readonly-badge">Chỉ xem</span>
    </div>
  </header>;
}
