import { Field, SelectField, TextArea } from "./fields";
import { TrainingForm } from "./form";
import { saveRoutine, saveExercise, saveSessionNotes, saveCardio, deleteCardio, changeSessionState } from "./actions";
import { initialDays, initialExercises, weekdays, activityLabels } from "./domain";
import type { Routine, SessionExercise, WorkoutSet, TrainingSession, CardioLog, SessionStatus } from "./types";
function RequestForm(props: Omit<Parameters<typeof TrainingForm>[0], "requestId">) { return <TrainingForm {...props} requestId={crypto.randomUUID()} />; }
function Check({ name, children, checked = false }: { name: string; children: React.ReactNode; checked?: boolean }) { return <label className="checkbox-field"><input type="checkbox" name={name} defaultChecked={checked} />{children}</label>; }
function NotesFields({ notes = "", discomfort = "", effort = null }: { notes?: string; discomfort?: string; effort?: number | null }) {
  return <><Field name="effort" label="Effort, 1–10 (optional)" type="number" min="1" max="10" step="1" defaultValue={effort ?? ""} help="1 = very easy, 10 = maximal effort." /><TextArea label="Notes (optional)" name="notes" maxLength={2000} defaultValue={notes} rows={3} /><TextArea label="Pain or discomfort (optional)" name="discomfort" maxLength={2000} defaultValue={discomfort} rows={2} /></>;
}
export function RoutineForm({ routine, earliest, userId }: { routine: Routine | null; earliest: string; userId: string }) {
  const days = routine?.days ?? initialDays, exercises = routine?.exercises ?? initialExercises;
  return <RequestForm action={saveRoutine} submitLabel="Save routine" draftKey={userId + ":routine"} after="/training">
    <Field name="effective_date" label="Applies from" type="date" min={earliest} defaultValue={earliest} required help={routine ? "Changes start tomorrow or later. Opened sessions keep their prescription." : "Your first routine can begin today."} />
    <h2>Your week</h2><p className="muted">Repeat this week for the first two weeks. Saturday starts at 25 minutes; choose up to 30 if comfortable. Easy and rest days have no required workout.</p>
    {weekdays.map((day, i) => <div className="routine-day" key={day}><h3>{day}</h3><SelectField name={"day." + i + ".kind"} label={day + " activity"} defaultValue={days.find((d) => d.weekday === i + 1)?.kind}>{Object.entries(activityLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</SelectField><Field name={"day." + i + ".minutes"} label={day + " walking minutes"} type="number" min="1" max="300" step="1" defaultValue={days.find((d) => d.weekday === i + 1)?.minutes ?? 20} help="Used only when this day is a walk." /></div>)}
    <h2>Strength routine</h2><p className="muted">Warm up gently for five minutes. Keep two or three reps in reserve. You can start with one set; rest 60–90 seconds between sets. Prescriptions don’t increase automatically.</p>
    <input type="hidden" name="exercise_count" value={exercises.length} />
    {exercises.map((e, i) => <section className="routine-day" key={e.key}>
      <input type="hidden" name={"exercise." + i + ".key"} value={e.key} />
      <Field name={"exercise." + i + ".name"} label={"Exercise " + (i + 1)} defaultValue={e.name} maxLength={120} required />
      <TextArea label="Technique instructions" name={"exercise." + i + ".instructions"} defaultValue={e.instructions} maxLength={2000} rows={3} required />
      <div className="form-grid three"><Field name={"exercise." + i + ".sets"} label="Sets" type="number" min="1" max="6" step="1" defaultValue={e.sets} required /><Field name={"exercise." + i + ".reps_min"} label="Minimum reps" type="number" min="1" max="100" step="1" defaultValue={e.reps_min} required /><Field name={"exercise." + i + ".reps_max"} label="Maximum reps" type="number" min="1" max="100" step="1" defaultValue={e.reps_max} required /></div>
      <Field name={"exercise." + i + ".variation"} label="Starting variation" defaultValue={e.variation} maxLength={120} required /><Check name={"exercise." + i + ".per_side"} checked={e.per_side}>Reps are per side (record both sides)</Check>
    </section>)}
  </RequestForm>;
}
export function ExerciseForm({ exercise: e, sets, userId }: { exercise: SessionExercise; sets: WorkoutSet[]; userId: string }) {
  return <RequestForm key={e.revision} action={saveExercise} submitLabel="Save exercise" draftKey={userId + ":exercise:" + e.id}>
    <input type="hidden" name="id" value={e.id} /><input type="hidden" name="revision" value={e.revision} /><input type="hidden" name="set_count" value={sets.length} />
    <Field name="variation" label="Variation performed" defaultValue={e.variation} maxLength={120} required help="For example: wall push-up, counter push-up, band row, supported backpack row." />
    <Field name="resistance" label="Resistance description (optional)" defaultValue={e.resistance} maxLength={120} help="For example: light band or bodyweight. Enter additional weight per set below." />
    <Check name="per_side" checked={e.per_side}>This variation uses reps per side</Check><p className="field-help">For per-side movements, enter first and other side separately. Otherwise leave other side blank. Blank means unknown; zero means zero reps.</p>
    {sets.map((set, i) => <div className="set-row" key={set.id}><h3>Set {set.position}</h3><div className="form-grid"><Field name={"set." + i + ".reps"} label="Reps / first side" type="number" min="0" max="1000" step="1" defaultValue={set.reps ?? ""} /><Field name={"set." + i + ".reps_other"} label="Other side reps" type="number" min="0" max="1000" step="1" defaultValue={set.reps_other ?? ""} /><Field name={"set." + i + ".weight_kg"} label="Weight, kg (optional)" type="number" min="0" max="1000" step="any" defaultValue={set.weight_kg ?? ""} /></div><Check name={"set." + i + ".completed"} checked={set.completed}>I completed this set</Check></div>)}
  </RequestForm>;
}
export function SessionNotesForm({ session: s }: { session: TrainingSession }) {
  return <RequestForm key={s.revision} action={saveSessionNotes} submitLabel="Save session notes" draftKey={s.user_id + ":notes:" + s.id}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="revision" value={s.revision} /><NotesFields {...s} /></RequestForm>;
}
export function StateForm({ session: s, status, label, confirmation }: { session: TrainingSession; status: Exclude<SessionStatus, "planned">; label: string; confirmation?: string }) {
  return <RequestForm key={s.revision + status} action={changeSessionState} submitLabel={label} draftKey={s.user_id + ":state:" + s.id + ":" + status}>
    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="revision" value={s.revision} /><input type="hidden" name="status" value={status} />{confirmation && <Check name="confirmed">{confirmation}</Check>}
  </RequestForm>;
}
export function CardioForm({ date, today, userId, log, session }: { date: string; today: string; userId: string; log?: CardioLog | null; session?: TrainingSession }) {
  return <RequestForm key={log?.revision ?? "new"} action={saveCardio} submitLabel={log ? "Save activity changes" : "Save activity"} draftKey={userId + ":cardio:" + (log?.id ?? session?.id ?? date)} after={session ? undefined : "/training?date=" + date}>
    {log && <input type="hidden" name="id" value={log.id} />}<input type="hidden" name="revision" value={log?.revision ?? 0} /><input type="hidden" name="session_id" value={session?.id ?? log?.session_id ?? ""} />
    {session ? <input type="hidden" name="diary_date" value={date} /> : <Field name="diary_date" label="Activity date" type="date" max={today} defaultValue={date} required />}
    <SelectField name="kind" label="Activity" defaultValue={log?.kind ?? "walk"}><option value="walk">Walking</option><option value="jog">Jogging</option></SelectField>
    <div className="form-grid"><Field name="minutes" label="Actual duration, minutes" type="number" min="0.01" max="1440" step="any" defaultValue={log?.minutes ?? ""} required /><Field name="distance_km" label="Distance, km (optional)" type="number" min="0" max="500" step="any" defaultValue={log?.distance_km ?? ""} /></div><NotesFields notes={log?.notes} effort={log?.effort} discomfort={log?.discomfort} />
  </RequestForm>;
}
export function DeleteCardioForm({ log }: { log: CardioLog }) {
  return <RequestForm action={deleteCardio} submitLabel="Delete activity" draftKey={log.user_id + ":delete-cardio:" + log.id} after={"/training?date=" + log.diary_date}><input type="hidden" name="id" value={log.id} /><input type="hidden" name="revision" value={log.revision} /><Check name="confirmed">Delete this activity permanently</Check></RequestForm>;
}
