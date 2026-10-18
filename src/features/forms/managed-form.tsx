"use client";

import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import type { FormResult } from "./types";

const Errors = createContext<FormResult["fields"]>({});

export function ManagedForm({ action, children, submitLabel, pendingLabel = "Saving…", className = "", onValuesChange }: {
  action: (data: FormData) => Promise<FormResult>; children?: ReactNode;
  submitLabel: string; pendingLabel?: string; className?: string;
  onValuesChange?: (data: FormData) => void;
}) {
  const [result, setResult] = useState<FormResult>({});
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  return <form className={`form-stack ${className}`} onChange={(event) => onValuesChange?.(new FormData(event.currentTarget))} onSubmit={(event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const data = new FormData(event.currentTarget);
    setResult({});
    startTransition(async () => {
      try { setResult((await action(data)) ?? {}); }
      catch (error) {
        // Auth success and expired-session guards use framework redirects;
        // those must reach Next's boundary rather than appear as failed saves.
        unstable_rethrow(error);
        setResult({ error: "We couldn’t save. Check your connection and try again. Your entries are still here." });
      }
      finally { submitting.current = false; }
    });
  }}>
    <Errors.Provider value={result.fields}>
      <fieldset disabled={pending}>{children}</fieldset>
    </Errors.Provider>
    {result.error && <p className="notice error" role="alert">{result.error}</p>}
    {result.message && <p className="notice success" role="status">{result.message}</p>}
    <button className="button primary" type="submit" disabled={pending} aria-busy={pending}>{pending ? pendingLabel : submitLabel}</button>
    <span className="sr-only" role="status">{pending ? pendingLabel : ""}</span>
  </form>;
}

export function Field({ name, label, help, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; help?: string }) {
  const errors = useContext(Errors)?.[name];
  const ids = [help && `${name}-help`, errors?.length && `${name}-error`].filter(Boolean).join(" ") || undefined;
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    <input {...props} id={name} name={name} aria-describedby={ids} aria-invalid={errors?.length ? true : undefined} />
    {help && <p className="field-help" id={`${name}-help`}>{help}</p>}
    {!!errors?.length && <p className="field-error" id={`${name}-error`}>{errors[0]}</p>}
  </div>;
}

export function SelectField({ name, label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string; label: string }) {
  const errors = useContext(Errors)?.[name];
  return <div className="field"><label htmlFor={name}>{label}</label>
    <select {...props} id={name} name={name} aria-invalid={errors?.length ? true : undefined} aria-describedby={errors?.length ? `${name}-error` : undefined}>{children}</select>
    {!!errors?.length && <p className="field-error" id={`${name}-error`}>{errors[0]}</p>}
  </div>;
}
