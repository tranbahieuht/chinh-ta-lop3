"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HintLevel } from "@/types/lesson";

const KEY = "fraction-tutor-example-hint-level";
const EVENT = "fraction-tutor-example-hint-change";

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

export function useExampleHintLevel() {
  const exampleHintLevel = useSyncExternalStore(subscribe, readLevel, () => 0 as HintLevel);
  const setExampleHintLevel = useCallback((level: HintLevel) => writeLevel(level), []);
  return { exampleHintLevel, setExampleHintLevel };
}
