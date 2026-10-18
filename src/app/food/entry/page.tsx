import Link from "next/link";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { foodContext, selectedCategory } from "@/features/food/page-context";
import { FoodMigrationNotice } from "@/features/food/migration-notice";
import { FoodEntryForm } from "@/features/food/forms";

export default async function FoodEntryPage({ searchParams }: { searchParams: Promise<{ date?: string; category?: string; id?: string; reuse?: string }> }) {
  const params = await searchParams;
  const { diary, date, user, supabase } = await foodContext(params.date);
  if (!diary) return <Shell food><FoodMigrationNotice /></Shell>;
  let initial;
  const id = params.id ?? params.reuse;
  if (id) {
    if (!z.uuid().safeParse(id).success) notFound();
    const result = await supabase.from("food_logs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (result.error) throw new Error("Could not load this food entry.");
    if (!result.data) notFound();
    initial = result.data;
  }
  const entryDate = params.id && initial ? initial.diary_date : date;
  return <Shell food><div className="page-heading"><Link className="text-link" href={`/food?date=${entryDate}`}>← Food diary</Link><h1 className="form-page-title">{params.id ? "Edit your entry." : "What did you eat?"}</h1><p className="muted">{params.id ? "These values belong to this diary entry. Saved foods stay unchanged." : "Enter total nutrition or scale a per-100-g or per-serving label."}</p></div><section className="card"><FoodEntryForm key={params.id ?? params.reuse ?? "new"} userId={user.id} date={entryDate} category={params.id && initial ? initial.category : selectedCategory(params.category)} initial={initial} editingId={params.id} requestId={randomUUID()} /></section><Link className="text-link" href={`/food/library?date=${date}`}>Choose a saved food or meal instead</Link></Shell>;
}
