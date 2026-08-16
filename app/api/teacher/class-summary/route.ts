import { getTeacherClassSummary } from "@/lib/gamification/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const className = new URL(request.url).searchParams.get("className") ?? "";
  if (!className.trim()) return Response.json({ success: false, error: "className là bắt buộc." }, { status: 400 });
  try {
    return Response.json(await getTeacherClassSummary(className));
  } catch (reason) {
    console.error("[api/teacher/class-summary]", reason);
    return Response.json({ success: false, error: "Không tải được tổng hợp lớp." }, { status: 500 });
  }
}

