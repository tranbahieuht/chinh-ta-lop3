import { apiError } from "@/lib/api";
import { getClasses } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ success: true, data: await getClasses() });
  } catch (reason) {
    return apiError("classes", reason);
  }
}
