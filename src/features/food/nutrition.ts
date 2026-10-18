import type { FoodSnapshot } from "./types";

export function scaleNutrition(food: Pick<FoodSnapshot, "basis" | "basis_kcal" | "basis_protein" | "quantity">) {
  const { basis, basis_kcal, basis_protein, quantity } = food;
  if (![basis_kcal, basis_protein, quantity].every(Number.isFinite) || basis_kcal < 0 || basis_protein < 0 || quantity <= 0) {
    throw new Error("Nutrition must be non-negative and quantity must be positive.");
  }
  if (basis === "total" && quantity !== 1) throw new Error("Total nutrition describes one whole entry.");
  const multiplier = basis === "per_100g" ? quantity / 100 : quantity;
  return { kcal: basis_kcal * multiplier, protein_g: basis_protein * multiplier };
}

export function nutritionSummary(entries: readonly { kcal: number; protein_g: number }[], completed: boolean, target: { food_kcal: number; protein_g: number } | null) {
  const known = entries.length > 0 || completed;
  const totals = entries.reduce((sum, entry) => ({ kcal: sum.kcal + Number(entry.kcal), protein_g: sum.protein_g + Number(entry.protein_g) }), { kcal: 0, protein_g: 0 });
  return {
    known, completed, ...totals,
    remainingKcal: known && target ? target.food_kcal - totals.kcal : null,
    remainingProtein: known && target ? target.protein_g - totals.protein_g : null,
  };
}

export const formatNutrition = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
export const mealLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export function portionLabel(food: FoodSnapshot) {
  if (food.basis === "total") return "Total nutrition";
  return food.basis === "per_100g" ? `${formatNutrition(food.quantity)} g · per 100 g label` : `${formatNutrition(food.quantity)} × ${food.serving_description}`;
}
