"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MasteryBar, XPBar } from "@/components/learning-ui";
import { useStudent } from "@/components/student-provider";
import { extractChoices } from "@/lib/chat-ui";
import type { ChatReply, GamePayload, SpellingWeek } from "@/types/spelling";

type ChatMessage = { id: string; role: "bot" | "student"; text: string };

function gameToast(game?: GamePayload) {
  if (!game) return "";
  if (game.newBadges?.length) return `🏅 Huy hiệu mới: ${game.newBadges.join(", ")}`;
  if (game.xpEarned) return `+${game.xpEarned} XP · Tiến bộ rồi!`;
  if (game.mastery) return `Độ thành thạo: ${game.mastery}%`;
  return "";
}

export function SpellingChat({ week }: { week: SpellingWeek }) {
  const { identity, progress, loading, applyGamePayload, refreshProgress } = useStudent();
  const row = progress?.weekProgress.find((item) => item.week === week.week);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return `week-${week.week}`;
    const key = `spelling_dialogflow_session_${week.week}`;
    const saved = window.sessionStorage.getItem(key) || window.crypto.randomUUID();
    window.sessionStorage.setItem(key, saved);
    return saved;
  }, [week.week]);

  async function send(text: string, showStudent = true) {
    if (!identity || !text.trim() || sending) return;
    const clean = text.trim();
    if (showStudent) setMessages((current) => [...current, { id: crypto.randomUUID(), role: "student", text: clean }]);
    setSending(true);
    setError("");
    setSuggestions([]);
    try {
      if (process.env.NODE_ENV !== "production") {
        const code = identity.studentCode;
        console.info("[chinh-ta/identity]", { frontendStudentId: code.length > 10 ? `${code.slice(0, 4)}…${code.slice(-4)}` : code });
      }
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: identity.studentCode, sessionId, message: clean, week: week.week, displayName: identity.displayName, className: identity.className }),
      });
      const reply = await response.json() as ChatReply;
      if (!response.ok || !reply.success) throw new Error(reply.message || "Mít chưa nghe rõ. Em thử lại nhé!");
      const message = reply.message?.trim() || "Mình tiếp tục nhé!";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "bot", text: message }]);
      setSuggestions(reply.quickReplies || reply.suggestions || []);
      if (reply.game) {
        if (reply.game.studentCode && reply.game.studentCode !== identity.studentCode) {
          throw new Error("Phiên học không khớp hồ sơ tiến độ. Em tải lại trang rồi thử lại nhé.");
        }
        applyGamePayload(reply.game);
        const notice = gameToast(reply.game);
        if (notice) { setToast(notice); window.setTimeout(() => setToast(""), 2800); }
        await refreshProgress();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa gửi được câu trả lời.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (identity && !started.current) {
      started.current = true;
      void send(`học tuần ${week.week}`, false);
    }
    // The opening request intentionally runs once per mounted lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, week.week]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const lastBot = [...messages].reverse().find((message) => message.role === "bot");
  const choices = lastBot ? extractChoices(lastBot.text) : [];
  const mastery = row?.mastery_score ?? progress?.mastery[week.topic] ?? 0;

  return (
    <main className="learn-shell">
      <header className="learn-header">
        <Link href="/journey" className="icon-button" aria-label="Quay lại hành trình">←</Link>
        <div><span>Tuần {week.week}</span><b>{week.title}</b></div>
        <Link href="/" className="icon-button" aria-label="Về trang chủ">⌂</Link>
      </header>
      <div className="learn-grid">
        <aside className="learn-side lesson-brief">
          <p className="eyebrow">Nhiệm vụ tuần</p>
          <h2>{week.topic}</h2>
          <div className={`week-symbol ${week.type}`}>{week.type === "boss" ? "👑" : week.type === "checkpoint" ? "🚩" : "✍️"}</div>
          <p>Đọc kĩ, trả lời từng câu và dùng gợi ý khi cần. Sai cũng là một bước để học tốt hơn.</p>
        </aside>
        <section className="chat-panel" aria-label="Phòng học chính tả">
          <div className="chat-stream" aria-live="polite">
            {!messages.length && <div className="chat-opening"><span className="mascot-orb">✍️</span><p>Mít đang mở bài học...</p></div>}
            {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
            {sending && <div className="bubble-row bot"><span className="avatar">✍️</span><div className="chat-bubble typing"><i/><i/><i/></div></div>}
            <div ref={endRef}/>
          </div>
          <div className="answer-dock">
            {error && <div className="inline-error" role="alert">{error} <button onClick={() => lastBot && void send("thử lại")}>Thử lại</button></div>}
            {choices.length > 0 && <div className="choice-grid" aria-label="Các phương án trả lời">{choices.map((choice) => <button key={choice.key} disabled={sending} onClick={() => void send(choice.key)}><b>{choice.key}</b><span>{choice.label}</span></button>)}</div>}
            {suggestions.length > 0 && <div className="quick-replies">{suggestions.slice(0, 5).map((suggestion) => <button key={suggestion} disabled={sending} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>}
            <form className="answer-form" onSubmit={(event) => { event.preventDefault(); const value = input; setInput(""); void send(value); }}>
              <input value={input} disabled={sending || loading || !identity} onChange={(event) => setInput(event.target.value)} placeholder="Nhập câu trả lời..." aria-label="Câu trả lời" maxLength={300}/>
              <button className="send-button" disabled={!input.trim() || sending} aria-label="Gửi câu trả lời">➤</button>
            </form>
            <div className="lesson-actions"><button onClick={() => void send("gợi ý")}>💡 Gợi ý</button><button onClick={() => void send("thử lại")}>↻ Thử lại</button><button onClick={() => void send("tiếp tục")}>→ Tiếp tục</button><Link href="/journey">☰ Menu</Link></div>
          </div>
        </section>
        <aside className="learn-side live-progress">
          <p className="eyebrow">Tiến độ thật</p>
          <XPBar totalXP={progress?.totalXP ?? 0} level={progress?.level ?? 1}/>
          <MasteryBar value={mastery} label="Thành thạo tuần"/>
          <dl className="mini-stats"><div><dt>Đúng</dt><dd>{row?.correct_count ?? 0}</dd></div><div><dt>Gợi ý</dt><dd>{row?.hints_used ?? 0}</dd></div><div><dt>Điểm</dt><dd>{row?.score ?? 0}</dd></div></dl>
          <p className="privacy-note">XP tổng được lưu an toàn qua webhook và cơ sở dữ liệu.</p>
        </aside>
      </div>
      {toast && <div className="game-toast" role="status">{toast}</div>}
    </main>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  return <div className={`bubble-row ${message.role}`}>
    {message.role === "bot" && <span className="avatar" aria-hidden>✍️</span>}
    <div className="chat-bubble">{message.text.split(/\r?\n/).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
  </div>;
}
