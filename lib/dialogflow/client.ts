import "server-only";

import { SessionsClient, protos } from "@google-cloud/dialogflow";

export const DIALOGFLOW_ERROR_CODES = {
  notConfigured: "DIALOGFLOW_NOT_CONFIGURED",
  authFailed: "DIALOGFLOW_AUTH_FAILED",
  requestFailed: "DIALOGFLOW_REQUEST_FAILED",
} as const;

export type DialogflowErrorCode = typeof DIALOGFLOW_ERROR_CODES[keyof typeof DIALOGFLOW_ERROR_CODES];

export class DialogflowServiceError extends Error {
  readonly code: DialogflowErrorCode;

  constructor(code: DialogflowErrorCode, message: string) {
    super(message);
    this.code = code;
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

export function hasDialogflowEnvironment(env: DialogflowEnvironment = process.env) {
  return Boolean(
    env.DIALOGFLOW_PROJECT_ID?.trim()
    && env.GOOGLE_CLIENT_EMAIL?.trim()
    && env.GOOGLE_PRIVATE_KEY?.trim(),
  );
}

export function getDialogflowConfig(env: DialogflowEnvironment = process.env): DialogflowConfig {
  const projectId = env.DIALOGFLOW_PROJECT_ID?.trim();
  const clientEmail = env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = env.GOOGLE_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");

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

function isAuthenticationError(reason: unknown) {
  if (!reason || typeof reason !== "object") return false;
  const error = reason as { code?: unknown; message?: unknown };
  if (error.code === 7 || error.code === 16 || error.code === "PERMISSION_DENIED" || error.code === "UNAUTHENTICATED") return true;
  return typeof error.message === "string" && /auth|credential|invalid[_ ]grant|permission denied|private key/i.test(error.message);
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
    if (isAuthenticationError(reason)) {
      throw new DialogflowServiceError(
        DIALOGFLOW_ERROR_CODES.authFailed,
        "Không xác thực được với Dialogflow.",
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
