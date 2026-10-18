"use client";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const prefix = "hagen-food-draft:";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("hagen-food-draft", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("hagen-food-draft", notify); };
}
const serverSnapshot = () => undefined;
export function useFoodDraft(key: string) {
  const getSnapshot = useCallback(() => {
    try { return sessionStorage.getItem(prefix + key); } catch { return null; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const draft = useMemo(() => {
    try {
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.values(parsed).every((value) => typeof value === "string")) return parsed as Record<string, string>;
      }
    } catch { /* Saving still works when tab draft storage is unavailable. */ }
    return null;
  }, [raw]);
  const remember = useCallback((data: FormData) => {
    try { sessionStorage.setItem(prefix + key, JSON.stringify(Object.fromEntries(data))); window.dispatchEvent(new Event("hagen-food-draft")); } catch { /* No offline write queue. */ }
  }, [key]);
  const clear = useCallback(() => { try { sessionStorage.removeItem(prefix + key); window.dispatchEvent(new Event("hagen-food-draft")); } catch { /* No-op. */ } }, [key]);
  return { draft, ready: raw !== undefined, remember, clear };
}

export function ClearFoodDrafts() {
  useEffect(() => {
    try { Object.keys(sessionStorage).filter((key) => key.startsWith(prefix)).forEach((key) => sessionStorage.removeItem(key)); } catch { /* No-op. */ }
  }, []);
  return null;
}
