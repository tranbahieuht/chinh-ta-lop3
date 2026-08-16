# Backend Chính tả lớp 3

## Kiến trúc

Backend nằm trong project Next.js 16 App Router và triển khai cùng website trên Vercel. Route Handlers chỉ dùng Supabase service-role ở server. Ba RPC PostgreSQL `chinh_ta_record_answer`, `chinh_ta_record_hint` và `chinh_ta_complete_week` thực hiện ghi ledger, cộng XP, cập nhật level/progress/mastery/streak và cấp badge trong transaction. `HINT_USED` có event ID riêng, không cộng XP và chỉ tăng bộ đếm gợi ý một lần.

`learning_events.event_id` là khóa idempotency. Unique index `(student_id, week)` cho `WEEK_COMPLETE` còn chặn việc dùng event ID khác để nhận lại thưởng tuần. Mastery được lưu riêng và không tham gia leaderboard.

## Database

Migration: `supabase/migrations/202608160001_chinh_ta_gamification.sql`.

File chạy trực tiếp trong Supabase SQL Editor: `supabase/production_setup.sql`. Hai file phải giống hệt nhau để không tạo hai schema khác nhau. Hướng dẫn production đầy đủ nằm tại `docs/CHINHTA_DEPLOY.md`.

Các bảng chính:

- `students`: hồ sơ, tổng XP, level, tuần hiện tại và streak.
- `week_progress`: tiến độ duy nhất theo `(student_id, week)`.
- `answer_history`: lịch sử từng câu, gồm attempt/hint/difficulty/mastery signal.
- `topic_mastery`: mastery 0–100 duy nhất theo `(student_id, topic)`.
- `badges`, `student_badges`: danh mục và huy hiệu đã nhận.
- `learning_events`: idempotency và XP ledger dùng cho leaderboard tuần.

Migration seed 9 badge: `FIRST_WEEK`, `NO_HINT_10`, `PERFECT_10`, `COMEBACK`, `STREAK_3`, `STREAK_7`, `MASTER_CK`, `BOSS_HKI`, `FINAL_BOSS`.

## Quy tắc XP và mastery

Backend tự tính XP, không sử dụng `xpEarned` do client gửi: đúng lần đầu 10; sửa đúng sau một lần sai 8; Hint 1/2/3 lần lượt 7/5/3; xem đáp án hoặc sai 0; hoàn thành tuần 30; cả tuần không dùng hint thêm 20.

Level bắt đầu tại các mốc 0, 100, 250, 450, 700 XP. Sau level 5, mỗi 350 XP tăng một level.

Mastery bắt đầu ở 50. Đúng lần đầu không hint +8; đúng sau retry +5; Hint 1 +3; Hint 2 +1; Hint 3 +0; sai -5. Kết quả luôn được clamp trong 0–100.

Streak dùng ngày tại `Asia/Ho_Chi_Minh`: cùng ngày không tăng, ngày kế tiếp +1, bỏ quá một ngày thì về 1.

## Dialogflow ES Connection

Fulfillment URL sau khi deploy là `https://<domain>/api/dialogflow/webhook`. Source không hard-code domain. Health check là `GET https://<domain>/api/dialogflow/health`; route query thật table `students` và trả trạng thái database, việc Gemini đã được cấu hình cùng timestamp, không trả khóa bí mật hoặc stack trace.

Webhook đọc `queryResult.intent.displayName`, `queryResult.parameters`, `queryResult.outputContexts`, `originalDetectIntentRequest.payload` và custom payload nếu có. Nó không phụ thuộc `queryResult.action`, vì intent static để action rỗng. Thứ tự nhận diện chính xác là `payload.action`, `payload.eventType`, regex tên intent, rồi parameters/event metadata. Field thiếu được thay bằng giá trị an toàn và event không nhận diện được trở thành `UNKNOWN`.

Các event hỗ trợ: `ANSWER_RESULT`, `HINT_USED`, `WEEK_COMPLETE`, `GET_PROGRESS`, `GET_SCORE`, `GET_LEADERBOARD`, `GET_BADGES`, `AI_EXPLAIN`, `AI_FEEDBACK`, `AI_ANALYZE_MISTAKE`, `AI_CREATE_SIMILAR_QUESTION`, `UNKNOWN`.

