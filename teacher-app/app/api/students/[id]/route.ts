import { apiError } from "@/lib/api";
import { getStudentDetail } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const student = await getStudentDetail(decodeURIComponent(id));
    return student
      ? Response.json({ success: true, data: student })
      : Response.json({ success: false, error: "Không tìm thấy học sinh." }, { status: 404 });
  } catch (reason) {
    return apiError("students/detail", reason);
  }
}
