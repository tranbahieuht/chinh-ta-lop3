# Teacher app — Chính tả lớp 3

Web giáo viên độc lập, không đăng nhập và chỉ đọc dữ liệu học tập trong Supabase hiện tại.

Giao diện dùng CSS thuần trong `app/globals.css`, không dùng Tailwind. File `postcss.config.mjs` cục bộ ngăn build standalone kế thừa cấu hình Tailwind của student app ở thư mục cha.

## Chạy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Biến môi trường bắt buộc:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc trong server module. Không đặt khóa này trong biến có tiền tố `NEXT_PUBLIC_` và không commit `.env.local`.

## Routes

- `/`: dashboard tổng quan.
- `/students`: danh sách học sinh.
- `/students/[id]`: chi tiết một học sinh.
- `/progress`: tiến độ 35 tuần.
- `/topics`: mastery theo chủ đề.

API chỉ đọc:

- `GET /api/dashboard?className=3A`
- `GET /api/classes`
- `GET /api/students?className=3A`
- `GET /api/students/[id]`
- `GET /api/progress?className=3A`
- `GET /api/topics?className=3A`

Không có route mutation. Data layer chỉ gọi Supabase `.select()` trên `students`, `week_progress`, `topic_mastery` và `learning_events`.

## Vercel

Tạo một Vercel project riêng từ cùng repository và đặt **Root Directory** là:

```text
teacher-app
```

Thêm hai biến môi trường trên vào Vercel project giáo viên. Không cần thêm biến Dialogflow, Gemini hoặc authentication. Student app tiếp tục deploy từ repository root như hiện tại.
