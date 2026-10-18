import { addDays } from "@/lib/dates";
import type { DayRule, ExercisePlan, Routine } from "./types";
export const activityLabels = { strength: "Strength", walk: "Walk", easy: "Easy day", rest: "Rest / gentle movement" };
export const statusLabels = { planned: "Planned", in_progress: "In progress", completed: "Completed", skipped: "Skipped" };
export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const initialDays: DayRule[] = [
  { weekday: 1, kind: "strength", minutes: null }, { weekday: 2, kind: "walk", minutes: 20 },
  { weekday: 3, kind: "walk", minutes: 20 }, { weekday: 4, kind: "strength", minutes: null },
  { weekday: 5, kind: "easy", minutes: null }, { weekday: 6, kind: "walk", minutes: 25 }, { weekday: 7, kind: "rest", minutes: null },
];
export const initialExercises: ExercisePlan[] = [
  { key: "squat", name: "Chair squat", instructions: "Stand in front of a stable chair. Sit back with control, then stand through your feet. Use a comfortable range.", sets: 2, reps_min: 8, reps_max: 12, per_side: false, variation: "Chair squat" },
  { key: "pushup", name: "Incline push-up", instructions: "Use a stable wall or counter. Keep your body in a straight line, bend your elbows, and press away with control.", sets: 2, reps_min: 8, reps_max: 12, per_side: false, variation: "Wall push-up" },
  { key: "row", name: "Band / supported backpack row", instructions: "With a secure band or supported stance, draw your elbows back gently. Keep your torso steady and lower with control. If rowing one arm at a time, record reps for both sides.", sets: 2, reps_min: 8, reps_max: 12, per_side: false, variation: "Resistance-band row" },
  { key: "bridge", name: "Glute bridge", instructions: "Lie on your back with knees bent and feet flat. Lift your hips comfortably, pause, then lower with control.", sets: 2, reps_min: 10, reps_max: 15, per_side: false, variation: "Bodyweight glute bridge" },
  { key: "bird_dog", name: "Bird dog", instructions: "From hands and knees, reach an opposite arm and leg without twisting. Return with control and switch sides. Reps are recorded for each side separately.", sets: 2, reps_min: 6, reps_max: 6, per_side: true, variation: "Bird dog" },
];
export function dayRule(routine: Pick<Routine, "days">, date: string) {
  const day = new Date(date + "T12:00:00Z").getUTCDay() || 7;
  return routine.days.find((rule) => rule.weekday === day)!;
}
// Preserve PostgreSQL's sub-millisecond ordering for revisions saved together.
function fineTime(value: string) { return Number((value.match(/\.(\d+)/)?.[1] ?? "").slice(3).padEnd(6, "0")); }
export function resolveRoutine(routines: Routine[], date: string) {
  return routines.filter((r) => r.effective_date <= date).sort((a, b) => b.effective_date.localeCompare(a.effective_date) || (Date.parse(b.created_at) - Date.parse(a.created_at)) || fineTime(b.created_at) - fineTime(a.created_at) || b.id.localeCompare(a.id))[0] ?? null;
}
export function fortnight(today: string) { return Array.from({ length: 14 }, (_, i) => addDays(today, i)); }
export function remainingSeconds(deadline: string | null, now = Date.now()) { return deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : 0; }
