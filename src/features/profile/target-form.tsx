"use client";
import { useState } from "react";
import { ManagedForm, Field } from "@/features/forms/managed-form";
import { TargetFields } from "./target-fields";
import { saveTarget } from "./actions";
import type { Target } from "@/lib/targets";

export function TargetForm({ target, tomorrow, requestId }: { target: Target | null; tomorrow: string; requestId: string }) {
  const [request, setRequest] = useState(requestId);
  return <ManagedForm action={async (data) => {
    const result = await saveTarget(data);
    if (result.message) setRequest(crypto.randomUUID());
    return result;
  }} submitLabel="Save future targets">
    <input type="hidden" name="request_id" value={request} />
    <TargetFields target={target} />
    <Field name="effective_date" label="Start date" type="date" defaultValue={tomorrow} min={tomorrow} help="Tomorrow or later. Saving again for the same future date replaces that scheduled target." required />
  </ManagedForm>;
}
