# Triển khai production — Chính tả lớp 3

Tài liệu này triển khai backend Next.js hiện tại lên Supabase và Vercel, sau đó nối agent Dialogflow ES v6. Không cần sửa architecture hoặc bật lại webhook từng intent.

## A — Supabase

### 1. Tạo project

1. Đăng nhập Supabase và chọn **New project**.
2. Chọn organization, tên project, region phù hợp và mật khẩu database mạnh.
3. Chờ project khởi tạo xong.

### 2. Lấy URL và API keys

Trong Dashboard, mở **Connect** hoặc **Settings → API Keys**. Project URL cũng có trong **Integrations → Data API**.

Điền ba biến sau ở local và Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-hoặc-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<secret-hoặc-service_role-key>
```

Supabase hiện hỗ trợ cặp key mới `publishable`/`secret` và cặp legacy `anon`/`service_role`. Project giữ tên biến hiện tại để không đổi architecture: publishable/anon đặt vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`; secret/service_role đặt vào `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đặt trong `.env.local`, Vercel Environment Variables hoặc secret store của CI. Không đưa key này vào Client Component, browser, log, commit hoặc biến có tiền tố `NEXT_PUBLIC_`.

Tài liệu chính thức: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) và [Data API URL](https://supabase.com/docs/guides/api).

### 3. Dựng schema production

1. Mở **SQL Editor** trong Supabase Dashboard.
2. Tạo query mới.
3. Mở file `supabase/production_setup.sql` trong repository.
4. Copy toàn bộ nội dung, paste vào SQL Editor và chọn **Run**.
5. Có thể chạy lại file; DDL, trigger, function và badge seed được viết idempotent.

`production_setup.sql` là bản sao byte-for-byte của migration canonical `supabase/migrations/202608160001_chinh_ta_gamification.sql`. Không duy trì schema thứ hai.

### 4. Kiểm tra tables và badge seed

Chạy query sau trong SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'students', 'week_progress', 'answer_history', 'topic_mastery',
    'badges', 'student_badges', 'learning_events'
  )
order by table_name;

select badge_code, name
from public.badges
order by badge_code;
```

Kết quả phải có 7 tables và 9 badge. Các ràng buộc quan trọng:

- `students.student_code` unique.
- `week_progress (student_id, week)` unique.
- `topic_mastery (student_id, topic)` unique.
- `answer_history.event_id` và `learning_events.event_id` unique.
- Mỗi học sinh chỉ có một `WEEK_COMPLETE` cho một tuần.
- Các bảng con dùng foreign key `on delete cascade` về `students`.

### 5. RLS và service role

RLS được bật trên cả 7 tables. Không có policy cho `anon` hoặc `authenticated`, và quyền trực tiếp của hai role này đã bị revoke. Frontend hiện không query database trực tiếp.

Backend dùng client server-only tại `lib/db/supabase-admin.ts`. Service role/secret key bypass RLS theo thiết kế Supabase. Hai RPC ghi dữ liệu và helper cấp badge chỉ được cấp quyền cho `service_role`.

Mỗi lần `chinh_ta_record_answer`, `chinh_ta_record_hint` hoặc `chinh_ta_complete_week` là một PostgreSQL transaction. Nếu insert event thành công nhưng một update sau đó lỗi, toàn bộ function rollback; retry không bị mắc trạng thái “đã có event nhưng chưa cộng XP”.

### 6. Database smoke test

Tạo `.env.local` từ `.env.example`, điền Supabase variables và chạy:

```powershell
$env:DATABASE_TEST_MODE="cleanup"
npm run test:db
```

Test thực hiện connect, kiểm tra 9 badge, gọi RPC tạo test student, ghi learning event, xác nhận +10 XP/progress/mastery, retry cùng event ID, rồi xóa test student. Foreign keys cascade dọn các record liên quan.

`DATABASE_TEST_MODE=cleanup` là guard bắt buộc để script không vô tình tạo dữ liệu khi người chạy chưa chủ động cho phép.

## B — Vercel

### 1. Import project

1. Push repository lên Git provider của bạn.
2. Trong Vercel chọn **Add New → Project** và import repository.
3. Đặt **Root Directory** là `fraction-ai-tutor` nếu repository root là thư mục `AI chatbot`; nếu repository bắt đầu trực tiếp tại app Next.js thì để root mặc định.
4. Framework preset phải được nhận diện là **Next.js**.

