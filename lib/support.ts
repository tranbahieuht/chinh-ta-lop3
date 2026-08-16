import type { HintLevel } from "@/types/lesson";

export const supportLabels: Record<HintLevel, { name: string; difficulty: string; note: string }> = {
  0: { name: "Tự khám phá", difficulty: "Nâng cao", note: "Mít sẽ để em thử sức trước" },
  1: { name: "Gợi ý nhẹ", difficulty: "Tiêu chuẩn", note: "Một dấu hiệu nhỏ để em nghĩ tiếp" },
  2: { name: "Từng bước", difficulty: "Cơ bản", note: "Chia bài toán thành các bước rõ ràng" },
  3: { name: "Đồng hành", difficulty: "Rất cơ bản", note: "Giải thích gần đầy đủ, thật chậm rãi" },
};
