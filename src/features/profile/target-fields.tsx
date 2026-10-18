"use client";
import { useState } from "react";
import { Field } from "@/features/forms/managed-form";
import type { Target } from "@/lib/targets";

export function TargetFields({ target }: { target?: Target | null }) {
  const [maintenance, setMaintenance] = useState(String(target?.maintenance_kcal ?? 2600));
  const [deficit, setDeficit] = useState(String(target?.deficit_kcal ?? 500));
  const [manual, setManual] = useState(target?.manual_override ?? false);
  const [override, setOverride] = useState(String(target?.food_kcal ?? 2100));
  const calculated = maintenance !== "" && deficit !== "" ? Math.round((Number(maintenance) - Number(deficit)) * 100) / 100 : "";
  return <>
    <div className="field-grid">
      <Field name="maintenance_kcal" label="Estimated maintenance (kcal)" type="number" inputMode="decimal" min={1} max={100000} step="0.01" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} required />
      <Field name="deficit_kcal" label="Requested deficit (kcal)" type="number" inputMode="decimal" min={0} max={100000} step="0.01" value={deficit} onChange={(e) => setDeficit(e.target.value)} required />
    </div>
    <label className="check-label"><input name="manual_override" type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />Set a manual food target</label>
    <Field name="food_kcal" label="Daily food target (kcal)" type="number" inputMode="decimal" min={1} max={100000} step="0.01" value={manual ? override : calculated} readOnly={!manual} onChange={(e) => setOverride(e.target.value)} help={manual ? "Your manual target overrides maintenance minus requested deficit. It doesn’t change your maintenance estimate." : "Estimated maintenance minus requested deficit."} required />
    <Field name="protein_g" label="Daily protein target (g)" type="number" inputMode="decimal" min={0} max={10000} step="0.01" defaultValue={target?.protein_g ?? 140} required />
    <p className="notice">Provisional starting targets, not measured metabolism or a guaranteed actual deficit. Hagen won’t adjust these automatically.</p>
  </>;
}
