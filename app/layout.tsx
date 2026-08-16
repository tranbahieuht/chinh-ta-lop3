import type { Metadata } from "next";
import { AppNavigation } from "@/components/app-navigation";
import { StudentProvider } from "@/components/student-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://chinh-ta-lop3-omega.vercel.app"),
  title: { default: "Hành trình Chính tả lớp 3", template: "%s · Chính Tả 3" },
  description: "35 tuần chinh phục tiếng Việt cùng Mít — học chính tả, nhận XP và tiến bộ mỗi ngày.",
  openGraph: {
    title: "Hành trình Chính tả lớp 3",
    description: "35 tuần chinh phục tiếng Việt",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Hành trình Chính tả lớp 3" }],
  },
  twitter: { card: "summary_large_image", title: "Hành trình Chính tả lớp 3", description: "35 tuần chinh phục tiếng Việt", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><StudentProvider><AppNavigation/><div className="app-main">{children}</div></StudentProvider></body></html>;
}
