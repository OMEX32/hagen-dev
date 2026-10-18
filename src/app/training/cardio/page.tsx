import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/features/auth/session";
import { CardioForm, DeleteCardioForm } from "@/features/training/forms";
import { TrainingMigrationNotice } from "@/features/training/activity-card";
import { needsTrainingMigration } from "@/features/training/data";
import { dateInTimezone, isDiaryDate } from "@/lib/dates";
export default async function CardioPage({ searchParams }: { searchParams: Promise<{ date?: string; id?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams, today = dateInTimezone(profile.timezone);
  if (params.id && !z.uuid().safeParse(params.id).success) notFound();
  const result = await supabase.from("cardio_logs").select("*").eq("user_id", profile.user_id).eq("id", params.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
  if (needsTrainingMigration(result.error)) return <Shell training><TrainingMigrationNotice /></Shell>;
  if (result.error) throw new Error("Activity could not be loaded.");
  const log = result.data;
  if (params.id && !log) notFound();
  if (log?.session_id) return <Shell training><p>This entry belongs to your scheduled activity.</p><Link href={"/training/session?id=" + log.session_id} className="button secondary">Open activity</Link></Shell>;
  const date = log?.diary_date ?? (params.date && isDiaryDate(params.date) ? params.date : today);
  return <Shell training><Link href={"/training?date=" + date} className="text-link">← Training</Link><div className="page-heading"><h1>{log ? "Edit movement" : "Log movement"}</h1><p className="muted">Record an additional walk or jog. To fulfil a scheduled walk, open that activity instead.</p></div><section className="card"><CardioForm date={date} today={today} userId={profile.user_id} log={log} /></section>{log && <section className="card"><h2>Delete entry</h2><DeleteCardioForm log={log} /></section>}</Shell>;
}
