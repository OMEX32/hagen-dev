import Link from "next/link";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/features/auth/session";
import { dateInTimezone, isDiaryDate } from "@/lib/dates";
import { resolveTarget } from "@/lib/targets";
import { DateNavigation } from "@/components/date-navigation";
import { getFoodDay } from "@/features/food/data";
import { NutritionCard } from "@/features/food/summary-card";
import { FoodMigrationNotice } from "@/features/food/migration-notice";

export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const today = dateInTimezone(profile.timezone);
  const requested = (await searchParams).date;
  const date = requested && isDiaryDate(requested) ? requested : today;
  const [targets, diary] = await Promise.all([
    supabase.from("target_history").select("*").eq("user_id", profile.user_id).lte("effective_date", date).order("effective_date", { ascending: false }).limit(1),
    getFoodDay(supabase, profile.user_id, date),
  ]);
  if (targets.error) throw new Error("Cannot load targets. Please try again.");
  const target = resolveTarget(targets.data ?? [], date);
  return <Shell>
    <div className="page-heading"><p className="eyebrow">Your own pace</p><h1>{date === today ? `Hello, ${profile.display_name}.` : "One day at a time."}</h1><p className="muted">Small steps. A steadier routine.</p></div>
    <DateNavigation date={date} today={today} path="/today" />
    {diary ? <><NutritionCard entries={diary.entries} completed={diary.completed} target={target} /><div className="food-toolbar"><Link className="button primary" href={`/food/entry?date=${date}`}>Log food</Link><Link className="button secondary" href={`/food?date=${date}`}>Open food diary</Link></div><section className="card"><h2>{diary.completed ? "Your food diary is complete." : "A little clarity, one entry at a time."}</h2><p className="muted section-description">{diary.completed ? "You confirmed this day’s entries. Any food changes will reopen the diary." : "Keep logging through the day. Mark the diary complete once everything you ate is recorded."}</p><Link href={`/food?date=${date}`} className="text-link">{diary.completed ? "Review food entries" : "Review and complete diary"} →</Link></section></> : <FoodMigrationNotice />}
    <section className="card"><h2>Your starting plan</h2><p className="muted section-description">{target ? `${target.food_kcal.toLocaleString("en-GB")} kcal food · ${target.protein_g} g protein. ${target.manual_override ? "Manual food target." : `${target.maintenance_kcal} kcal estimated maintenance minus ${target.deficit_kcal} kcal requested deficit.`}` : "No target was set for this day."}</p><Link href="/settings" className="text-link">Review your targets ↗</Link></section>
    <p className="footnote">Training and measurements will be added in their own milestones.</p>
    <p className="footnote">Your day follows {profile.timezone}. Targets are estimates and won’t change automatically.</p>
  </Shell>;
}
