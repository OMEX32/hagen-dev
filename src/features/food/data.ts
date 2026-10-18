import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { allFoodRows } from "./read-pages";

export function needsFoodMigration(error: { code: string } | null) {
  return !!error && ["42P01", "PGRST205", "PGRST202"].includes(error.code);
}

export async function getFoodDay(supabase: SupabaseClient<Database>, userId: string, date: string) {
  const [logs, day] = await Promise.all([
    allFoodRows((start, end) => supabase.from("food_logs").select("*").eq("user_id", userId).eq("diary_date", date).order("created_at").order("id").range(start, end)),
    supabase.from("food_diary_days").select("*").eq("user_id", userId).eq("diary_date", date).maybeSingle(),
  ]);
  if (needsFoodMigration(logs.error) || needsFoodMigration(day.error)) return null;
  if (logs.error || day.error) throw new Error("Your food diary could not be loaded. Please retry.");
  return { entries: logs.data ?? [], completed: !!day.data?.completed_at };
}
