/**
 * Legacy endpoint kept to preserve the public route without bypassing Dialogflow.
 * All conversational traffic must use /api/dialogflow.
 */
export async function POST() {
  return Response.json({
    success: false,
    error: "API này đã được thay thế bởi /api/dialogflow.",
  }, { status: 410 });
}
