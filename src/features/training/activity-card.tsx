import Link from "next/link";
import { ManagedForm } from "@/features/forms/managed-form";
import { openSession } from "./actions";
import { activityLabels, dayRule, statusLabels } from "./domain";
import type { getTrainingDay } from "./data";
export function TrainingMigrationNotice() {
  return <section className="card"><h2>Training needs its database update</h2><p className="muted section-description">Apply <code>202610180003_training.sql</code> in your Supabase SQL Editor, then reload. Your existing food diary remains available.</p></section>;
}
export function ActivityCard({ day, date, today }: { day: Awaited<ReturnType<typeof getTrainingDay>>; date: string; today: string }) {
  if (!day) return <TrainingMigrationNotice />;
  const plan = day.session ?? (day.routine ? dayRule(day.routine, date) : null);
  const minutes = day.session?.planned_minutes ?? (day.routine ? dayRule(day.routine, date).minutes : null);
  const walkingMinutes = day.cardio.filter((log) => log.kind === "walk").reduce((total, log) => total + Number(log.minutes), 0);
  return <section className="card"><div className="section-heading"><h2>Activity</h2>{plan && <span className="status-pill">{day.session ? statusLabels[day.session.status] : "Planned"}</span>}</div>
    <p className="activity-title">{plan ? activityLabels[plan.kind] + (minutes ? " · " + minutes + " min planned" : "") : "No routine for this date."}</p>
    {day.cardio.length > 0 && <p className="muted">{walkingMinutes} walking minutes recorded · {day.cardio.length} actual activity {day.cardio.length === 1 ? "entry" : "entries"}. Planned minutes are not added to actual minutes.</p>}
    {day.session ? <Link className="button secondary" href={"/training/session?id=" + day.session.id}>{day.session.status === "in_progress" ? "Resume activity" : "Review activity"}</Link> :
      plan && date <= today ? <ManagedForm action={openSession} submitLabel="Open activity"><input type="hidden" name="request_id" value={crypto.randomUUID()} /><input type="hidden" name="diary_date" value={date} /></ManagedForm> :
      !plan ? <Link className="button secondary" href="/training/routine">Set up your routine</Link> : <p className="muted">Preview only. Open this activity on its date.</p>}
  </section>;
}
