import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { nutritionSummary, scaleNutrition, portionLabel } from "../src/features/food/nutrition";
import { snapshotSchema, logSchema, foodSchema, mealSchema, diarySchema } from "../src/features/food/validation";
import { NutritionCard } from "../src/features/food/summary-card";
import { resolveTarget, type Target } from "../src/lib/targets";
import { dateInTimezone } from "../src/lib/dates";
import type { FoodLog } from "../src/features/food/types";
import { allFoodRows, foodPageSize } from "../src/features/food/read-pages";

const snapshot = { name: "Label entry", basis: "per_100g" as const, basis_kcal: 125.5, basis_protein: 8, quantity: 150, serving_description: "", preparation: "cooked" as const, notes: "" };
const target: Target = { id: "test", user_id: "test", effective_date: "2026-10-18", maintenance_kcal: 2600, deficit_kcal: 500, food_kcal: 2100, protein_g: 140, manual_override: false, created_at: "" };
describe("label nutrition and snapshots", () => {
  it("scales per-100-g values without rounding the snapshot", () => {
    expect(scaleNutrition(snapshot)).toEqual({ kcal: 188.25, protein_g: 12 });
    expect(scaleNutrition({ ...snapshot, quantity: 33.333 }).kcal).toBeCloseTo(41.832915, 6);
  });
  it("scales explicitly described servings including fractions", () => {
    expect(scaleNutrition({ ...snapshot, basis: "per_serving", quantity: 0.5 })).toEqual({ kcal: 62.75, protein_g: 4 });
    expect(portionLabel({ ...snapshot, basis: "per_serving", quantity: 0.5, serving_description: "one pot (150 g)" })).toContain("0.5 × one pot (150 g)");
  });
  it("accepts legitimate zero nutrition and whole-entry totals", () => {
    expect(scaleNutrition({ basis: "total", basis_kcal: 0, basis_protein: 0, quantity: 1 })).toEqual({ kcal: 0, protein_g: 0 });
    expect(snapshotSchema.safeParse({ ...snapshot, basis_kcal: "0", basis_protein: "0" }).success).toBe(true);
  });
  it("does not silently treat total nutrition as per-serving nutrition", () => {
    expect(() => scaleNutrition({ ...snapshot, basis: "total", quantity: 2 })).toThrow();
    expect(snapshotSchema.safeParse({ ...snapshot, basis: "total" }).success).toBe(false);
  });
  it.each(["", " ", "abc", "NaN", "Infinity", "-2"])("rejects invalid quantity %s", (quantity) => {
    expect(snapshotSchema.safeParse({ ...snapshot, quantity }).success).toBe(false);
  });
  it("rejects zero quantity, invalid basis, and missing serving descriptions", () => {
    expect(snapshotSchema.safeParse({ ...snapshot, quantity: 0 }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...snapshot, basis: "grams" }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...snapshot, basis: "per_serving", serving_description: " " }).success).toBe(false);
  });
  it("rejects excess label precision but accepts quantities scaled by a meal fraction", () => {
    expect(snapshotSchema.safeParse({ ...snapshot, basis_kcal: 0.0001 }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...snapshot, quantity: 0.000001 }).success).toBe(true);
  });
  it("preserves snapshot values independently from definition changes", () => {
    const definition = { ...snapshot };
    const log = structuredClone(definition);
    definition.basis_kcal = 999;
    expect(scaleNutrition(log).kcal).toBe(188.25);
  });
});

describe("complete food reads", () => {
  it("includes entries beyond one provider page", async () => {
    const rows = Array.from({ length: foodPageSize + 3 }, (_, id) => ({ id }));
    const result = await allFoodRows((start, end) => Promise.resolve({ data: rows.slice(start, end + 1), error: null }));
    expect(result.data).toEqual(rows);
    expect(result.error).toBe(null);
  });
  it("does not return misleading partial totals when a later page fails", async () => {
    const result = await allFoodRows((start) => Promise.resolve(start === 0
      ? { data: Array.from({ length: foodPageSize }, (_, id) => ({ id })), error: null }
      : { data: null, error: { code: "FETCH_FAILED", message: "Connection lost" } }));
    expect(result.data).toBe(null);
    expect(result.error?.code).toBe("FETCH_FAILED");
  });
});

describe("diary validation and known coverage", () => {
  it("validates dates and categories on the server", () => {
    expect(logSchema.safeParse({ ...snapshot, diary_date: "2026-02-29", category: "lunch" }).success).toBe(false);
    expect(logSchema.safeParse({ ...snapshot, diary_date: "2026-10-18", category: "breakfast" }).success).toBe(true);
    expect(logSchema.safeParse({ ...snapshot, diary_date: "2026-10-18", category: "other" }).success).toBe(false);
  });
  it("requires a repeatable basis for saved foods and at least one saved-meal item", () => {
    expect(foodSchema.safeParse({ ...snapshot, basis: "total", quantity: 1 }).success).toBe(false);
    expect(mealSchema.safeParse({ name: "Meal", items: [] }).success).toBe(false);
    expect(mealSchema.safeParse({ name: "Meal", items: [snapshot] }).success).toBe(true);
  });
  it("requires explicit confirmation before marking a diary complete", () => {
    expect(diarySchema.safeParse({ diary_date: "2026-10-18", complete: true, confirmed: false }).success).toBe(false);
    expect(diarySchema.safeParse({ diary_date: "2026-10-18", complete: false, confirmed: false }).success).toBe(true);
  });
  it("keeps unlogged incomplete days unknown", () => {
    expect(nutritionSummary([], false, target)).toMatchObject({ known: false, remainingKcal: null, remainingProtein: null });
    expect(nutritionSummary([], true, target)).toMatchObject({ known: true, completed: true, kcal: 0, remainingKcal: 2100 });
  });
  it("computes a real amount remaining and a real amount over", () => {
    expect(nutritionSummary([{ kcal: 1250, protein_g: 90 }], false, target)).toMatchObject({ remainingKcal: 850, remainingProtein: 50, completed: false });
    expect(nutritionSummary([{ kcal: 2400, protein_g: 160 }], false, target)).toMatchObject({ remainingKcal: -300, remainingProtein: -20 });
  });
  it("uses the historical target effective at local midnight", () => {
    const date = dateInTimezone("Europe/Brussels", new Date("2026-10-18T22:30:00Z"));
    const history = [target, { ...target, effective_date: "2026-10-19", food_kcal: 2300 }];
    expect(nutritionSummary([{ kcal: 1250, protein_g: 90 }], true, resolveTarget(history, date)).remainingKcal).toBe(1050);
    expect(nutritionSummary([{ kcal: 1250, protein_g: 90 }], true, resolveTarget(history, "2026-10-18")).remainingKcal).toBe(850);
  });
  it("never invents a target for earlier dates", () => {
    expect(nutritionSummary([{ kcal: 100, protein_g: 1 }], false, null).remainingKcal).toBe(null);
  });
  it("renders unknown intake without a misleading zero total", () => {
    const html = renderToStaticMarkup(createElement(NutritionCard, { entries: [], completed: false, target }));
    expect(html).toContain("Intake is unknown");
    expect(html).not.toContain("remaining to food target");
  });
  it("renders neutral over-target amounts and incomplete coverage", () => {
    const html = renderToStaticMarkup(createElement(NutritionCard, { entries: [{ kcal: 2400, protein_g: 160 }] as FoodLog[], completed: false, target }));
    expect(html).toContain("300 kcal");
    expect(html).toContain("over food target");
    expect(html).toContain("Incomplete");
    expect(html).toContain("Unlogged food");
  });
});
