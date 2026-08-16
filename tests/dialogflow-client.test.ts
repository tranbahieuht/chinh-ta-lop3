import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIALOGFLOW_ERROR_CODES,
  DialogflowServiceError,
  dialogflowPublicMessage,
  executeDetectIntent,
  getDialogflowConfig,
  hasDialogflowEnvironment,
} from "../lib/dialogflow/client.ts";
import { POST as dialogflowPost } from "../app/api/dialogflow/route.ts";
import { POST as chatPost } from "../app/api/chat/route.ts";

const validEnv = {
  DIALOGFLOW_PROJECT_ID: "chinh-ta-agent-project",
  GOOGLE_CLIENT_EMAIL: "dialogflow-web@example.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nTEST_KEY\\n-----END PRIVATE KEY-----\\n",
};

test("missing environment returns DIALOGFLOW_NOT_CONFIGURED", () => {
  assert.equal(hasDialogflowEnvironment({}), false);
  assert.throws(() => getDialogflowConfig({}), (reason) => reason instanceof DialogflowServiceError && reason.code === DIALOGFLOW_ERROR_CODES.notConfigured);
});

test("malformed private key returns DIALOGFLOW_AUTH_FAILED", () => {
  assert.throws(() => getDialogflowConfig({ ...validEnv, GOOGLE_PRIVATE_KEY: "not-a-pem" }), (reason) => reason instanceof DialogflowServiceError && reason.code === DIALOGFLOW_ERROR_CODES.authFailed);
});

test("valid config reads exact production variables and restores escaped newlines", () => {
  const config = getDialogflowConfig(validEnv);
  assert.equal(config.projectId, "chinh-ta-agent-project");
  assert.equal(config.clientEmail, "dialogflow-web@example.iam.gserviceaccount.com");
  assert.match(config.privateKey, /BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY/);
  assert.equal(hasDialogflowEnvironment(validEnv), true);
});

test("detectIntent success returns queryResult", async () => {
  const expected = { fulfillmentText: "Chào em!" };
  assert.equal(await executeDetectIntent(async () => expected), expected);
});

test("authentication failure is classified without exposing credentials", async () => {
  await assert.rejects(
    executeDetectIntent(async () => { throw Object.assign(new Error("invalid credential"), { code: 16 }); }),
    (reason) => reason instanceof DialogflowServiceError && reason.code === DIALOGFLOW_ERROR_CODES.authFailed && !reason.message.includes("TEST_KEY"),
  );
});

test("ordinary detectIntent failure returns DIALOGFLOW_REQUEST_FAILED", async () => {
  await assert.rejects(
    executeDetectIntent(async () => { throw Object.assign(new Error("upstream unavailable"), { code: 14 }); }),
    (reason) => reason instanceof DialogflowServiceError && reason.code === DIALOGFLOW_ERROR_CODES.requestFailed,
  );
});

test("Dialogflow route returns stable missing-config error contract", async () => {
  const saved = {
    projectId: process.env.DIALOGFLOW_PROJECT_ID,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  };
  delete process.env.DIALOGFLOW_PROJECT_ID;
  delete process.env.GOOGLE_CLIENT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;
  try {
    const response = await dialogflowPost(new Request("http://localhost/api/dialogflow", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "test-session", message: "học tuần 1" }),
    }));
    const body = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 503);
    assert.equal(body.error, DIALOGFLOW_ERROR_CODES.notConfigured);
    assert.equal(body.message, dialogflowPublicMessage(DIALOGFLOW_ERROR_CODES.notConfigured));
  } finally {
    if (saved.projectId === undefined) delete process.env.DIALOGFLOW_PROJECT_ID; else process.env.DIALOGFLOW_PROJECT_ID = saved.projectId;
    if (saved.clientEmail === undefined) delete process.env.GOOGLE_CLIENT_EMAIL; else process.env.GOOGLE_CLIENT_EMAIL = saved.clientEmail;
    if (saved.privateKey === undefined) delete process.env.GOOGLE_PRIVATE_KEY; else process.env.GOOGLE_PRIVATE_KEY = saved.privateKey;
  }
});

test("configuration errors have a student-friendly message", () => {
  const message = dialogflowPublicMessage(DIALOGFLOW_ERROR_CODES.notConfigured);
  assert.match(message, /Mít/);
  assert.doesNotMatch(message, /GOOGLE_PRIVATE_KEY|credential|stack/i);
});

test("/api/chat preserves the stable code and friendly message", async () => {
  const saved = process.env.DIALOGFLOW_PROJECT_ID;
  delete process.env.DIALOGFLOW_PROJECT_ID;
  try {
    const response = await chatPost(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: "student-1", sessionId: "session-1", week: 1, message: "bắt đầu" }),
    }));
    const body = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 503);
    assert.equal(body.error, DIALOGFLOW_ERROR_CODES.notConfigured);
    assert.equal(body.message, dialogflowPublicMessage(DIALOGFLOW_ERROR_CODES.notConfigured));
  } finally {
    if (saved === undefined) delete process.env.DIALOGFLOW_PROJECT_ID; else process.env.DIALOGFLOW_PROJECT_ID = saved;
  }
});
