import type { DialogflowContext } from "./webhook.ts";

export type DialogflowResponseInput = {
  text: string;
  payload?: Record<string, unknown>;
  existingContexts?: DialogflowContext[];
  contextUpdates?: DialogflowContext[];
};

function contextKey(context: DialogflowContext): string {
  return typeof context.name === "string" ? context.name.toLocaleLowerCase("en") : "";
}

export function mergeDialogflowContexts(existing: DialogflowContext[] = [], updates: DialogflowContext[] = []) {
  const merged = new Map<string, DialogflowContext>();
  for (const context of existing) {
    const key = contextKey(context);
    if (key) merged.set(key, { ...context, parameters: { ...(context.parameters ?? {}) } });
  }
  for (const update of updates) {
    const key = contextKey(update);
    if (!key) continue;
    const previous = merged.get(key);
    merged.set(key, {
      ...(previous ?? {}),
      ...update,
      parameters: { ...(previous?.parameters ?? {}), ...(update.parameters ?? {}) },
    });
  }
  return [...merged.values()];
}

export function buildDialogflowResponse(input: DialogflowResponseInput) {
  const text = input.text.trim() || "Mít đã nhận được yêu cầu. Em thử lại sau nhé.";
  const payload = input.payload ?? {};
  const outputContexts = mergeDialogflowContexts(input.existingContexts, input.contextUpdates);
  return {
    fulfillmentText: text,
    fulfillmentMessages: [
      { text: { text: [text] } },
      { payload },
    ],
    payload,
    ...(outputContexts.length ? { outputContexts } : {}),
  };
}

export function backendStateContext(sessionPath: string, parameters: Record<string, unknown>): DialogflowContext {
  return {
    name: `${sessionPath}/contexts/backend_state`,
    lifespanCount: 2,
    parameters,
  };
}

