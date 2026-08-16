import "server-only";

import { SessionsClient, protos } from "@google-cloud/dialogflow";

export const DIALOGFLOW_ERROR_CODES = {
  notConfigured: "DIALOGFLOW_NOT_CONFIGURED",
  authFailed: "DIALOGFLOW_AUTH_FAILED",
  requestFailed: "DIALOGFLOW_REQUEST_FAILED",
} as const;

export type DialogflowErrorCode = typeof DIALOGFLOW_ERROR_CODES[keyof typeof DIALOGFLOW_ERROR_CODES];
export type DialogflowDiagnostic = "MALFORMED_CREDENTIALS" | "UNAUTHENTICATED" | "PERMISSION_DENIED";

export class DialogflowServiceError extends Error {
  readonly code: DialogflowErrorCode;
  readonly diagnostic?: DialogflowDiagnostic;

  constructor(code: DialogflowErrorCode, message: string, diagnostic?: DialogflowDiagnostic) {
    super(message);
    this.code = code;
    this.diagnostic = diagnostic;
    this.name = "DialogflowServiceError";
  }
}

export type DialogflowEnvironment = {
  [key: string]: string | undefined;
  DIALOGFLOW_PROJECT_ID?: string;
  GOOGLE_CLIENT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
};

export type DialogflowConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedClient: SessionsClient | undefined;

function withoutWrappingQuotes(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  return trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.at(-1) === first
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function normalizePrivateKey(value: string) {
  return withoutWrappingQuotes(value)
    .replace(/\\+r\\+n/g, "\n")
    .replace(/\\+n/g, "\n")
    .replace(/\\+r/g, "\r")
    .trim();
}

export function hasDialogflowEnvironment(env: DialogflowEnvironment = process.env) {
  return Boolean(
    env.DIALOGFLOW_PROJECT_ID?.trim()
    && env.GOOGLE_CLIENT_EMAIL?.trim()
    && env.GOOGLE_PRIVATE_KEY?.trim(),
  );
}

export function getDialogflowConfig(env: DialogflowEnvironment = process.env): DialogflowConfig {
  const projectId = env.DIALOGFLOW_PROJECT_ID ? withoutWrappingQuotes(env.DIALOGFLOW_PROJECT_ID) : "";
  const clientEmail = env.GOOGLE_CLIENT_EMAIL ? withoutWrappingQuotes(env.GOOGLE_CLIENT_EMAIL) : "";
  const privateKey = env.GOOGLE_PRIVATE_KEY ? normalizePrivateKey(env.GOOGLE_PRIVATE_KEY) : "";

  if (!projectId || !clientEmail || !privateKey) {
    throw new DialogflowServiceError(
      DIALOGFLOW_ERROR_CODES.notConfigured,
      "Thiếu cấu hình Dialogflow trên máy chủ.",
    );
  }
  if (
    !clientEmail.includes("@")
    || !privateKey.includes("-----BEGIN PRIVATE KEY-----")
    || !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new DialogflowServiceError(
      DIALOGFLOW_ERROR_CODES.authFailed,
      "Thông tin xác thực Dialogflow không hợp lệ.",
      "MALFORMED_CREDENTIALS",
    );
  }
  return { projectId, clientEmail, privateKey };
}

export function getDialogflowClient(): SessionsClient {
  if (cachedClient) return cachedClient;
  const config = getDialogflowConfig();
  cachedClient = new SessionsClient({
    projectId: config.projectId,
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
  });
  return cachedClient;
}

function authenticationDiagnostic(reason: unknown): DialogflowDiagnostic | undefined {
  if (!reason || typeof reason !== "object") return undefined;
  const error = reason as { code?: unknown; message?: unknown };
  if (error.code === 7 || error.code === "PERMISSION_DENIED") return "PERMISSION_DENIED";
  if (error.code === 16 || error.code === "UNAUTHENTICATED") return "UNAUTHENTICATED";
  if (typeof error.message !== "string") return undefined;
  if (/permission denied/i.test(error.message)) return "PERMISSION_DENIED";
  if (/auth|credential|invalid[_ ]grant|private key/i.test(error.message)) return "UNAUTHENTICATED";
  return undefined;
}

export async function executeDetectIntent(
  operation: () => Promise<protos.google.cloud.dialogflow.v2.IQueryResult | null | undefined>,
) {
  try {
    const queryResult = await operation();
    if (!queryResult) {
      throw new DialogflowServiceError(
        DIALOGFLOW_ERROR_CODES.requestFailed,
        "Dialogflow không trả về kết quả.",
      );
    }
    return queryResult;
  } catch (reason) {
    if (reason instanceof DialogflowServiceError) throw reason;
    const diagnostic = authenticationDiagnostic(reason);
    if (diagnostic) {
      throw new DialogflowServiceError(
        DIALOGFLOW_ERROR_CODES.authFailed,
        "Không xác thực được với Dialogflow.",
        diagnostic,
      );
    }
    throw new DialogflowServiceError(
      DIALOGFLOW_ERROR_CODES.requestFailed,
      "Không gửi được yêu cầu tới Dialogflow.",
    );
  }
}

export function dialogflowPublicMessage(code: DialogflowErrorCode) {
  if (code === DIALOGFLOW_ERROR_CODES.notConfigured) return "Mít chưa được kết nối với lớp học. Thầy cô vui lòng kiểm tra cấu hình máy chủ.";
  if (code === DIALOGFLOW_ERROR_CODES.authFailed) return "Mít chưa xác thực được với lớp học. Em vui lòng thử lại sau.";
  return "Mít chưa kết nối được với Dialogflow. Em vui lòng thử lại.";
}

export function normalizeDialogflowError(reason: unknown) {
  return reason instanceof DialogflowServiceError
    ? reason
    : new DialogflowServiceError(DIALOGFLOW_ERROR_CODES.requestFailed, "Không gửi được yêu cầu tới Dialogflow.");
}
