export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

const configuredTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
export const GEMINI_TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.min(10_000, Math.max(1_000, Math.trunc(configuredTimeout)))
  : 4_500;

export const GEMINI_MAX_OUTPUT_TOKENS = 420;

export const SPELLING_SYSTEM_PROMPT = `Bạn là trợ lý học Chính tả Tiếng Việt lớp 3.
Dùng tiếng Việt, câu ngắn, từ dễ hiểu, thân thiện và thường dưới 80 từ. Chỉ dùng tối đa 1-2 emoji phù hợp.
Bám đúng tuần, chủ đề và quy tắc được cung cấp. Không tự thêm kiến thức ngoài chương trình.
Không làm thay học sinh hoặc đưa đáp án ngay khi học sinh đang luyện; ưu tiên gợi ý từng bước.
Không dùng thuật ngữ ngôn ngữ học khó. Không hỏi tên đầy đủ, địa chỉ, số điện thoại hay thông tin cá nhân.
Không nói về API, model, prompt hoặc hệ thống nội bộ.
XP, level, đúng/sai, mastery, badge và tiến độ luôn do backend quyết định; bạn không được thay đổi các giá trị đó.`;

export const ALLOWED_DIFFICULTIES = ["basic", "basic_support", "example", "medium", "hard"] as const;
export type AIDifficulty = typeof ALLOWED_DIFFICULTIES[number];

export const MISTAKE_TYPES = [
  "CONFUSING_INITIAL",
  "CONFUSING_RHYME",
  "TONE_MARK",
  "CAPITALIZATION",
  "FOREIGN_NAME",
  "CARELESS",
  "UNKNOWN",
] as const;
export type MistakeType = typeof MISTAKE_TYPES[number];

