import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Shell } from "@/components/shell";
import { foodContext, selectedCategory } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { SavedMealForm } from "@/features/food/forms";
import type { FoodSnapshot } from "@/features/food/types";
import { mealLabel } from "@/features/food/nutrition";
export default async function SavedMealPage({ searchParams }: { searchParams: Promise<{ date?: string; id?: string; from?: string; category?: string }> }) {
  const params = await searchParams;
  const { date, diary, user, supabase } = await foodContext(params.date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  let name = "";
  let items: FoodSnapshot[] = [];
  if (params.id) {
    if (!z.uuid().safeParse(params.id).success) notFound();
    const [meal, contents] = await Promise.all([
      supabase.from("saved_meals").select("*").eq("id", params.id).eq("user_id", user.id).is("archived_at", null).maybeSingle(),
      supabase.from("saved_meal_items").select("*").eq("meal_id", params.id).eq("user_id", user.id).order("position"),
    ]);
    if (meal.error || contents.error) throw new Error("Could not load this saved meal.");
    if (!meal.data) notFound();
    name = meal.data.name; items = contents.data ?? [];
  } else if (params.from === "diary") {
    const category = selectedCategory(params.category);
    name = mealLabel(category); items = diary.entries.filter((entry) => entry.category === category);
  }
  return <Shell food><div className="page-heading"><Link className="text-link" href={`/food/library?date=${date}`}>← Food library</Link><h1 className="form-page-title">{params.id ? "Edit a saved meal." : "Keep a go-to meal."}</h1><p className="muted">Save the items and amounts you want to use again. Logged meals keep their original nutrition.</p></div><section className="card"><SavedMealForm userId={user.id} name={name} items={items} editingId={params.id} requestId={randomUUID()} returnDate={date} /></section></Shell>;
}
