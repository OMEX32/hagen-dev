import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Shell } from "@/components/shell";
import { foodContext, selectedCategory } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { LogLibraryForm } from "@/features/food/forms";
import { formatNutrition, portionLabel } from "@/features/food/nutrition";
export default async function LogLibraryPage({ searchParams }: { searchParams: Promise<{ date?: string; food?: string; meal?: string; category?: string }> }) {
  const params = await searchParams;
  const { date, diary, user, supabase } = await foodContext(params.date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  const id = params.food ?? params.meal;
  if (!id || !z.uuid().safeParse(id).success) notFound();
  let food, meal;
  let contents = null;
  if (params.food) {
    const result = await supabase.from("saved_foods").select("*").eq("id", id).eq("user_id", user.id).is("archived_at", null).maybeSingle();
    if (result.error) throw new Error("Could not load the saved food.");
    if (!result.data) notFound();
    food = result.data;
  } else {
    const [result, items] = await Promise.all([
      supabase.from("saved_meals").select("*").eq("id", id).eq("user_id", user.id).is("archived_at", null).maybeSingle(),
      supabase.from("saved_meal_items").select("*").eq("meal_id", id).eq("user_id", user.id).order("position"),
    ]);
    if (result.error || items.error) throw new Error("Could not load the saved meal.");
    if (!result.data) notFound();
    meal = result.data; contents = items.data;
  }
  return <Shell food><div className="page-heading"><Link className="text-link" href={`/food/library?date=${date}`}>← Food library</Link><h1 className="form-page-title">{food?.name ?? meal?.name}</h1><p className="muted">Check your portion, then add it to your diary.</p></div><section className="card">{contents && <ul className="food-entry-list meal-preview">{contents.map((item) => <li key={item.id}><strong>{item.name}</strong><p className="field-help">{portionLabel(item)} · {formatNutrition(item.kcal)} kcal · {formatNutrition(item.protein_g)} g protein</p></li>)}</ul>}<LogLibraryForm userId={user.id} food={food} mealId={meal?.id} date={date} category={selectedCategory(params.category)} requestId={randomUUID()} /></section></Shell>;
}
