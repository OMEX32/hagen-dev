import { requireProfile } from "@/features/auth/session";
import { dateInTimezone, isDiaryDate } from "@/lib/dates";
import { categories, type MealCategory } from "./types";
import { getFoodDay } from "./data";

export async function foodContext(requested?: string) {
  const context = await requireProfile();
  const today = dateInTimezone(context.profile.timezone);
  const date = requested && isDiaryDate(requested) ? requested : today;
  const diary = await getFoodDay(context.supabase, context.user.id, date);
  return { ...context, today, date, diary };
}
export function selectedCategory(category?: string): MealCategory {
  return categories.includes(category as MealCategory) ? category as MealCategory : "snacks";
}
