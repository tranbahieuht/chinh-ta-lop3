"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ChatMessage, Topic } from "@/types/lesson";

const uid = () => `${Date.now()}-${Math.random()}`;
const DIALOGFLOW_SESSION_KEY = "fraction-tutor-dialogflow-session";
const TOPIC_LOADING_MESSAGE_ID = "topic-loading";
const topicStartRequests = new Map<string, Promise<DialogflowReply>>();
const topicStartEvents: Record<string, string> = {
  "khai-niem": "START_KHAI_NIEM",
  "bang-nhau": "START_BANG_NHAU",
  "rut-gon": "START_RUT_GON",
  "quy-dong": "START_QUY_DONG",
  "so-sanh": "START_SO_SANH",
  "cong": "START_CONG",
  "tru": "START_TRU",
  "nhan": "START_NHAN",
  "chia": "START_CHIA",
  "hon-so": "START_HON_SO",
};

type DialogflowReply = {
  success: boolean;
  message?: string;
  suggestions?: string[];
  payloads?: unknown[];
  event?: { name: string };
  error?: string;
};

function getDialogflowSessionId(topicSlug: string) {
  const key = `${DIALOGFLOW_SESSION_KEY}-${topicSlug}`;
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;

  const sessionId = window.crypto.randomUUID();
  window.localStorage.setItem(key, sessionId);
  return sessionId;
}

function resetDialogflowSession(topicSlug: string) {
  const key = `${DIALOGFLOW_SESSION_KEY}-${topicSlug}`;
  const sessionId = window.crypto.randomUUID();
  window.localStorage.setItem(key, sessionId);
  return sessionId;
}

async function detectIntent(
  message: string,
  metadata: Record<string, unknown>,
  event?: string,
  allowFollowup = true,
  topicSlug = "default",
): Promise<DialogflowReply> {
  try {
    const response = await fetch("/api/dialogflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, event, sessionId: getDialogflowSessionId(topicSlug), metadata }),
    });
    const result = await response.json() as DialogflowReply;
    if (!response.ok) return { success: false, error: result.error || "Dialogflow tạm thời không phản hồi." };
    if (allowFollowup && result.success && result.event?.name) {
      return detectIntent(message, metadata, result.event.name, false, topicSlug);
    }
    return result;
  } catch {
    return { success: false, error: "Mít đang mất kết nối. Em vui lòng thử lại." };
  }
}

function startTopic(topicSlug: string, topicTitle: string) {
  const sessionId = getDialogflowSessionId(topicSlug);
  const requestKey = `${topicSlug}:${sessionId}`;
  const existing = topicStartRequests.get(requestKey);
  if (existing) return existing;

  const startEvent = topicStartEvents[topicSlug];
  const startMessage = `Bắt đầu ${topicTitle}`;
  const request = detectIntent(
    startMessage,
    { topic: topicSlug, startEvent, startMessage },
    startEvent,
    true,
    topicSlug,
  );

  topicStartRequests.set(requestKey, request);
  void request.finally(() => {
    if (topicStartRequests.get(requestKey) === request) topicStartRequests.delete(requestKey);
  });
  return request;
}

