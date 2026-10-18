"use client";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ManagedForm } from "@/features/forms/managed-form";
import type { FormResult } from "@/features/forms/types";
const prefix = "hagen-training-draft:";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify); window.addEventListener("hagen-training-draft", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("hagen-training-draft", notify); };
}
const serverSnapshot = () => undefined;
export function TrainingForm({ action, children, submitLabel, draftKey, requestId, after }: {
  action: (data: FormData) => Promise<FormResult>; children: ReactNode; submitLabel: string; draftKey: string; requestId: string; after?: string;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const stale = useRef(false);
  const draftRevision = useRef<string | undefined>(undefined);
  const getSnapshot = useCallback(() => { try { return sessionStorage.getItem(prefix + draftKey); } catch { return null; } }, [draftKey]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const draft = useMemo(() => {
    try { const value: unknown = raw ? JSON.parse(raw) : null;
      return value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((v) => typeof v === "string") ? value as Record<string, string> : null;
    } catch { return null; }
  }, [raw]);
  useEffect(() => {
    if (raw === undefined || restored.current || !root.current) return;
    restored.current = true;
    const savedRevision = root.current.querySelector<HTMLInputElement>('input[name="revision"]')?.value;
    stale.current = !!draft && draft.revision !== undefined && draft.revision !== savedRevision;
    draftRevision.current = draft?.revision;
    if (draft) root.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[name]").forEach((field) => {
      if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = draft[field.name] === "on";
      else if (draft[field.name] !== undefined) field.value = draft[field.name];
    });
  }, [raw, draft]);
  const clear = () => { try { sessionStorage.removeItem(prefix + draftKey); window.dispatchEvent(new Event("hagen-training-draft")); } catch { /* Saving still works without tab storage. */ } };
  return <div ref={root}>
    {raw === undefined ? <p role="status" className="muted">Loading form…</p> : <>
      {draft && <p className="field-help">This tab has unsent input. It is saved to your diary only after a successful save. <button className="text-link" type="button" onClick={() => { clear(); window.location.reload(); }}>Discard tab draft and reload</button></p>}
      <ManagedForm action={async (data) => {
        if (stale.current) return { error: "The saved record changed while this tab had unsent input. Copy any input you need, then discard the tab draft and reload to review the saved record." };
        const result = await action(data);
        if (result.message) { clear(); if (after) router.push(after); else router.refresh(); }
        return result;
      }} submitLabel={submitLabel} onValuesChange={(data) => {
        try { if (stale.current && draftRevision.current !== undefined) data.set("revision", draftRevision.current); sessionStorage.setItem(prefix + draftKey, JSON.stringify(Object.fromEntries(data))); window.dispatchEvent(new Event("hagen-training-draft")); } catch { /* No offline queue. */ }
      }}>
        <input type="hidden" name="request_id" defaultValue={requestId} />
        {children}
      </ManagedForm>
    </>}
  </div>;
}
export function ClearTrainingDrafts() {
  useEffect(() => {
    try { Object.keys(sessionStorage).filter((key) => key.startsWith(prefix)).forEach((key) => sessionStorage.removeItem(key)); } catch { /* No-op. */ }
  }, []);
  return null;
}
