import { apiError, readClassName } from "@/lib/api";
import { getDashboard } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return Response.json({ success: true, data: await getDashboard(readClassName(request)) });
  } catch (reason) {
    return apiError("dashboard", reason);
  }
}
