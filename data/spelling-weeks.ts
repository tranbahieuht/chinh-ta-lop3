import type { SpellingWeek } from "@/types/spelling";

export const spellingWeeks: SpellingWeek[] = [
  { week: 1, title: "Ngày gặp lại", topic: "c / k", semester: 1, type: "lesson" },
  { week: 2, title: "Cánh rừng trong nắng", topic: "g / gh", semester: 1, type: "lesson" },
  { week: 3, title: "Nhật kí tập bơi", topic: "ng / ngh", semester: 1, type: "lesson" },
  { week: 4, title: "Mùa hè lấp lánh", topic: "ch / tr • v / d", semester: 1, type: "lesson" },
  { week: 5, title: "Đi học vui sao", topic: "s / x • hỏi / ngã", semester: 1, type: "lesson" },
  { week: 6, title: "Lời giải toán đặc biệt", topic: "r / d / gi • an / ang", semester: 1, type: "lesson" },
  { week: 7, title: "Bàn tay cô giáo", topic: "l / n • ăn / ăng", semester: 1, type: "lesson" },
  { week: 8, title: "Thư viện", topic: "ch / tr • ân / âng • dân / dâng", semester: 1, type: "lesson" },
  { week: 9, title: "Ôn tập giữa học kì I", topic: "Checkpoint giữa HKI", semester: 1, type: "checkpoint" },
  { week: 10, title: "Ngưỡng cửa", topic: "iêu / ươu • en / eng", semester: 1, type: "lesson" },
  { week: 11, title: "Khi cả nhà bé tí", topic: "iu / ưu • iên / iêng", semester: 1, type: "lesson" },
  { week: 12, title: "Tia nắng bé nhỏ", topic: "s / x • uôn / uông", semester: 1, type: "lesson" },
  { week: 13, title: "Tôi yêu em tôi", topic: "r / d / gi • ươn / ương", semester: 1, type: "lesson" },
  { week: 14, title: "Những bậc đá chạm mây", topic: "ch / tr • ăn / ăng", semester: 1, type: "lesson" },
  { week: 15, title: "Những chiếc áo ấm", topic: "l / n • hỏi / ngã", semester: 1, type: "lesson" },
  { week: 16, title: "Ngôi nhà trong cỏ", topic: "s / x • ao / au", semester: 1, type: "lesson" },
  { week: 17, title: "Người làm đồ chơi", topic: "Phiếu mượn sách thư viện", semester: 1, type: "lesson" },
  { week: 18, title: "Ôn tập cuối học kì I", topic: "Boss cuối HKI", semester: 1, type: "boss" },
  { week: 19, title: "Bầu trời", topic: "ch / tr • chuyền / truyền", semester: 2, type: "lesson" },
  { week: 20, title: "Cóc kiện Trời", topic: "s / x • ăt / ăc", semester: 2, type: "lesson" },
  { week: 21, title: "Ngày hội rừng xanh", topic: "Viết hoa địa lí • iêu / ươu • ât / âc", semester: 2, type: "lesson" },
  { week: 22, title: "Mặt trời xanh của tôi", topic: "r / d / gi • in / inh", semester: 2, type: "lesson" },
  { week: 23, title: "Lời kêu gọi toàn dân tập thể dục", topic: "l / n • hỏi / ngã", semester: 2, type: "lesson" },
  { week: 24, title: "Chuyện bên cửa sổ", topic: "iu / ưu • iêm / im", semester: 2, type: "lesson" },
  { week: 25, title: "Mèo đi câu cá", topic: "s / x • v / d", semester: 2, type: "lesson" },
  { week: 26, title: "Ngày như thế nào là đẹp?", topic: "r / d / gi • hỏi / ngã", semester: 2, type: "lesson" },
  { week: 27, title: "Ôn tập giữa học kì II", topic: "Checkpoint giữa HKII", semester: 2, type: "checkpoint" },
  { week: 28, title: "Đất nước là gì?", topic: "ch / tr • ươc / ươt", semester: 2, type: "lesson" },
  { week: 29, title: "Sông Hương", topic: "Viết hoa địa lí Việt Nam", semester: 2, type: "lesson" },
  { week: 30, title: "Nhà rông", topic: "s / x • hỏi / ngã", semester: 2, type: "lesson" },
  { week: 31, title: "Hai Bà Trưng", topic: "ch / tr • trú / chú", semester: 2, type: "lesson" },
  { week: 32, title: "Ngọn lửa Ô-lim-pích", topic: "Tên người Việt Nam và nước ngoài", semester: 2, type: "lesson" },
  { week: 33, title: "Thư của ông Trái Đất gửi các bạn nhỏ", topic: "r / d / gi • hỏi / ngã", semester: 2, type: "lesson" },
  { week: 34, title: "Bác sĩ Y-éc-xanh", topic: "Tên người và địa lí nước ngoài", semester: 2, type: "lesson" },
  { week: 35, title: "Ôn tập và đánh giá cuối năm", topic: "Final Boss", semester: 2, type: "boss" },
];

export function getSpellingWeek(value: number | string) {
  const week = typeof value === "number" ? value : Number(value);
  return spellingWeeks.find((item) => item.week === week);
}

export const badgeCatalog = [
  { code: "FIRST_WEEK", icon: "🌟", title: "Tuần đầu tiên", description: "Hoàn thành tuần học đầu tiên." },
  { code: "NO_HINT_10", icon: "🧠", title: "Tự lực", description: "Đúng 10 câu mà không dùng gợi ý." },
  { code: "PERFECT_10", icon: "💯", title: "Chuỗi hoàn hảo", description: "Đúng 10 câu liên tiếp." },
  { code: "COMEBACK", icon: "💪", title: "Không bỏ cuộc", description: "Sửa đúng sau khi sai ít nhất 5 lần." },
  { code: "STREAK_3", icon: "🔥", title: "Chăm học 3 ngày", description: "Học liên tiếp 3 ngày." },
  { code: "STREAK_7", icon: "🚀", title: "Chăm học 7 ngày", description: "Học liên tiếp 7 ngày." },
  { code: "MASTER_CK", icon: "🏅", title: "Bậc thầy c/k", description: "Đạt mastery c/k từ 90%." },
  { code: "BOSS_HKI", icon: "👑", title: "Chinh phục Boss HKI", description: "Hoàn thành tuần 18." },
  { code: "FINAL_BOSS", icon: "🏆", title: "Chinh phục Final Boss", description: "Hoàn thành tuần 35." },
] as const;
