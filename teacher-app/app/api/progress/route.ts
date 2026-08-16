import { apiError, readClassName } from "@/lib/api";
import { getProgress } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return Response.json({ success: true, data: await getProgress(readClassName(request)) });
  } catch (reason) {
    return apiError("progress", reason);
  }
}
