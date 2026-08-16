"use client";

import { useMemo, useRef, useState } from "react";
import { useStudent } from "@/components/student-provider";
import type { ChatReply } from "@/types/spelling";

type Message = { role: "bot" | "student"; text: string };
const starters = ["Giải thích quy tắc c và k", "Cho em ví dụ s và x", "Em muốn luyện viết hoa", "Em hay nhầm hỏi và ngã"];

export function AssistantRoom() {
  const { identity, progress, applyGamePayload, refreshProgress } = useStudent();
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: "Chào em! Mít có thể giải thích quy tắc, cho ví dụ hoặc giúp em ôn một chỗ còn nhầm. Em muốn hỏi gì?" }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sessionId = useMemo(() => typeof window === "undefined" ? "assistant" : window.crypto.randomUUID(), []);
  const end = useRef<HTMLDivElement>(null);

  async function ask(text: string) {
    if (!identity || !text.trim() || sending) return;
    setMessages((rows) => [...rows, { role: "student", text: text.trim() }]); setInput(""); setSending(true); setError("");
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: identity.studentCode, sessionId, message: text.trim(), week: progress?.currentWeek ?? 1, displayName: identity.displayName, className: identity.className, metadata: { mode: "assistant" } }) });
      const reply = await response.json() as ChatReply;
      if (!response.ok || !reply.success) throw new Error(reply.error || "Mít chưa trả lời được.");
      setMessages((rows) => [...rows, { role: "bot", text: reply.message || "Em thử hỏi theo cách khác nhé." }]);
      if (reply.game) { applyGamePayload(reply.game); await refreshProgress(); }
      window.setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa gửi được câu hỏi."); }
    finally { setSending(false); }
  }
  return <main className="page-shell assistant-page">
    <header className="page-heading"><div><p className="eyebrow">Trợ lý Chính tả AI</p><h1>Hỏi Mít khi em cần</h1><p>Trợ lý AI giúp giải thích và luyện tập. Điểm và tiến độ do hệ thống học tập ghi nhận.</p></div><span className="heading-sticker">✍️</span></header>
    <section className="assistant-card">
      <aside><h2>Gợi ý câu hỏi</h2><p>Chọn nhanh hoặc tự nhập điều em muốn biết.</p>{starters.map((text) => <button key={text} onClick={() => void ask(text)}>{text}<span>→</span></button>)}<div className="assistant-note"><b>Nhớ nhé</b><p>Mít giúp em hiểu cách làm. Em vẫn là người tự chọn đáp án.</p></div></aside>
      <div className="assistant-chat"><div className="chat-stream">{messages.map((message, index) => <div key={index} className={`bubble-row ${message.role}`}>{message.role === "bot" && <span className="avatar">✍️</span>}<div className="chat-bubble">{message.text}</div></div>)}{sending && <div className="bubble-row bot"><span className="avatar">✍️</span><div className="chat-bubble typing"><i/><i/><i/></div></div>}<div ref={end}/></div>{error && <p className="inline-error">{error}</p>}<form className="answer-form" onSubmit={(event) => { event.preventDefault(); void ask(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Hỏi về một quy tắc chính tả..." maxLength={300}/><button className="send-button" disabled={!input.trim() || sending}>➤</button></form></div>
    </section>
  </main>;
}
