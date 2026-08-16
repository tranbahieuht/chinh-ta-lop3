import { getLeaderboard } from "@/lib/gamification/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    const period = search.get("period") === "weekly" ? "weekly" : "all_time";
    return Response.json(await getLeaderboard(search.get("className") ?? "", period));
  } catch (reason) {
    console.error("[api/leaderboard]", reason);
    return Response.json({ success: false, error: "Không tải được bảng xếp hạng." }, { status: 500 });
  }
}