Agent v7 chỉ bật `webhookUsed` cho các nhóm cần backend: intent `Correct`, `Wrong`, `Hint 1/2/3`, hoàn thành tuần, `Global_Progress`, `Global_Score`, `Global_Leaderboard`, `Global_Badges` và bốn intent AI. Theory, Start, menu và các intent điều hướng vẫn static. Mỗi intent bật webhook vẫn giữ text response tĩnh; route cũng catch lỗi database/Gemini và trả HTTP 200 với phản hồi an toàn để flow không bị câm.

Custom payload v7 dùng schema `3.0`:

```json
{
  "schemaVersion": "3.0",
  "action": "ANSWER_RESULT",
  "eventType": "ANSWER_RESULT",
  "eventId": "",
  "eventIdPolicy": "WEB_OR_BACKEND_DERIVED",
  "week": 1,
  "topic": "c / k",
  "questionId": "Q01",
  "correctAnswer": "cây",
  "correct": true,
  "attempt": 1,
  "hintLevel": 0,
  "difficulty": "basic",
  "sessionState": {},
  "xpPolicy": { "totalXP": "WEBHOOK_DATABASE_REQUIRED" },
  "webhook": { "enabled": true, "action": "ANSWER_RESULT" }
}
```

Nên gửi `eventId` ổn định từ web/client. Nếu field này trống, parser tạo ID từ session, intent, question, attempt, hint và `responseId` hoặc time bucket. Database dùng `learning_events.event_id` và khóa hoàn thành tuần để retry không cộng XP lần hai.

Ví dụ request mô phỏng Dialogflow:

```json
{
  "session": "projects/demo/agent/sessions/session-123",
  "queryResult": {
    "queryText": "cây",
    "intent": { "displayName": "W01_Q01_Correct" },
    "parameters": { "eventId": "web-session-123-w01-q01-a1" },
    "outputContexts": [
      {
        "name": "projects/demo/agent/sessions/session-123/contexts/week01_active",
        "parameters": {
          "studentId": "3A001",
          "className": "3A",
          "week": 1,
          "questionId": "W01_Q01",
          "topic": "c / k",
          "correct": true,
          "attempt": 1,
          "hintLevel": 0,
          "difficulty": "basic",
          "masterySignal": "advance"
        }
      }
    ]
  }
}
```

Response có `fulfillmentText`, `fulfillmentMessages`, custom `payload.game` với `xpEarned`, `totalXP`, `level`, `mastery`, `streak`, `newBadges`, và các `outputContexts` đã merge. Webhook không xóa context hint, adaptive, support hoặc current question hiện có. Context `backend_state` chỉ bổ sung `backendMastery` và `backendSupportRecommended`.

Ưu tiên nhận dạng học sinh: `studentId` trong payload web, metadata/payload của session, rồi guest code ổn định theo Dialogflow session ID. Khi có login, frontend chỉ cần gửi student code thật trong original payload/parameters.

## API

- `GET /api/leaderboard?className=3A&period=weekly|all_time`
- `GET /api/students/{studentId}/progress`
- `POST /api/dialogflow/webhook`
- `GET /api/dialogflow/health`

Leaderboard tuần tổng hợp `learning_events.xp_awarded` theo tuần hiện tại tại Việt Nam. Leaderboard toàn thời gian dùng `students.total_xp`; cả hai không trả mastery.

## Gemini cho Chính tả

Service duy nhất nằm tại `lib/ai/spelling-ai.ts`, dùng SDK `@google/genai` và model cấu hình tập trung trong `lib/ai/config.ts`. Model mặc định là `gemini-flash-latest`; có thể đổi bằng `GEMINI_MODEL` mà không sửa code.

Bốn hàm server-side:

- `explainRule(input)`: trả `explanation`, ví dụ và câu hỏi gợi mở.
- `feedbackAnswer(input)`: nhận `isCorrect` từ backend, trả feedback và mức hint đề nghị. Gemini không tự chấm đúng/sai.
- `analyzeMistake(input)`: chỉ trả một trong bảy enum lỗi được cho phép, lý do ngắn, khuyến nghị và confidence.
- `createSimilarQuestion(input)`: tạo câu, đáp án, ba hint và difficulty trong đúng quy tắc tuần.

