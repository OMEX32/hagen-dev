export const categories = ["breakfast", "lunch", "dinner", "snacks"] as const;
export const preparations = ["unspecified", "raw", "cooked", "as_served"] as const;
export type MealCategory = typeof categories[number];
export type NutritionBasis = "total" | "per_100g" | "per_serving";
export type FoodSnapshot = {
  name: string; basis: NutritionBasis; basis_kcal: number; basis_protein: number;
  quantity: number; serving_description: string; preparation: typeof preparations[number]; notes: string;
};
export type FoodLog = FoodSnapshot & {
  id: string; user_id: string; diary_date: string; category: MealCategory;
  kcal: number; protein_g: number; source_food_id: string | null; source_meal_id: string | null; created_at: string;
};
export type SavedFood = Omit<FoodSnapshot, "quantity"> & { id: string; user_id: string; archived_at: string | null; created_at: string };
export type SavedMeal = { id: string; user_id: string; name: string; archived_at: string | null; created_at: string };
export type SavedMealItem = FoodSnapshot & { id: string; user_id: string; meal_id: string; position: number; kcal: number; protein_g: number };
export type DiaryDay = { user_id: string; diary_date: string; completed_at: string | null };