Vercel chạy build command trong Root Directory. Xem [Vercel Project Settings](https://vercel.com/docs/project-configuration/project-settings).

### 2. Environment variables

Trong **Project → Settings → Environment Variables**, thêm cho Production (và Preview nếu cần):

```dotenv
# Supabase — bắt buộc
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini — API key có thể trống, nhưng AI sẽ dùng fallback
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_MS=4500

# Dialogflow
DIALOGFLOW_PROJECT_ID=
DIALOGFLOW_WEBHOOK_SECRET=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
DIALOGFLOW_LANGUAGE_CODE=vi
```

Ba biến `DIALOGFLOW_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL` và `GOOGLE_PRIVATE_KEY` là bắt buộc để frontend gọi Dialogflow DetectIntent. Webhook Chính tả không dùng private key này.

### Credential DetectIntent trên Vercel

1. Trong Google Cloud Console, chọn đúng project đang chứa Dialogflow ES agent và bảo đảm **Dialogflow API** đã được bật.
2. Vào **IAM & Admin → Service Accounts**, tạo một service account riêng cho frontend, ví dụ `chinh-ta-web-detect-intent`.
3. Gán duy nhất role **Dialogflow API Client** (`roles/dialogflow.client`) ở project chứa agent. Role này có quyền `dialogflow.sessions.detectIntent`; không cần Owner hoặc Editor.
4. Mở service account → **Keys → Add key → Create new key → JSON**. File JSON chỉ tải được lúc tạo; giữ file ở nơi an toàn và không commit.
5. Từ file JSON, tạo Vercel Production Environment Variables:
   - `project_id` → `DIALOGFLOW_PROJECT_ID`
   - `client_email` → `GOOGLE_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
   - đặt thêm `DIALOGFLOW_LANGUAGE_CODE=vi`
6. Có thể dán private key dạng nhiều dòng hoặc dạng có ký tự `\\n`; server tự chuyển `\\n` thành newline thật. Không thêm dấu nháy bao quanh giá trị trên Vercel.
7. Redeploy Production sau khi lưu ENV. Deployment đang chạy không tự nhận biến mới.

Không gửi file JSON hoặc private key qua chat/email. Sau khi deploy, `/api/dialogflow/health` phải trả `dialogflowConfigured: true`; một request học thật qua `/api/chat` mới xác nhận thêm quyền IAM và khả năng kết nối.

Không đặt `DATABASE_TEST_MODE` hoặc `CHINHTA_BASE_URL` trong runtime production; đây là biến của script chạy local/CI. Thay đổi environment variables chỉ có hiệu lực với deployment mới, nên redeploy sau khi cập nhật. Xem [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

### 3. Deploy

1. Chọn **Deploy**.
2. Chờ `next build` hoàn tất.
3. Lấy domain production, ví dụ `https://chinh-ta-lop-3.vercel.app`.

Webhook và health route đều khai báo Node.js runtime. Backend không ghi file local và không phụ thuộc localhost hay process chạy lâu; state được lưu trong Supabase.

## C — Health và production smoke

Mở:

```text
https://<domain>/api/dialogflow/health
```

Kết quả mong muốn:

```json
{
  "ok": true,
  "database": true,
  "geminiConfigured": true,
  "timestamp": "2026-08-16T00:00:00.000Z"
}
```

Health thực hiện query nhẹ thật tới table `students`, không chỉ kiểm tra env. `geminiConfigured:false` không chặn game vì Gemini có static fallback. `database:false` nghĩa là URL/key sai, schema chưa chạy, Supabase chưa reachable hoặc role chưa có quyền. Public response không chứa secret hay stack trace.

Sau khi health xanh, chạy end-to-end smoke từ máy local/CI có cùng Supabase credentials:

```powershell
$env:CHINHTA_BASE_URL="https://<domain>"
$env:DATABASE_TEST_MODE="cleanup"
npm run test:chinta-production
```

Script kiểm tra health, answer +10 XP, retry +0, GET progress, AI Explain, hoàn thành tuần và persistence; sau đó xóa test student tổng hợp khỏi Supabase. Nếu đã bật webhook secret, local env phải chứa cùng `DIALOGFLOW_WEBHOOK_SECRET` để script gửi header.

## D — Dialogflow ES

1. Trong Dialogflow ES mở **Fulfillment**.
2. Bật Webhook và đặt URL:

   ```text
   https://<domain>/api/dialogflow/webhook
   ```

3. Nếu dùng `DIALOGFLOW_WEBHOOK_SECRET`, thêm custom header:

   ```text
   x-dialogflow-webhook-secret: <cùng giá trị trên Vercel>
   ```

4. Chọn **Save**.
5. Import `dist/ChinhTaLop3_Gamified_DialogflowES_v6.zip` nếu chưa import.

Agent v6 đã có `webhookUsed: true` cho 743 intent cần backend; không bật webhook thủ công cho các intent static.

## Checklist phát hành

- SQL Editor chạy `supabase/production_setup.sql` không lỗi.
- Có 7 tables và 9 badge.
- Ba Supabase variables đã được đặt đúng environment trên Vercel.
- Service role/secret key không có tiền tố `NEXT_PUBLIC_` và không nằm trong repository.
- Production deployment build thành công.
- `/api/dialogflow/health` trả `ok:true`, `database:true`.
- `npm run test:db` và `npm run test:chinta-production` pass khi có credentials.
- Dialogflow Fulfillment URL đã Save.
