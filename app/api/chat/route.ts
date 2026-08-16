import { POST as detectDialogflowIntent } from "@/app/api/dialogflow/route";
import { safeInteger, safeText } from "@/lib/security/input";

export const runtime = "nodejs";

type ChatBody = {
  studentId?: unknown;
  sessionId?: unknown;
  message?: unknown;
  week?: unknown;
  displayName?: unknown;
  className?: unknown;
  event?: unknown;
  metadata?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function findGame(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const game = findGame(child);
      if (game) return game;
    }
    return undefined;
  }
  const row = record(value);
  if (row.game && typeof row.game === "object") return record(row.game);
  for (const child of Object.values(row)) {
    const game = findGame(child);
    if (game) return game;
  }
  return undefined;
}

export async function POST(request: Request) {
  let body: ChatBody;
  try {
    body = await request.json() as ChatBody;
  } catch {
    return Response.json({ success: false, error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }
  const studentId = safeText(body.studentId, "", 80);
  const sessionId = safeText(body.sessionId, "", 80);
  const message = safeText(body.message, "", 300);
  const event = safeText(body.event, "", 100);
  const week = safeInteger(body.week, 1, 1, 35);
  if (!studentId || !sessionId || (!message && !event)) {
    return Response.json({ success: false, error: "studentId, sessionId và message hoặc event là bắt buộc." }, { status: 400 });
  }
  const extraMetadata = record(body.metadata);
  const dialogflowRequest = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      event,
      sessionId,
      metadata: {
        ...extraMetadata,
        studentId,
        displayName: safeText(body.displayName, "Học sinh", 80),
        className: safeText(body.className, "Chưa xếp lớp", 40),
        week,
        currentWeek: week,
      },
    }),
  });
  const response = await detectDialogflowIntent(dialogflowRequest);
  const result = await response.json() as Record<string, unknown>;
  const payloads = Array.isArray(result.payloads) ? result.payloads : [];
  const queryResult = record(result.queryResult);
  return Response.json({
    success: result.success === true,
    message: typeof result.message === "string" ? result.message : undefined,
    quickReplies: Array.isArray(result.suggestions) ? result.suggestions : [],
    payloads,
    game: findGame(payloads),
    contexts: Array.isArray(queryResult.outputContexts) ? queryResult.outputContexts : [],
    error: typeof result.error === "string" ? result.error : undefined,
  }, { status: response.status });
}
