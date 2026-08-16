# Trợ lý học Phân số

Website chatbot hỗ trợ học sinh lớp 4 tự học phân số. Dự án dùng Next.js App Router, TypeScript, Tailwind CSS và ESLint.

Backend Chính tả lớp 3 dùng Supabase PostgreSQL để lưu XP, tiến độ, mastery, streak, badge và nhận webhook Dialogflow ES. Xem [docs/CHINHTA_BACKEND.md](docs/CHINHTA_BACKEND.md).

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Có thể kiểm tra bản phát hành bằng `npm run lint` và `npm run build`.

## Kết nối Gemini

1. Sao chép `.env.example` thành `.env.local`.
2. Điền khóa vào `GEMINI_API_KEY`.
3. Khởi động lại máy chủ phát triển.

Khi chưa có khóa, API tự dùng phản hồi mẫu để toàn bộ giao diện vẫn hoạt động. Khóa chỉ được đọc trong API route phía máy chủ và không được gửi xuống trình duyệt.

## Cấu trúc chính

- `app/`: trang chủ, trang chọn chủ đề, phòng học và API route.
- `components/`: các thành phần giao diện tái sử dụng.
- `data/`: 10 chủ đề và 30 câu hỏi mẫu.
- `hooks/`: trạng thái mức gợi ý lưu trong localStorage.
- `lib/`: nhãn hỗ trợ và logic dùng chung.
- `types/`: kiểu dữ liệu bài học và trò chuyện.
