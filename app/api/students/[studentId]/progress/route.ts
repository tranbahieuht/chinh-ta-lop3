import { getStudentProgress } from "@/lib/gamification/service";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await context.params;
    const progress = await getStudentProgress(studentId);
    return progress ? Response.json(progress) : Response.json({ success: false, error: "Không tìm thấy học sinh." }, { status: 404 });
  } catch (reason) {
    console.error("[api/students/progress]", reason);
    return Response.json({ success: false, error: "Không tải được tiến độ." }, { status: 500 });
  }
}