Mỗi request dùng `systemInstruction`, `responseMimeType: application/json` và `responseJsonSchema` của Gemini SDK. Runtime parser tiếp tục kiểm tra kiểu, enum, độ dài và nội dung an toàn. `validateGeneratedQuestion()` loại câu rỗng, markdown/HTML rác, nội dung hệ thống, yêu cầu thông tin cá nhân, difficulty sai, từ trong `avoidWords`, ví dụ cũ và câu trùng source.

Timeout mặc định là 4,5 giây, được áp dụng qua cả HTTP timeout của SDK và AbortSignal. Explain không cá nhân có cache bộ nhớ 30 phút theo `week + topic + rule`; feedback cá nhân không cache.

Khi thiếu API key, timeout, quota, lỗi mạng, JSON hỏng hoặc validation fail, service trả fallback an toàn. Câu tương tự lấy từ ngân hàng static theo quy tắc; game/database không phụ thuộc Gemini. Log chỉ ghi action, tuần, topic, model và loại kết quả; không ghi API key hoặc hồ sơ học sinh.

Mapping webhook:

- `AI_EXPLAIN` → `explainRule()`
- `AI_FEEDBACK` → `feedbackAnswer()`
- `AI_ANALYZE_MISTAKE` → `analyzeMistake()`
- `AI_CREATE_SIMILAR_QUESTION` → `createSimilarQuestion()` và output context `ai_generated_question`

Webhook trả cả `fulfillmentText`, `fulfillmentMessages` và custom `payload`. Không tạo `/api/ai/spelling` riêng vì webhook gọi service trực tiếp, tránh thêm một network hop.

## Environment

Sao chép `.env.example` thành `.env.local` và điền:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_MS=4500
DIALOGFLOW_WEBHOOK_SECRET=
DIALOGFLOW_PROJECT_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
DIALOGFLOW_LANGUAGE_CODE=vi
```

Không đưa service-role key hoặc khóa Gemini xuống component client. Nếu `GEMINI_API_KEY` trống, các hàm AI trả phản hồi dự phòng; database/gamification vẫn hoạt động.

## Chạy local và test

1. Tạo project Supabase và chạy migration bằng Supabase SQL Editor hoặc CLI.
2. Điền `.env.local`.
3. Chạy `npm install` và `npm run dev`.
4. Test core: `npm run test:gamification`, `npm run test:webhook`, `npm run test:dialogflow-webhook` và `npm run test:ai`.
5. Khi có Supabase credentials: đặt `DATABASE_TEST_MODE=cleanup` rồi chạy `npm run test:db`.
6. Sau deploy: đặt thêm `CHINHTA_BASE_URL=https://<domain>` rồi chạy `npm run test:chinta-production`.
7. Seed development: `npm run seed:demo` (idempotent, tạo 5 học sinh lớp 3A).
8. Kiểm tra phát hành: `npm run lint` và `npm run build`.

## Deploy Vercel và nối agent v6

1. Thêm các biến môi trường vào Vercel; chỉ `NEXT_PUBLIC_SUPABASE_URL` và anon key được phép public.
2. Deploy project và lấy URL `https://<domain>/api/dialogflow/webhook`.
3. Trong Dialogflow ES Fulfillment, bật webhook và nhập URL trên. Nếu đặt `DIALOGFLOW_WEBHOOK_SECRET`, cấu hình cùng giá trị trong custom header `x-dialogflow-webhook-secret`.
4. Import `ChinhTaLop3_Gamified_DialogflowES_v6.zip`. Các intent cần backend đã có `webhookUsed: true`; không bật webhook thủ công cho các intent static.
5. Gọi `/api/dialogflow/health` để xác nhận database hoạt động và kiểm tra trạng thái cấu hình Gemini.
6. Web/app nên tạo `eventId` ổn định cho mỗi learning event. Nếu thiếu, backend tạo khóa fallback; eventId do web gửi vẫn là lựa chọn tốt nhất.
