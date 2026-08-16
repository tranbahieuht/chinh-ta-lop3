import { SessionsClient, protos } from "@google-cloud/dialogflow";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "../../../lib/ai/config.ts";

type DialogflowBody = {
  message?: unknown;
  sessionId?: unknown;
  event?: unknown;
  languageCode?: unknown;
  metadata?: unknown;
};

const DEFAULT_FALLBACK_INTENT = "Default Fallback Intent";
function asJson(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function protobufValueToJson(value: protos.google.protobuf.IValue): unknown {
  if (value.stringValue !== null && value.stringValue !== undefined) return value.stringValue;
  if (value.numberValue !== null && value.numberValue !== undefined) return value.numberValue;
  if (value.boolValue !== null && value.boolValue !== undefined) return value.boolValue;
  if (value.nullValue !== null && value.nullValue !== undefined) return null;
  if (value.listValue) return (value.listValue.values ?? []).map(protobufValueToJson);
  if (value.structValue) return protobufStructToJson(value.structValue);
  return null;
}

function protobufStructToJson(struct: protos.google.protobuf.IStruct): Record<string, unknown> {
  return Object.fromEntries(Object.entries(struct.fields ?? {}).map(([key, value]) => [key, protobufValueToJson(value)]));
}

function jsonToProtobufValue(value: unknown): protos.google.protobuf.IValue {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { numberValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (Array.isArray(value)) return { listValue: { values: value.map(jsonToProtobufValue) } };
  if (typeof value === "object") return { structValue: jsonToProtobufStruct(value as Record<string, unknown>) };
  return { stringValue: String(value) };
}

function jsonToProtobufStruct(value: Record<string, unknown>): protos.google.protobuf.IStruct {
  return { fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonToProtobufValue(child)])) };
}

function collectStrings(value: unknown, keys: Set<string>, result: string[]) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (keys.has(key) && typeof child === "string" && child.trim()) result.push(child.trim());
    else if (keys.has(key) && Array.isArray(child)) {
      for (const item of child) {
        if (typeof item === "string" && item.trim()) result.push(item.trim());
        else if (item && typeof item === "object") collectStrings(item, new Set(["title", "text", "label"]), result);
      }
    } else if (child && typeof child === "object") collectStrings(child, keys, result);
  }
}

function extractFollowupEvent(payloads: unknown[]) {
  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") continue;
    const object = payload as Record<string, unknown>;
    const candidate = object.followupEventInput ?? object.event;
    if (typeof candidate === "string" && candidate.trim()) return { name: candidate.trim() };
    if (candidate && typeof candidate === "object") {
      const name = (candidate as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) return { name: name.trim() };
    }
  }
  return undefined;
}

export function isDefaultFallbackIntent(intentName: string | null | undefined) {
  return !intentName || intentName === (process.env.DIALOGFLOW_FALLBACK_INTENT || DEFAULT_FALLBACK_INTENT);
}

export function extractDialogflowContent(queryResult: protos.google.cloud.dialogflow.v2.IQueryResult) {
  const messages = queryResult.fulfillmentMessages ?? [];
  const textParts: string[] = [];
  const suggestions: string[] = [];
  const payloads: unknown[] = [];

  for (const item of messages) {
    for (const text of item.text?.text ?? []) if (text.trim()) textParts.push(text.trim());
    for (const reply of item.quickReplies?.quickReplies ?? []) if (reply.trim()) suggestions.push(reply.trim());
    if (item.payload) {
      const payload = protobufStructToJson(item.payload);
      payloads.push(payload);
      collectStrings(payload, new Set(["suggestions", "quickReplies", "chips"]), suggestions);
      if (!queryResult.fulfillmentText) collectStrings(payload, new Set(["message", "text", "speech"]), textParts);
    }
  }

  const message = queryResult.fulfillmentText?.trim() || textParts.join("\n").trim();
  return { message, suggestions: [...new Set(suggestions)], payloads };
}

