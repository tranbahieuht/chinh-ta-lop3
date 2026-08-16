import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Góc giáo viên | Chính tả lớp 3", template: "%s | Góc giáo viên" },
  description: "Dashboard chỉ đọc theo dõi tiến độ Chính tả lớp 3.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><Navigation/><main>{children}</main><footer>Góc giáo viên · Dữ liệu chỉ đọc · Múi giờ Asia/Ho_Chi_Minh</footer></body></html>;
}
