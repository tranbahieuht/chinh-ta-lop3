"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HintLevel } from "@/types/lesson";

const KEY = "fraction-tutor-hint-level";
const EVENT = "fraction-tutor-hint-change";

function readLevel(): HintLevel {
  const saved = Number(window.localStorage.getItem(KEY));
  return ([0, 1, 2, 3].includes(saved) ? saved : 0) as HintLevel;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", onChange); };
}

function writeLevel(level: HintLevel) {
  window.localStorage.setItem(KEY, String(level));
  window.dispatchEvent(new Event(EVENT));
}

export function useHintLevel() {
  const hintLevel = useSyncExternalStore(subscribe, readLevel, () => 0 as HintLevel);

  const update = useCallback((level: HintLevel) => {
    writeLevel(level);
  }, []);

  const increase = useCallback(() => {
    writeLevel(Math.min(3, readLevel() + 1) as HintLevel);
  }, []);

  return { hintLevel, increase, update, ready: true };
}
