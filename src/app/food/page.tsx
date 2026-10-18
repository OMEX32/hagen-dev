import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Shell } from "@/components/shell";
import { DateNavigation } from "@/components/date-navigation";
import { foodContext } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { NutritionCard } from "@/features/food/summary-card";
import { categories } from "@/features/food/types";
import { formatNutrition, mealLabel, portionLabel } from "@/features/food/nutrition";
import { RepeatableFoodAction } from "@/features/food/forms";
import { Field } from "@/features/forms/managed-form";
import { copyFoodCategory, deleteFoodEntry, setDiaryComplete } from "@/features/food/actions";
import { resolveTarget } from "@/lib/targets";
import { addDays } from "@/lib/dates";

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date, today, diary, supabase, user } = await foodContext((await searchParams).date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  const [targets, recent] = await Promise.all([
    supabase.from("target_history").select("*").eq("user_id", user.id).lte("effective_date", date).order("effective_date", { ascending: false }).limit(1),
    supabase.from("food_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
  ]);
  if (targets.error || recent.error) throw new Error("Could not load your food diary.");
  const seen = new Set<string>();
  const recentFoods = (recent.data ?? []).filter((entry) => {
    const key = JSON.stringify([entry.name, entry.basis, entry.basis_kcal, entry.basis_protein, entry.quantity, entry.preparation, entry.serving_description]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8);
  return <Shell food>
    <div className="page-heading"><p className="eyebrow">Make room for your day</p><h1>Your food diary.</h1><p className="muted">Log what you ate. Build a clearer picture.</p></div>
    <DateNavigation date={date} today={today} path="/food" />
    <NutritionCard entries={diary.entries} completed={diary.completed} target={resolveTarget(targets.data ?? [], date)} />
    <div className="food-toolbar"><Link className="button primary" href={`/food/entry?date=${date}`}>Log food</Link><Link className="button secondary" href={`/food/library?date=${date}`}>Saved foods & meals</Link></div>
    {categories.map((category) => {
      const entries = diary.entries.filter((entry) => entry.category === category);
      const kcal = entries.reduce((sum, entry) => sum + Number(entry.kcal), 0);
      return <section className="card" key={category} aria-label={`${mealLabel(category)} entries`}>
        <div className="section-heading"><div><h2>{mealLabel(category)}</h2><p className="field-help">{entries.length ? `${formatNutrition(kcal)} kcal logged` : "Nothing logged here yet"}</p></div><Link className="icon-button" href={`/food/entry?date=${date}&category=${category}`} aria-label={`Add ${category}`}>+</Link></div>
        <ul className="food-entry-list">{entries.map((entry) => <li key={entry.id}>
          <div className="food-entry-heading"><Link href={`/food/entry?id=${entry.id}&date=${date}`} className="food-entry-name">{entry.name}</Link><span>{formatNutrition(entry.kcal)} kcal</span></div>
          <p className="field-help">{formatNutrition(entry.protein_g)} g protein · {portionLabel(entry)}{entry.preparation !== "unspecified" ? ` · ${entry.preparation.replaceAll("_", " ")}` : ""}</p>
          {entry.notes && <p className="food-note">{entry.notes}</p>}
          <div className="entry-links"><Link className="text-link" href={`/food/entry?id=${entry.id}&date=${date}`}>Edit</Link><Link className="text-link" href={`/food/entry?reuse=${entry.id}&date=${date}&category=${category}`}>Reuse</Link>
            <details><summary className="text-link">Delete</summary><RepeatableFoodAction action={deleteFoodEntry} requestId={randomUUID()} submitLabel="Delete food entry"><input type="hidden" name="id" value={entry.id} /><label className="check-label"><input type="checkbox" name="confirmed" required />Delete {entry.name} from this diary?</label></RepeatableFoodAction></details>
          </div>
        </li>)}</ul>
        {!!entries.length && <details className="meal-tools"><summary>Copy or save this meal</summary><div className="details-content"><Link className="button secondary" href={`/food/library/meal?date=${date}&category=${category}&from=diary`}>Save {category} as a reusable meal</Link><RepeatableFoodAction action={copyFoodCategory} requestId={randomUUID()} submitLabel={`Copy ${category}`}><input type="hidden" name="source_date" value={date} /><input type="hidden" name="category" value={category} /><Field name="diary_date" label={`Copy ${category} to date`} type="date" defaultValue={addDays(date, 1)} required /><p className="field-help">Creates new entries on the chosen date. Editing them won’t affect this meal.</p></RepeatableFoodAction></div></details>}
      </section>;
    })}
    <section className="card" aria-label="Diary completion"><h2>{diary.completed ? "This diary is complete." : "Finished logging this day?"}</h2><p className="muted section-description">Editing, adding, copying, or deleting food reopens the affected diary so you can check it again.</p>
      {date > today ? <p className="notice">Future days can’t be marked complete.</p> : <RepeatableFoodAction key={String(diary.completed)} action={setDiaryComplete} requestId={randomUUID()} submitLabel={diary.completed ? "Reopen diary" : "Mark diary complete"}><input type="hidden" name="diary_date" value={date} /><input type="hidden" name="complete" value={String(!diary.completed)} />{!diary.completed && <label className="check-label"><input type="checkbox" name="confirmed" required />I’ve logged everything I ate for this day.</label>}</RepeatableFoodAction>}
    </section>
    {!!recentFoods.length && <section className="card"><h2>Use something recent</h2><p className="field-help section-description">Start from a previous entry’s nutrition. Check the amount and date before saving.</p><ul className="library-list">{recentFoods.map((entry) => <li key={entry.id}><div><strong>{entry.name}</strong><span>{formatNutrition(entry.kcal)} kcal · {formatNutrition(entry.protein_g)} g protein</span></div><Link className="text-link" href={`/food/entry?reuse=${entry.id}&date=${date}`}>Reuse</Link></li>)}</ul></section>}
  </Shell>;
}
