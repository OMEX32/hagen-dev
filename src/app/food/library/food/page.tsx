import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Shell } from "@/components/shell";
import { foodContext } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { SavedFoodForm } from "@/features/food/forms";
export default async function SavedFoodPage({ searchParams }: { searchParams: Promise<{ date?: string; id?: string }> }) {
  const params = await searchParams;
  const { date, diary, user, supabase } = await foodContext(params.date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  let food;
  if (params.id) {
    if (!z.uuid().safeParse(params.id).success) notFound();
    const result = await supabase.from("saved_foods").select("*").eq("id", params.id).eq("user_id", user.id).is("archived_at", null).maybeSingle();
    if (result.error) throw new Error("Could not load this saved food.");
    if (!result.data) notFound();
    food = result.data;
  }
  return <Shell food><div className="page-heading"><Link className="text-link" href={`/food/library?date=${date}`}>← Food library</Link><h1 className="form-page-title">{food ? "Edit a saved food." : "Save a food label."}</h1><p className="muted">Keep its nutrition basis clear. This doesn’t add food to your diary.</p></div><section className="card"><SavedFoodForm userId={user.id} food={food} requestId={randomUUID()} returnDate={date} /></section></Shell>;
}
