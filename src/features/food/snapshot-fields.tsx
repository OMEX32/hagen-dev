"use client";
import { useState } from "react";
import { Field, SelectField } from "@/features/forms/managed-form";
import type { FoodSnapshot, NutritionBasis } from "./types";

export type SnapshotDefaults = Partial<Record<keyof FoodSnapshot, string | number>>;
export function SnapshotFields({ initial = {}, prefix = "", reusable = false }: { initial?: SnapshotDefaults; prefix?: string; reusable?: boolean }) {
  const [basis, setBasis] = useState<NutritionBasis>((initial.basis as NutritionBasis) ?? (reusable ? "per_100g" : "total"));
  const name = (key: string) => prefix + key;
  return <>
    <Field name={name("name")} label="Food or meal name" maxLength={120} defaultValue={initial.name ?? ""} required />
    <SelectField name={name("basis")} label="Nutrition basis" value={basis} onChange={(e) => setBasis(e.target.value as NutritionBasis)}>
      {!reusable && <option value="total">Total for this whole entry</option>}
      <option value="per_100g">Per 100 g</option><option value="per_serving">Per serving</option>
    </SelectField>
    <div className="field-grid"><Field name={name("basis_kcal")} label={basis === "total" ? "Total calories (kcal)" : "Label calories (kcal)"} type="number" inputMode="decimal" min={0} max={1000000} step="0.001" defaultValue={initial.basis_kcal ?? ""} required /><Field name={name("basis_protein")} label={basis === "total" ? "Total protein (g)" : "Label protein (g)"} type="number" inputMode="decimal" min={0} max={1000000} step="0.001" defaultValue={initial.basis_protein ?? ""} required /></div>
    {basis === "per_serving" ? <Field name={name("serving_description")} label="What is one serving?" maxLength={100} defaultValue={initial.serving_description ?? ""} placeholder="For example: one pot (150 g)" required /> : <input type="hidden" name={name("serving_description")} value="" />}
    {reusable || basis === "total" ? <input type="hidden" name={name("quantity")} value="1" /> : <Field key={basis} name={name("quantity")} label={basis === "per_100g" ? "Amount eaten (g)" : "Servings eaten"} type="number" inputMode="decimal" min={0.000001} max={1000000000} step="any" defaultValue={initial.basis === basis ? initial.quantity ?? "" : ""} required />}
    <SelectField name={name("preparation")} label="Preparation" defaultValue={initial.preparation ?? "unspecified"}><option value="unspecified">Not specified</option><option value="raw">Raw</option><option value="cooked">Cooked</option><option value="as_served">As served / packaged</option></SelectField>
    <Field name={name("notes")} label="Notes (optional)" maxLength={2000} defaultValue={initial.notes ?? ""} />
    <p className="field-help">Use nutrition from your food label or another source you trust. Zero calories and zero protein are accepted.</p>
  </>;
}
