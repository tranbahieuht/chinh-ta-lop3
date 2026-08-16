export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDateTime(value: string | null) {
  if (!value) return "Chưa có hoạt động";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function eventLabel(type: string) {
  const labels: Record<string, string> = {
    ANSWER_RESULT: "Trả lời câu hỏi",
    HINT_USED: "Dùng gợi ý",
    WEEK_COMPLETE: "Hoàn thành tuần",
    BADGE_EARNED: "Nhận huy hiệu",
  };
  return labels[type] ?? type.replaceAll("_", " ").toLocaleLowerCase("vi");
}
