import type { StudentIdentity } from "../types/spelling.ts";

export const STUDENT_ID_KEY = "spelling_student_id";
export const STUDENT_PROFILE_KEY = "spelling_student_profile";

type BrowserStorage = Pick<Storage, "getItem" | "setItem">;

export function ensureGuestCode(storage: BrowserStorage, createId: () => string) {
  const existing = storage.getItem(STUDENT_ID_KEY);
  if (existing) return existing;
  const studentCode = createId();
  storage.setItem(STUDENT_ID_KEY, studentCode);
  return studentCode;
}

export function readGuestIdentity(storage: BrowserStorage, createId: () => string): StudentIdentity | null {
  const studentCode = ensureGuestCode(storage, createId);
  const profile = storage.getItem(STUDENT_PROFILE_KEY);
  if (!profile) return null;
  try {
    const value = JSON.parse(profile) as Partial<StudentIdentity>;
    if (typeof value.displayName !== "string" || typeof value.className !== "string") return null;
    return { studentCode, displayName: value.displayName, className: value.className };
  } catch { return null; }
}
