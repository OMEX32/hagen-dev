"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/features/auth/session";
import type { FormResult } from "@/features/forms/types";
import type { Json } from "@/lib/supabase/database.types";
import { logSchema, foodSchema, mealSchema, logFoodSchema, logMealSchema, copyCategorySchema, deleteSchema, diarySchema, snapshotFromForm } from "./validation";

async function write(action: string, payload: Json, data: FormData, message: string): Promise<FormResult> {
  const request = z.uuid().safeParse(data.get("request_id"));
  if (!request.success) return { error: "Reload this form before saving." };
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("food_write", { p_action: action, p_data: payload, p_request_id: request.data });
  if (error) {
    if (["PGRST202", "PGRST205", "42P01"].includes(error.code)) return { error: "Food logging needs its database update. Apply 202610180002_food.sql, then retry." };
    if (error.message.includes("Earlier request already saved")) return { error: "An earlier attempt already saved. Refresh your diary before making further changes." };
    return { error: "Your change wasn’t saved. Check your connection and try again. Your entries are still here." };
  }
  revalidatePath("/today");
  revalidatePath("/food");
  revalidatePath("/food/library");
  return { message };
}

const id = (data: FormData) => data.get("id") || undefined;
function invalid(error: z.ZodError): FormResult {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    (fields[key] ??= []).push(issue.message);
  }
  return { error: error.issues.some((issue) => issue.path[0] === "items") ? "Check the meal items. Each item needs a name, nutrition, and a valid quantity." : "Check the highlighted fields.", fields };
}

export async function saveFoodEntry(data: FormData): Promise<FormResult> {
  const parsed = logSchema.safeParse({ ...snapshotFromForm(data), id: id(data), diary_date: data.get("diary_date"), category: data.get("category") });
  if (!parsed.success) return invalid(parsed.error);
  return write("save_log", parsed.data, data, "Food entry saved.");
}
export async function saveReusableFood(data: FormData): Promise<FormResult> {
  const parsed = foodSchema.safeParse({ ...snapshotFromForm(data), quantity: 1, id: id(data) });
  if (!parsed.success) return invalid(parsed.error);
  return write("save_food", parsed.data, data, "Food saved to your library. Existing diary entries stay unchanged.");
}
export async function saveReusableMeal(data: FormData): Promise<FormResult> {
  const count = Number(data.get("item_count"));
  if (!Number.isInteger(count) || count < 1 || count > 50) return { error: "A saved meal needs between 1 and 50 items." };
  const parsed = mealSchema.safeParse({ id: id(data), name: data.get("name"), items: Array.from({ length: count }, (_, i) => snapshotFromForm(data, `items.${i}.`)) });
  if (!parsed.success) return invalid(parsed.error);
  return write("save_meal", parsed.data, data, "Meal saved to your library. Existing diary entries stay unchanged.");
}
export async function logSavedFood(data: FormData): Promise<FormResult> {
  const parsed = logFoodSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("log_food", parsed.data, data, "Food added to your diary.");
}
export async function logSavedMeal(data: FormData): Promise<FormResult> {
  const parsed = logMealSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("log_meal", parsed.data, data, "Meal added to your diary.");
}
export async function copyFoodCategory(data: FormData): Promise<FormResult> {
  const parsed = copyCategorySchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("copy_category", parsed.data, data, "Meal copied. The new entries can be edited independently.");
}
export async function setDiaryComplete(data: FormData): Promise<FormResult> {
  const parsed = diarySchema.safeParse({ diary_date: data.get("diary_date"), complete: data.get("complete") === "true", confirmed: data.get("confirmed") === "on" });
  if (!parsed.success) return invalid(parsed.error);
  return write("set_diary", parsed.data, data, parsed.data.complete ? "Food diary marked complete." : "Food diary reopened.");
}
export async function deleteFoodEntry(data: FormData): Promise<FormResult> {
  if (data.get("confirmed") !== "on") return { error: "Confirm that you want to delete this entry." };
  const parsed = deleteSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("delete_log", parsed.data, data, "Food entry deleted.");
}
export async function removeSavedFood(data: FormData): Promise<FormResult> {
  if (data.get("confirmed") !== "on") return { error: "Confirm that you want to remove this saved food." };
  const parsed = deleteSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("archive_food", parsed.data, data, "Saved food removed. Logged entries are unchanged.");
}
export async function removeSavedMeal(data: FormData): Promise<FormResult> {
  if (data.get("confirmed") !== "on") return { error: "Confirm that you want to remove this saved meal." };
  const parsed = deleteSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return invalid(parsed.error);
  return write("archive_meal", parsed.data, data, "Saved meal removed. Logged entries are unchanged.");
}
