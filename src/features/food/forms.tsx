"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Field, ManagedForm, SelectField } from "@/features/forms/managed-form";
import type { FormResult } from "@/features/forms/types";
import { categories, type FoodLog, type FoodSnapshot, type SavedFood, type SavedMealItem, type MealCategory } from "./types";
import { mealLabel, formatNutrition } from "./nutrition";
import { SnapshotFields, type SnapshotDefaults } from "./snapshot-fields";
import { saveFoodEntry, saveReusableFood, saveReusableMeal, logSavedFood, logSavedMeal } from "./actions";
import { useFoodDraft } from "./drafts";

export function DiaryFields({ date, category = "snacks" }: { date: string; category?: MealCategory }) {
  return <div className="field-grid"><Field name="diary_date" label="Diary date" type="date" defaultValue={date} required /><SelectField name="category" label="Meal" defaultValue={category}>{categories.map((item) => <option value={item} key={item}>{mealLabel(item)}</option>)}</SelectField></div>;
}

export function FoodEntryForm({ userId, date, category, initial, editingId, requestId }: {
  userId: string; date: string; category: MealCategory; initial?: FoodLog; editingId?: string; requestId: string;
}) {
  const router = useRouter();
  const { draft, ready, remember, clear } = useFoodDraft(`${userId}:entry:${editingId ?? initial?.id ?? "new"}:${date}:${category}`);
  if (!ready) return <p role="status" className="muted">Loading your form…</p>;
  return <ManagedForm onValuesChange={remember} submitLabel={editingId ? "Save food changes" : "Add food to diary"} action={async (data) => {
    const result = await saveFoodEntry(data);
    if (result.message) { clear(); router.push(`/food?date=${data.get("diary_date")}`); router.refresh(); }
    return result;
  }}>
    <input type="hidden" name="request_id" value={draft?.request_id ?? requestId} />
    {editingId && <input type="hidden" name="id" value={editingId} />}
    <DiaryFields date={draft?.diary_date ?? date} category={(draft?.category as MealCategory) ?? category} />
    <SnapshotFields initial={draft ?? initial} />
    <p className="field-help">Unsaved drafts stay in this browser tab when storage is available. Your diary is saved only when you press the button.</p>
  </ManagedForm>;
}

export function SavedFoodForm({ userId, food, requestId, returnDate }: { userId: string; food?: SavedFood; requestId: string; returnDate: string }) {
  const router = useRouter();
  const { draft, ready, remember, clear } = useFoodDraft(`${userId}:saved-food:${food?.id ?? "new"}`);
  if (!ready) return <p role="status" className="muted">Loading your form…</p>;
  return <ManagedForm onValuesChange={remember} submitLabel="Save reusable food" action={async (data) => {
    const result = await saveReusableFood(data);
    if (result.message) { clear(); router.push(`/food/library?date=${returnDate}`); router.refresh(); }
    return result;
  }}><input type="hidden" name="request_id" value={draft?.request_id ?? requestId} />{food && <input type="hidden" name="id" value={food.id} />}<SnapshotFields reusable initial={draft ?? food} /></ManagedForm>;
}

export function SavedMealForm({ userId, name = "", items = [], editingId, requestId, returnDate }: {
  userId: string; name?: string; items?: (FoodSnapshot | SavedMealItem)[]; editingId?: string; requestId: string; returnDate: string;
}) {
  const draft = useFoodDraft(`${userId}:saved-meal:${editingId ?? `${returnDate}:${name}`}`);
  if (!draft.ready) return <p role="status" className="muted">Loading your meal…</p>;
  return <MealEditor initialName={draft.draft?.name ?? name} initialItems={items} editingId={editingId} requestId={draft.draft?.request_id ?? requestId} returnDate={returnDate} draft={draft.draft} remember={draft.remember} clear={draft.clear} />;
}

