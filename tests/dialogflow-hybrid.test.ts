import assert from "node:assert/strict";
import { protos } from "@google-cloud/dialogflow";
import { extractDialogflowContent, resolveDetectedResponse } from "../app/api/dialogflow/route.ts";

const Struct = protos.google.protobuf.Struct;

function result(intentName: string, fulfillmentText: string, payload?: Record<string, unknown>) {
  return {
    intent: { displayName: intentName },
    fulfillmentText,
    fulfillmentMessages: payload ? [{ payload: Struct.fromObject({ fields: payload }) }] : [],
  };
}

const normal = await resolveDetectedResponse(result("W01_Theory", "Nội dung từ Dialogflow"), "học tuần 1", {}, async () => {
  throw new Error("Gemini must not run");
});
assert.equal(normal.source, "dialogflow");
assert.equal(normal.message, "Nội dung từ Dialogflow");

const newlyAdded = await resolveDetectedResponse(result("Intent added after deployment", "Intent mới hoạt động"), "mới", {}, async () => "unused");
assert.equal(newlyAdded.message, "Intent mới hoạt động");

const fallback = await resolveDetectedResponse(result("Default Fallback Intent", "Fallback Dialogflow"), "câu lạ", {}, async () => "Gemini fallback");
assert.equal(fallback.source, "gemini");
assert.equal(fallback.message, "Gemini fallback");

const missingIntent = await resolveDetectedResponse({ fulfillmentText: "" }, "không thuộc miền kiến thức", {}, async () => "Gemini for no match");
assert.equal(missingIntent.source, "gemini");
assert.equal(missingIntent.message, "Gemini for no match");

const geminiFailure = await resolveDetectedResponse(result("Default Fallback Intent", "Fallback an toàn"), "câu lạ", {}, async () => {
  throw new Error("Gemini unavailable");
});
assert.equal(geminiFailure.source, "dialogflow-fallback");
assert.equal(geminiFailure.message, "Fallback an toàn");
assert.equal(geminiFailure.geminiError, "Gemini unavailable");

const payload = Struct.fromObject({
  fields: {
    message: { stringValue: "Nội dung payload" },
    suggestions: { listValue: { values: [{ stringValue: "Học tiếp" }, { stringValue: "Luyện tập" }] } },
  },
});
const extracted = extractDialogflowContent({ fulfillmentMessages: [{ payload }] });
assert.equal(extracted.message, "Nội dung payload");
assert.deepEqual(extracted.suggestions, ["Học tiếp", "Luyện tập"]);

const eventPayload = Struct.fromObject({ fields: { event: { structValue: { fields: { name: { stringValue: "NEXT_LESSON" } } } } } });
const eventResult = await resolveDetectedResponse({ intent: { displayName: "Navigation" }, fulfillmentMessages: [{ payload: eventPayload }] }, "tiếp", {}, async () => "unused");
assert.deepEqual(eventResult.event, { name: "NEXT_LESSON" });

console.log("Dialogflow hybrid scenarios: PASS");
