import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/features/auth/session";
import { getSessionDetail } from "@/features/training/data";
import { TrainingMigrationNotice } from "@/features/training/activity-card";
import { CardioForm, DeleteCardioForm, ExerciseForm, SessionNotesForm, StateForm } from "@/features/training/forms";
import { RestTimer } from "@/features/training/timer";
import { activityLabels, statusLabels } from "@/features/training/domain";
import { dateInTimezone, readableDate } from "@/lib/dates";
import type { SessionExercise, WorkoutSet } from "@/features/training/types";
function Performance({ exercise, sets }: { exercise: SessionExercise; sets: WorkoutSet[] }) {
  return <><p>{exercise.variation}{exercise.resistance ? " · " + exercise.resistance : ""}{exercise.per_side ? " · Reps per side" : ""}</p><ul>{sets.map((set) => <li key={set.id}>Set {set.position}: {set.reps ?? "—"}{exercise.per_side ? " / " + (set.reps_other ?? "—") + " reps by side" : " reps"}{set.weight_kg !== null ? " · " + set.weight_kg + " kg" : ""} · {set.completed ? "Done" : "Unfinished"}</li>)}</ul></>;
}
export default async function SessionPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { supabase, profile } = await requireProfile(), id = (await searchParams).id;
  if (!z.uuid().safeParse(id).success) notFound();
  const detail = await getSessionDetail(supabase, profile.user_id, id!);
  if (!detail) return <Shell training><TrainingMigrationNotice /></Shell>;
  if (!detail.session) notFound();
  const s = detail.session, active = s.status === "in_progress", closed = s.status === "completed" || s.status === "skipped";
  const incomplete = detail.sets.filter((set) => !set.completed).length;
  return <Shell training><Link href={"/training?date=" + s.diary_date} className="text-link">← Training</Link><div className="page-heading"><p className="eyebrow">{readableDate(s.diary_date)}</p><h1>{activityLabels[s.kind]}</h1><p className="muted">{statusLabels[s.status]}{s.planned_minutes ? " · " + s.planned_minutes + " min planned" : ""}</p></div>
    {s.kind === "strength" && <section className="card"><h2>A comfortable start</h2><p className="muted">Warm up gently for five minutes. Keep two or three repetitions in reserve; you can start with one set. Suggested rest: 60–90 seconds.</p><p className="muted">Save each exercise before leaving. Saved reps and set status are kept after refresh. Unsent input stays in this tab for retry until you save it.</p></section>}
    {s.status === "planned" && <section className="card"><StateForm session={s} status="in_progress" label="Start activity" /></section>}
    {closed && <section className="card"><h2>{s.status === "completed" ? "Activity completed" : "Activity skipped"}</h2><p className="muted section-description">Saved records are shown below. Reopen explicitly to make changes.</p><StateForm session={s} status="in_progress" label="Reopen activity" confirmation="Reopen this activity for editing" /></section>}
    {active && s.kind === "strength" && <RestTimer id={s.id} deadline={s.rest_deadline} />}
    {detail.exercises.map((e) => {
      const previous = detail.previous.find((p) => p.exercise_key === e.exercise_key), sets = detail.sets.filter((set) => set.exercise_id === e.id);
      return <section className="card" key={e.id}><p className="eyebrow">Exercise {e.position}</p><h2>{e.prescription.name}</h2><p className="prescription">{e.prescription.sets} × {e.prescription.reps_min}–{e.prescription.reps_max}{e.prescription.per_side ? " per side" : ""} planned</p><p className="muted section-description">{e.prescription.instructions}</p>
        <details className="previous-performance"><summary>Previous completed strength session{detail.previousDate ? " · " + readableDate(detail.previousDate) : ""}</summary>{previous ? <Performance exercise={previous} sets={detail.previousSets.filter((set) => set.exercise_id === previous.id)} /> : <p className="muted">No performance for this exercise in the previous completed strength session.</p>}</details>
        {active ? <ExerciseForm exercise={e} sets={sets} userId={profile.user_id} /> : <Performance exercise={e} sets={sets} />}
      </section>;
    })}
    {s.kind === "walk" && <section className="card"><h2>Actual movement</h2><p className="muted section-description">Record actual duration before completing the activity. No GPS or calorie-burn estimate.</p>{active ? <CardioForm date={s.diary_date} today={dateInTimezone(profile.timezone)} userId={profile.user_id} log={detail.cardio} session={s} /> : detail.cardio ? <><p>{detail.cardio.kind === "walk" ? "Walk" : "Jog"} · {detail.cardio.minutes} min{detail.cardio.distance_km === null ? "" : " · " + detail.cardio.distance_km + " km"}</p><p>Effort: {detail.cardio.effort ?? "Not recorded"}</p><p className="preserve-lines">{detail.cardio.notes || "No movement notes."}</p><p className="preserve-lines">Discomfort: {detail.cardio.discomfort || "Not recorded"}</p></> : <p className="muted">No actual movement recorded.</p>}{active && detail.cardio && <details><summary>Delete this movement record</summary><DeleteCardioForm log={detail.cardio} /></details>}</section>}
    <section className="card"><h2>Session notes</h2>{active ? <SessionNotesForm session={s} /> : <><p>Effort: {s.effort ?? "Not recorded"}</p><p className="preserve-lines">{s.notes || "No session notes."}</p><p className="preserve-lines">Discomfort: {s.discomfort || "Not recorded"}</p></>}</section>
    {!closed && <section className="card"><h2>Finish or skip</h2><p className="muted section-description">Save any unsent input first. Finishing does not save other forms or check off unfinished sets.{s.kind === "strength" ? " " + incomplete + " sets remain unfinished." : ""}</p>
      {(active || s.kind === "rest" || s.kind === "easy") && <StateForm session={s} status="completed" label="Complete activity" confirmation="Finish this activity; leave any unfinished sets as unfinished" />}
      <details className="section-description"><summary>Skip this activity</summary><p className="muted">Existing saved sets and notes stay recorded.</p><StateForm session={s} status="skipped" label="Skip activity" confirmation="Mark this activity skipped" /></details>
    </section>}
  </Shell>;
}
