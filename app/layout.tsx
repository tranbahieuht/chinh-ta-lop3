import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Trợ lý học Phân số", template: "%s · Trợ lý học Phân số" },
  description: "Trợ lý AI thân thiện giúp học sinh lớp 4 tự học phân số từng bước.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
