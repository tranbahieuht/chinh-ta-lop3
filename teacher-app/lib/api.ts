export function readClassName(request: Request) {
  return new URL(request.url).searchParams.get("className")?.trim().slice(0, 40) || undefined;
}

export function apiError(scope: string, reason: unknown) {
  console.error(`[teacher-api/${scope}]`, reason instanceof Error ? reason.message : "Unknown error");
  return Response.json({ success: false, error: "Không tải được dữ liệu giáo viên." }, { status: 500 });
}