function findPhaseLabel(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const label = findPhaseLabel(item);
      if (label) return label;
    }
    return undefined;
  }

  const object = value as Record<string, unknown>;
  for (const key of ["phaseLabel", "phase_label", "learningPhase", "learning_phase", "phase"]) {
    const candidate = object[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  for (const child of Object.values(object)) {
    const label = findPhaseLabel(child);
    if (label) return label;
  }
  return undefined;
}

function normalizeMathExpression(expression: string) {
  return expression.replace(/(?<!\\)\bfrac(?=\s*\{)/g, "\\frac");
}

function normalizeMathMarkdown(content: string) {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$${normalizeMathExpression(expression)}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${normalizeMathExpression(expression)}$`)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, expression: string) => `$$${normalizeMathExpression(expression)}$$`)
    .replace(/\$(?!\$)([^$\n]+?)\$/g, (_match, expression: string) => `$${normalizeMathExpression(expression)}$`);
}

function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <p>{children}</p>,
        ul: ({ children }) => <ul>{children}</ul>,
        ol: ({ children }) => <ol>{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
      }}
    >
      {normalizeMathMarkdown(content)}
    </ReactMarkdown>
  );
}

export function ChatRoom({ topic }: { topic: Topic }) {
  const [phaseLabel, setPhaseLabel] = useState("Đang học");
  const [dialogflowSuggestions, setDialogflowSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: TOPIC_LOADING_MESSAGE_ID, role: "assistant", content: "Mít đang mở bài học..." },
  ]);
  const [input, setInput] = useState("");
  const [isWaiting, setIsWaiting] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTopicRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const addAssistant = useCallback((content: string) => {
    setMessages((items) => [...items, { id: uid(), role: "assistant", content }]);
  }, []);

  function addStudent(content: string) {
    setMessages((items) => [...items, { id: uid(), role: "student", content }]);
  }

  const applyDialogflowReply = useCallback((reply: DialogflowReply, replaceMessageId?: string) => {
    setDialogflowSuggestions(reply.suggestions ?? []);
    setPhaseLabel(findPhaseLabel(reply.payloads) ?? "Đang học");
    const content = reply.success && reply.message
      ? reply.message
      : reply.error || "Mít chưa thể trả lời lúc này. Em thử lại nhé.";
    if (replaceMessageId) {
      setMessages((items) => items.map((item) => item.id === replaceMessageId ? { ...item, content } : item));
    } else {
      addAssistant(content);
    }
  }, [addAssistant]);

  useEffect(() => {
    let active = true;

    if (activeTopicRef.current !== topic.slug) {
      activeTopicRef.current = topic.slug;
      resetDialogflowSession(topic.slug);
    }

    const requestId = ++requestIdRef.current;

    void startTopic(topic.slug, topic.title).then((reply) => {
      if (!active || requestIdRef.current !== requestId) return;
      applyDialogflowReply(reply, TOPIC_LOADING_MESSAGE_ID);
      setIsWaiting(false);
    });
    return () => { active = false; };
  }, [applyDialogflowReply, topic.slug, topic.title]);

  useEffect(() => {
    window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 40);
  }, [messages]);

  async function answer(content: string) {
    const clean = content.trim();
    if (!clean || isWaiting) return;
    addStudent(clean);
    setInput("");
    setDialogflowSuggestions([]);
    setIsWaiting(true);
    const requestId = requestIdRef.current;
    const reply = await detectIntent(clean, { topic: topic.slug }, undefined, true, topic.slug);
    if (requestIdRef.current !== requestId) return;
    applyDialogflowReply(reply);
    setIsWaiting(false);
  }

  async function requestHint() {
    if (isWaiting) return;

    addStudent("Cho em gợi ý");
    setDialogflowSuggestions([]);
    setIsWaiting(true);
    const requestId = requestIdRef.current;

    const reply = await detectIntent(
      "Cho em gợi ý",
      {
        topic: topic.slug,
        action: "hint",
        hintEvent: "REQUEST_HINT",
      },
      "REQUEST_HINT",
      true,
      topic.slug,
    );

    if (requestIdRef.current !== requestId) return;

    applyDialogflowReply(reply);
    setIsWaiting(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void answer(input);
  }

  return (
    <main className="learn-shell">
      <aside className="lesson-sidebar">
        <Link href="/topics" className="back-link">← Tất cả chủ đề</Link>
        <div className={`lesson-symbol ${topic.color}`}>{topic.icon}</div>
        <span className="tiny-label">{phaseLabel}</span>
        <h1>{topic.title}</h1><p>{topic.description}</p>
        <div className="progress-block"><div><span>Tiến trình</span><b>{phaseLabel}</b></div><div className="progress-track"><i style={{ width: "50%" }}/></div></div>
        <div className="support-card"><span className="support-icon">✦</span><div><small>Trạng thái hội thoại</small><b>{phaseLabel}</b><p>Dialogflow đang điều khiển bài học.</p></div></div>
      </aside>
      <section className="chat-panel">
        <header className="chat-header"><div className="mini-mascot">M</div><div><b>Mít · Trợ lý học tập</b><span><i/> {phaseLabel}</span></div><span className="question-chip">{phaseLabel}</span></header>
        <div className="messages" ref={scrollRef} aria-live="polite">
          <div className="date-divider"><span>Buổi học hôm nay</span></div>
          {messages.map((message) => <div key={message.id} className={`message-row ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? "M" : "Em"}</div><div className="message-bubble"><MessageContent content={message.content} /></div></div>)}
          {dialogflowSuggestions.length > 0 && <div className="quick-replies">{dialogflowSuggestions.map((choice) => <button key={choice} onClick={() => void answer(choice)} disabled={isWaiting}>{choice}</button>)}</div>}
        </div>
        <div className="quick-replies answer-hint">
          <button type="button" onClick={() => void requestHint()} disabled={isWaiting}>💡 Gợi ý trả lời</button>
        </div>
        <form className="chat-input" onSubmit={submit}><label className="sr-only" htmlFor="message">Nhập câu trả lời</label><input id="message" value={input} onChange={(event) => setInput(event.target.value)} placeholder={isWaiting ? "Mít đang trả lời..." : "Nhập câu trả lời của em..."} autoComplete="off" disabled={isWaiting}/><button disabled={isWaiting || !input.trim()} aria-label="Gửi câu trả lời">↑</button></form>
        <p className="input-note">Luồng hội thoại được điều khiển bởi Dialogflow.</p>
      </section>
    </main>
  );
}
