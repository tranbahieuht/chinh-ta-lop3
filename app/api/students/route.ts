import { randomUUID } from "node:crypto";

import { createOrUpdateStudent } from "@/lib/gamification/service";
import { safeIdentifier, safeText } from "@/lib/security/input";

export const runtime = "nodejs";

type StudentBody = { displayName?: unknown; className?: unknown; studentCode?: unknown };

export async function POST(request: Request) {
  try {
    const body = await request.json() as StudentBody;
    const displayName = safeText(body.displayName, "", 80);
    const className = safeText(body.className, "", 40);
    if (!displayName || !className) {
      return Response.json({ success: false, error: "Tên hiển thị và lớp là bắt buộc." }, { status: 400 });
    }
    const studentCode = safeIdentifier(body.studentCode, randomUUID());
    const student = await createOrUpdateStudent({ studentCode, displayName, className });
    return Response.json({ success: true, student });
  } catch (reason) {
    console.error("[api/students] create failed", { reason: reason instanceof Error ? reason.name : "UNKNOWN" });
    return Response.json({ success: false, error: "Chưa thể tạo hồ sơ lúc này. Em thử lại nhé." }, { status: 500 });
  }
}