function MealEditor({ initialName, initialItems, editingId, requestId, returnDate, draft, remember, clear }: {
  initialName: string; initialItems: FoodSnapshot[]; editingId?: string; requestId: string; returnDate: string;
  draft: Record<string, string> | null; remember: (data: FormData) => void; clear: () => void;
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(() => {
    const restoredCount = Number(draft?.item_count);
    const count = draft && Number.isInteger(restoredCount) && restoredCount >= 1 && restoredCount <= 50 ? restoredCount : Math.max(initialItems.length, 1);
    return Array.from({ length: count }, (_, index) => {
      const values: SnapshotDefaults = draft ? Object.fromEntries(Object.entries(draft).filter(([key]) => key.startsWith(`items.${index}.`)).map(([key, value]) => [key.slice(`items.${index}.`.length), value])) : initialItems[index] ?? {};
      return { key: index, values };
    });
  });
  useEffect(() => {
    const form = container.current?.querySelector("form");
    if (form) remember(new FormData(form));
  }, [rows, remember]);
  return <div ref={container}><ManagedForm onValuesChange={remember} submitLabel="Save reusable meal" action={async (data) => {
    const result = await saveReusableMeal(data);
    if (result.message) { clear(); router.push(`/food/library?date=${returnDate}`); router.refresh(); }
    return result;
  }}>
    <input type="hidden" name="request_id" value={requestId} />
    {editingId && <input type="hidden" name="id" value={editingId} />}
    <input type="hidden" name="item_count" value={rows.length} />
    <Field name="name" label="Saved meal name" defaultValue={initialName} maxLength={120} required />
    {rows.map((row, index) => <div className="meal-editor-item" key={row.key}><div className="section-heading"><h2>Item {index + 1}</h2><button type="button" className="text-link" disabled={rows.length === 1} onClick={(e) => {
      const form = e.currentTarget.closest("form")!;
      const values = new FormData(form);
      const next = rows.filter((_, i) => i !== index).map((item) => {
        const previousIndex = rows.findIndex((r) => r.key === item.key);
        return { ...item, values: Object.fromEntries(Object.entries(Object.fromEntries(values)).filter(([key]) => key.startsWith(`items.${previousIndex}.`)).map(([key, value]) => [key.slice(`items.${previousIndex}.`.length), String(value)])) };
      });
      setRows(next);
    }}>Remove item {index + 1}</button></div><SnapshotFields prefix={`items.${index}.`} initial={row.values} /></div>)}
    <button type="button" className="button secondary" disabled={rows.length >= 50} onClick={() => setRows((current) => [...current, { key: Math.max(...current.map((row) => row.key)) + 1, values: {} }])}>Add meal item</button>
  </ManagedForm></div>;
}

export function LogLibraryForm({ userId, food, mealId, date, category, requestId }: { userId: string; food?: SavedFood; mealId?: string; date: string; category: MealCategory; requestId: string }) {
  const router = useRouter();
  const { draft, ready, remember, clear } = useFoodDraft(`${userId}:log-library:${food?.id ?? mealId}:${date}:${category}`);
  if (!ready) return <p role="status" className="muted">Loading your form…</p>;
  return <ManagedForm onValuesChange={remember} submitLabel={food ? "Add food to diary" : "Add meal to diary"} action={async (data) => {
    const result = await (food ? logSavedFood(data) : logSavedMeal(data));
    if (result.message) { clear(); router.push(`/food?date=${data.get("diary_date")}`); router.refresh(); }
    return result;
  }}><input type="hidden" name="request_id" value={draft?.request_id ?? requestId} /><input type="hidden" name="id" value={food?.id ?? mealId} /><DiaryFields date={draft?.diary_date ?? date} category={(draft?.category as MealCategory) ?? category} />
    {food ? <><p className="notice">{formatNutrition(food.basis_kcal)} kcal · {formatNutrition(food.basis_protein)} g protein {food.basis === "per_100g" ? "per 100 g" : `per ${food.serving_description}`}</p><Field name="quantity" label={food.basis === "per_100g" ? "Amount eaten (g)" : "Servings eaten"} type="number" inputMode="decimal" min={0.001} max={1000000} step="0.001" defaultValue={draft?.quantity ?? ""} required /><Field name="notes" label="Notes (optional)" maxLength={2000} defaultValue={draft?.notes ?? ""} /></> : <Field name="multiplier" label="How much of this saved meal?" type="number" inputMode="decimal" min={0.001} max={1000} step="0.001" defaultValue={draft?.multiplier ?? 1} help="1 = the whole saved meal; 0.5 = half. Every item is scaled by this amount." required />}
  </ManagedForm>;
}

export function RepeatableFoodAction({ action, requestId, children, submitLabel }: { action: (data: FormData) => Promise<FormResult>; requestId: string; children: React.ReactNode; submitLabel: string }) {
  const [request, setRequest] = useState(requestId);
  return <ManagedForm submitLabel={submitLabel} action={async (data) => {
    const result = await action(data);
    if (result.message) setRequest(crypto.randomUUID());
    return result;
  }}><input type="hidden" name="request_id" value={request} />{children}</ManagedForm>;
}