function createSessionsClient(projectId: string) {
  const clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL?.trim();
  const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");
  const credentialState = {
    projectIdConfigured: Boolean(projectId),
    clientEmailConfigured: Boolean(clientEmail),
    clientEmailLength: clientEmail?.length ?? 0,
    privateKeyConfigured: Boolean(privateKey),
    privateKeyLength: privateKey?.length ?? 0,
    privateKeyHasPemHeader: privateKey?.includes("-----BEGIN PRIVATE KEY-----") ?? false,
  };
  console.info("[api/dialogflow] Credential configuration:", credentialState);

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Thiếu DIALOGFLOW_CLIENT_EMAIL hoặc DIALOGFLOW_PRIVATE_KEY trong .env.local. " +
      "Dialogflow sẽ không sử dụng Application Default Credentials.",
    );
  }
  if (!credentialState.privateKeyHasPemHeader) {
    throw new Error("DIALOGFLOW_PRIVATE_KEY không đúng định dạng PEM service-account private key.");
  }

  return new SessionsClient({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

async function generateGeminiFallback(message: string, metadata: unknown) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Bạn là Mít, trợ lý Chính tả tiếng Việt lớp 3. Chỉ trả lời bằng tiếng Việt, ngắn gọn, thân thiện, an toàn và gợi mở. Không tự chấm đúng sai và không tiết lộ đáp án quá sớm. Ngữ cảnh giao diện: ${JSON.stringify(metadata ?? {})}. Học sinh nói: ${message}`,
    config: { temperature: 0.3, maxOutputTokens: 700 },
  });
  if (!response.text?.trim()) throw new Error("Gemini không trả về nội dung.");
  return response.text.trim();
}

export async function resolveDetectedResponse(
  queryResult: protos.google.cloud.dialogflow.v2.IQueryResult,
  message: string,
  metadata: unknown,
  generateFallback: (message: string, metadata: unknown) => Promise<string> = generateGeminiFallback,
) {
  const detectedIntentName = queryResult.intent?.displayName;
  const intentName = detectedIntentName ?? "unknown";
  const content = extractDialogflowContent(queryResult);
  let responseMessage = content.message;
  let source = "dialogflow";
  let geminiError: string | undefined;

  if (isDefaultFallbackIntent(detectedIntentName)) {
    try {
      responseMessage = await generateFallback(message, metadata);
      source = "gemini";
    } catch (error) {
      geminiError = error instanceof Error ? error.message : "Gemini gặp lỗi không xác định.";
      responseMessage ||= "Mít chưa thể trả lời lúc này. Em thử diễn đạt câu hỏi theo cách khác nhé.";
      source = "dialogflow-fallback";
    }
  }

  responseMessage ||= "Mít đã nhận được yêu cầu nhưng Intent chưa có nội dung phản hồi.";
  return { ...content, message: responseMessage, source, geminiError, intentName, event: extractFollowupEvent(content.payloads) };
}

export async function POST(request: Request) {
  let body: DialogflowBody;
  try {
    body = await request.json() as DialogflowBody;
  } catch {
    return Response.json({ success: false, error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const event = typeof body.event === "string" ? body.event.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if ((!message && !event) || !sessionId) {
    return Response.json({ success: false, error: "message hoặc event và sessionId là bắt buộc." }, { status: 400 });
  }

  const projectId = process.env.DIALOGFLOW_PROJECT_ID;
  if (!projectId) {
    return Response.json({ success: false, error: "Dialogflow chưa được cấu hình trên máy chủ." }, { status: 503 });
  }

  const languageCode = typeof body.languageCode === "string" && body.languageCode.trim()
    ? body.languageCode.trim()
    : process.env.DIALOGFLOW_LANGUAGE_CODE || "vi";
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 36) || "spelling-student";
  let client: SessionsClient;
  try {
    client = createSessionsClient(projectId);
  } catch (error) {
    console.error("[api/dialogflow] Credential validation failed:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Cấu hình Dialogflow không hợp lệ.",
    }, { status: 503 });
  }

  try {
    const session = client.projectAgentSessionPath(projectId, safeSessionId);
    const queryInput = event
      ? { event: { name: event, languageCode } }
      : { text: { text: message, languageCode } };
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {};
    const [response] = await client.detectIntent({
      session,
      queryInput,
      queryParams: { payload: jsonToProtobufStruct(metadata) },
    });
    const queryResult = response.queryResult;
    if (!queryResult) throw new Error("Dialogflow không trả về queryResult.");

    const detectedIntentName = queryResult.intent?.displayName ?? "unknown";
    console.info("[api/dialogflow] DetectIntent result:", {
      intentDisplayName: detectedIntentName,
      fulfillmentTextLength: queryResult.fulfillmentText?.length ?? 0,
    });
    if (queryResult.intent?.displayName && !queryResult.fulfillmentText?.trim()) {
      console.warn("[api/dialogflow] Intent matched with empty fulfillmentText:", queryResult.intent.displayName);
    }

    const resolved = await resolveDetectedResponse(queryResult, message || event, body.metadata);
    console.info("[api/dialogflow] Response source:", resolved.source);
    return Response.json({
      success: true,
      message: resolved.message,
      suggestions: resolved.suggestions,
      payloads: resolved.payloads,
      event: resolved.event,
      source: resolved.source,
      geminiError: resolved.geminiError,
      sessionId: safeSessionId,
      queryResult: {
        queryText: queryResult.queryText,
        action: queryResult.action,
        intent: asJson(queryResult.intent),
        parameters: queryResult.parameters ? protobufStructToJson(queryResult.parameters) : undefined,
        outputContexts: asJson(queryResult.outputContexts),
        fulfillmentMessages: asJson(queryResult.fulfillmentMessages),
      },
    });
  } catch (error) {
    console.error("[api/dialogflow] DetectIntent failed:", error);
    return Response.json({
      success: false,
      error: "Mít chưa kết nối được với Dialogflow. Em vui lòng thử lại.",
    }, { status: 503 });
  } finally {
    await client.close().catch(() => undefined);
  }
}
