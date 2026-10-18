import Link from "next/link";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/features/auth/session";
import { RoutineForm } from "@/features/training/forms";
import { needsTrainingMigration } from "@/features/training/data";
import { TrainingMigrationNotice } from "@/features/training/activity-card";
import { addDays, dateInTimezone } from "@/lib/dates";
export default async function RoutinePage() {
  const { supabase, profile } = await requireProfile();
  const routines = await supabase.from("training_routines").select("*").eq("user_id", profile.user_id).order("effective_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1);
  if (needsTrainingMigration(routines.error)) return <Shell training><TrainingMigrationNotice /></Shell>;
  if (routines.error) throw new Error("Your routine could not be loaded.");
  const routine = routines.data?.[0] ?? null, today = dateInTimezone(profile.timezone);
  const earliest = routine ? addDays(today, 1) : today;
  return <Shell training><Link href="/training" className="text-link">← Training</Link><div className="page-heading"><p className="eyebrow">Your routine, your pace</p><h1>{routine ? "Edit future routine" : "Your starting routine"}</h1><p className="muted">Weekly schedule and strength prescription. Past sessions stay unchanged.</p></div>
    {routine && <p className="notice">Editing the latest saved version, effective {routine.effective_date}. A later scheduled revision will still take over on its effective date. Saving another revision on the same date replaces that date’s plan for unopened sessions.</p>}
    <section className="card"><RoutineForm routine={routine} earliest={earliest} userId={profile.user_id} /></section></Shell>;
}
