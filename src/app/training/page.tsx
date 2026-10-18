import Link from "next/link";
import { Shell } from "@/components/shell";
import { DateNavigation } from "@/components/date-navigation";
import { requireProfile } from "@/features/auth/session";
import { getTrainingDay } from "@/features/training/data";
import { ActivityCard, TrainingMigrationNotice } from "@/features/training/activity-card";
import { activityLabels, dayRule, fortnight, resolveRoutine, statusLabels } from "@/features/training/domain";
import { addDays, dateInTimezone, isDiaryDate, readableDate } from "@/lib/dates";
import { allRows } from "@/lib/read-pages";
export default async function Training({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const today = dateInTimezone(profile.timezone), requested = (await searchParams).date;
  const date = requested && isDiaryDate(requested) ? requested : today;
  const day = await getTrainingDay(supabase, profile.user_id, date);
  if (!day) return <Shell training><TrainingMigrationNotice /></Shell>;
  const [future, sessions] = await Promise.all([
    allRows((start, end) => supabase.from("training_routines").select("*").eq("user_id", profile.user_id).gt("effective_date", date).lte("effective_date", addDays(date, 13)).order("effective_date").order("created_at").order("id").range(start, end)),
    supabase.from("training_sessions").select("*").eq("user_id", profile.user_id).gte("diary_date", date).lte("diary_date", addDays(date, 13)).order("diary_date"),
  ]);
  if (future.error || sessions.error) throw new Error("Your schedule could not be loaded.");
  const routines = [...(day.routine ? [day.routine] : []), ...(future.data ?? [])];
  return <Shell training><div className="page-heading"><p className="eyebrow">Small steps, steady practice</p><h1>Training</h1><p className="muted">Follow your plan, and record what you actually did.</p></div>
    <DateNavigation date={date} today={today} path="/training" /><ActivityCard day={day} date={date} today={today} />
    <div className="food-toolbar"><Link className="button secondary" href={"/training/cardio?date=" + date}>Log extra walking / jogging</Link><Link className="button secondary" href="/training/routine">Edit future routine</Link></div>
    <section className="card"><h2>Recorded movement</h2><p className="muted section-description">Duration and distance are entered manually. No calorie-burn estimate is added to your food target.</p>{day.cardio.length ? <ul className="training-list">{day.cardio.map((log) => <li key={log.id}><div><strong>{log.kind === "walk" ? "Walk" : "Jog"} · {log.minutes} min</strong><p className="muted">{log.distance_km === null ? "Distance not recorded" : log.distance_km + " km"}{log.session_id ? " · Scheduled activity" : " · Extra activity"}</p></div><Link className="text-link" href={log.session_id ? "/training/session?id=" + log.session_id : "/training/cardio?id=" + log.id}>Review<span className="sr-only"> {log.kind} {log.minutes} minutes</span> →</Link></li>)}</ul> : <p className="muted">No walking or jogging recorded for this date.</p>}</section>
    <section className="card"><h2>The next two weeks</h2><p className="muted section-description">Weekly routine repeats. Opened sessions keep their saved plan.</p><ul className="training-list">{fortnight(date).map((d) => {
      const session = sessions.data.find((s) => s.diary_date === d), routine = resolveRoutine(routines, d);
      const rule = routine ? dayRule(routine, d) : null;
      return <li key={d}><div><strong>{readableDate(d)}</strong><p className="muted">{session ? activityLabels[session.kind] + " · " + statusLabels[session.status] : rule ? activityLabels[rule.kind] + (rule.minutes ? " · " + rule.minutes + " min" : "") + " · Planned" : "No routine"}</p></div><Link className="text-link" href={"/training?date=" + d}>View<span className="sr-only"> {readableDate(d)}</span> →</Link></li>;
    })}</ul></section>
    <p className="footnote">If movement causes pain or discomfort, pause and adapt your plan. Recording discomfort won’t automatically make the routine harder.</p>
  </Shell>;
}
