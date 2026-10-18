import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Shell } from "@/components/shell";
import { foodContext } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { RepeatableFoodAction } from "@/features/food/forms";
import { removeSavedFood, removeSavedMeal } from "@/features/food/actions";
import { formatNutrition } from "@/features/food/nutrition";
import { allFoodRows } from "@/features/food/read-pages";

export default async function FoodLibrary({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date, diary, supabase, user } = await foodContext((await searchParams).date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  const [foods, meals, items] = await Promise.all([
    allFoodRows((start, end) => supabase.from("saved_foods").select("*").eq("user_id", user.id).is("archived_at", null).order("name").order("id").range(start, end)),
    allFoodRows((start, end) => supabase.from("saved_meals").select("*").eq("user_id", user.id).is("archived_at", null).order("name").order("id").range(start, end)),
    allFoodRows((start, end) => supabase.from("saved_meal_items").select("*").eq("user_id", user.id).order("id").range(start, end)),
  ]);
  if (foods.error || meals.error || items.error) throw new Error("Your saved foods could not be loaded.");
  return <Shell food><div className="page-heading"><Link className="text-link" href={`/food?date=${date}`}>← Food diary</Link><h1 className="form-page-title">Your food library.</h1><p className="muted">Your labels and go-to meals, ready to use again.</p></div>
    <section className="card"><div className="section-heading"><h2>Saved foods</h2><Link className="text-link" href={`/food/library/food?date=${date}`}>New food</Link></div>
      {!foods.data?.length && <p className="muted">Save nutrition from a food label to log different amounts quickly.</p>}
      <ul className="library-list">{foods.data?.map((food) => <li className="library-item" key={food.id}><div><strong>{food.name}</strong><span>{formatNutrition(food.basis_kcal)} kcal · {formatNutrition(food.basis_protein)} g protein {food.basis === "per_100g" ? "per 100 g" : `per ${food.serving_description}`}</span></div><div className="entry-links"><Link className="text-link" href={`/food/library/log?food=${food.id}&date=${date}`}>Log food</Link><Link className="text-link" href={`/food/library/food?id=${food.id}&date=${date}`}>Edit</Link><details><summary className="text-link">Remove</summary><RepeatableFoodAction action={removeSavedFood} requestId={randomUUID()} submitLabel="Remove saved food"><input type="hidden" name="id" value={food.id} /><label className="check-label"><input name="confirmed" type="checkbox" required />Remove {food.name} from your library? Logged entries stay unchanged.</label></RepeatableFoodAction></details></div></li>)}</ul>
    </section>
    <section className="card"><div className="section-heading"><h2>Saved meals</h2><Link className="text-link" href={`/food/library/meal?date=${date}`}>New meal</Link></div>
      {!meals.data?.length && <p className="muted">Build a meal from multiple items, or save a meal category from your diary.</p>}
      <ul className="library-list">{meals.data?.map((meal) => {
        const entries = items.data?.filter((item) => item.meal_id === meal.id) ?? [];
        return <li className="library-item" key={meal.id}><div><strong>{meal.name}</strong><span>{entries.length} items · {formatNutrition(entries.reduce((sum, item) => sum + Number(item.kcal), 0))} kcal for the whole meal</span></div><div className="entry-links"><Link className="text-link" href={`/food/library/log?meal=${meal.id}&date=${date}`}>Log meal</Link><Link className="text-link" href={`/food/library/meal?id=${meal.id}&date=${date}`}>Edit</Link><details><summary className="text-link">Remove</summary><RepeatableFoodAction action={removeSavedMeal} requestId={randomUUID()} submitLabel="Remove saved meal"><input type="hidden" name="id" value={meal.id} /><label className="check-label"><input type="checkbox" name="confirmed" required />Remove {meal.name} from your library? Logged entries stay unchanged.</label></RepeatableFoodAction></details></div></li>;
      })}</ul>
    </section>
  </Shell>;
}
