"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeGameProgress } from "@/lib/frontend-game";
import { ensureGuestCode, readGuestIdentity, STUDENT_PROFILE_KEY } from "@/lib/guest-identity";
import type { GamePayload, StudentIdentity, StudentProgress } from "@/types/spelling";

type StudentContextValue = {
  identity: StudentIdentity | null;
  progress: StudentProgress | null;
  loading: boolean;
  error: string;
  needsOnboarding: boolean;
  refreshProgress: () => Promise<void>;
  applyGamePayload: (game: GamePayload) => void;
  openOnboarding: () => void;
};

const StudentContext = createContext<StudentContextValue | null>(null);

function storedIdentity(): StudentIdentity | null {
  return readGuestIdentity(window.localStorage, () => window.crypto.randomUUID());
}

async function loadProgress(studentCode: string): Promise<StudentProgress | null> {
  const response = await fetch(`/api/students/${encodeURIComponent(studentCode)}/progress`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Chưa tải được tiến độ.");
  return response.json() as Promise<StudentProgress>;
}

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<StudentIdentity | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refreshProgress = useCallback(async () => {
    const current = storedIdentity();
    setIdentity(current);
    if (!current) {
      setProgress(null);
      setOnboardingOpen(true);
      setLoading(false);
      return;
    }
    setError("");
    try {
      setProgress(await loadProgress(current.studentCode));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa tải được tiến độ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refreshProgress); }, [refreshProgress]);

  function applyGamePayload(game: GamePayload) {
    setProgress((current) => current ? mergeGameProgress(current, game) : current);
  }

  async function completeOnboarding(displayName: string, className: string) {
    const studentCode = ensureGuestCode(window.localStorage, () => window.crypto.randomUUID());
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentCode, displayName, className }),
    });
    const result = await response.json() as { success?: boolean; error?: string };
    if (!response.ok || !result.success) throw new Error(result.error || "Chưa tạo được hồ sơ.");
    const next = { studentCode, displayName, className };
    window.localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(next));
    setIdentity(next);
    setOnboardingOpen(false);
    setLoading(true);
    await refreshProgress();
  }

  const value = useMemo<StudentContextValue>(() => ({
    identity,
    progress,
    loading,
    error,
    needsOnboarding: onboardingOpen || !identity,
    refreshProgress,
    applyGamePayload,
    openOnboarding: () => setOnboardingOpen(true),
  }), [identity, progress, loading, error, onboardingOpen, refreshProgress]);

  return (
    <StudentContext.Provider value={value}>
      {children}
      {(onboardingOpen || (!loading && !identity)) && <Onboarding onComplete={completeOnboarding} />}
    </StudentContext.Provider>
  );
}

function Onboarding({ onComplete }: { onComplete: (displayName: string, className: string) => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [className, setClassName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setSubmitting(true);
    setError("");
    try {
      await onComplete(displayName.trim(), className.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa tạo được hồ sơ.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="step-dots" aria-label={`Bước ${step} trên 3`}><i className="active"/><i className={step >= 2 ? "active" : ""}/><i className={step >= 3 ? "active" : ""}/></div>
        <small className="onboarding-brand">Hành trình Chính tả lớp 3 · 35 tuần chinh phục tiếng Việt</small>
        {step === 1 && <>
          <span className="mascot-orb" aria-hidden>✍️</span>
          <p className="eyebrow">Bước 1 · Làm quen</p>
          <h1 id="onboarding-title">Mít gọi em là gì?</h1>
          <p>Chỉ cần tên hiển thị. Em không cần nhập email hay số điện thoại.</p>
          <label className="field-label" htmlFor="display-name">Tên hiển thị</label>
          <input id="display-name" className="text-field" value={displayName} maxLength={80} autoFocus onChange={(event) => setDisplayName(event.target.value)} placeholder="Ví dụ: Minh Anh" />
          <button className="button primary wide" disabled={!displayName.trim()} onClick={() => setStep(2)}>Tiếp tục <span>→</span></button>
        </>}
        {step === 2 && <>
          <p className="eyebrow">Bước 2 · Lớp học</p>
          <h1 id="onboarding-title">Em đang học lớp nào?</h1>
          <p>Thông tin này giúp hiển thị đúng bảng xếp hạng của lớp.</p>
          <label className="field-label" htmlFor="class-name">Tên lớp</label>
          <input id="class-name" className="text-field" value={className} maxLength={40} autoFocus onChange={(event) => setClassName(event.target.value)} placeholder="Ví dụ: 3A" />
          <div className="button-row"><button className="button ghost" onClick={() => setStep(1)}>← Quay lại</button><button className="button primary" disabled={!className.trim()} onClick={() => setStep(3)}>Tiếp tục →</button></div>
        </>}
        {step === 3 && <>
          <span className="mascot-orb celebration" aria-hidden>🌟</span>
          <p className="eyebrow">Bước 3 · Sẵn sàng</p>
          <h1 id="onboarding-title">Bắt đầu hành trình nhé!</h1>
          <p><b>{displayName}</b> · Lớp <b>{className}</b><br/>35 tuần, từng bước nhỏ, thật nhiều tiến bộ.</p>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="button-row"><button className="button ghost" onClick={() => setStep(2)}>← Quay lại</button><button className="button primary" disabled={submitting} onClick={() => void finish()}>{submitting ? "Đang tạo..." : "Bắt đầu Tuần 1"}</button></div>
        </>}
      </section>
    </div>
  );
}

export function useStudent() {
  const value = useContext(StudentContext);
  if (!value) throw new Error("useStudent phải nằm trong StudentProvider.");
  return value;
}
