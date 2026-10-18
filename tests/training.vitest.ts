import { describe, expect, it } from "vitest";
import { activityLabels, dayRule, fortnight, initialDays, initialExercises, remainingSeconds, resolveRoutine } from "@/features/training/domain";
import { cardioSchema, performanceSchema, routineSchema, notesSchema, setSchema } from "@/features/training/validation";
import type { Routine } from "@/features/training/types";
const routine = { effective_date: "2026-10-18", days: initialDays, exercises: initialExercises };
const version = (date: string, created: string, id = "a"): Routine => ({ ...routine, effective_date: date, id, user_id: "user", created_at: created });
describe("training prescription and date resolution", () => {
  it("retains the requested beginner week and exercise doses", () => {
    expect(initialDays.map((d) => activityLabels[d.kind])).toEqual(["Strength", "Walk", "Walk", "Strength", "Easy day", "Walk", "Rest / gentle movement"]);
    expect(initialDays.filter((d) => d.kind === "walk").map((d) => d.minutes)).toEqual([20, 20, 25]);
    expect(initialExercises.map((e) => [e.sets, e.reps_min, e.reps_max])).toEqual([[2,8,12], [2,8,12], [2,8,12], [2,10,15], [2,6,6]]);
    expect(initialExercises.at(-1)?.per_side).toBe(true);
    expect(routineSchema.safeParse(routine).success).toBe(true);
  });
  it("maps weekdays independently of local timezone, including Sunday", () => {
    expect(dayRule(routine, "2026-10-18").kind).toBe("rest");
    expect(dayRule(routine, "2026-10-19").kind).toBe("strength");
    expect(dayRule(routine, "2026-10-24").minutes).toBe(25);
  });
  it("spans two weeks over a month boundary without changing wall date", () => {
    const dates = fortnight("2026-10-25");
    expect(dates).toHaveLength(14); expect(dates.at(-1)).toBe("2026-11-07");
    expect(dates.map((d) => dayRule(routine, d))).toEqual([...initialDays.slice(6), ...initialDays, ...initialDays.slice(0,6)]);
  });
  it("uses the latest effective revision, preserving prior dates", () => {
    const older = version("2026-10-18", "2026-10-18T10:00:00Z");
    const newer = version("2026-10-20", "2026-10-18T11:00:00Z");
    const replacement = version("2026-10-20", "2026-10-18T12:00:00Z");
    expect(resolveRoutine([replacement, older, newer], "2026-10-17")).toBeNull();
    expect(resolveRoutine([replacement, older, newer], "2026-10-19")).toBe(older);
    expect(resolveRoutine([older, replacement, newer], "2026-10-20")).toBe(replacement);
  });
  it("matches database ordering for revisions within one millisecond", () => {
    const a = version("2026-10-20", "2026-10-18T10:00:00.000001+00:00", "z");
    const b = version("2026-10-20", "2026-10-18T10:00:00.000002+00:00", "a");
    const c = version("2026-10-20", "2026-10-18T10:00:00+00:00", "z");
    expect(resolveRoutine([a, c, b], "2026-10-20")).toBe(b);
  });
  it("rejects duplicate weekdays, missing walking minutes and inverted reps", () => {
    expect(routineSchema.safeParse({ ...routine, days: initialDays.map(() => initialDays[0]) }).success).toBe(false);
    expect(routineSchema.safeParse({ ...routine, days: initialDays.map((d) => ({ ...d, minutes: null })) }).success).toBe(false);
    expect(routineSchema.safeParse({ ...routine, exercises: [{ ...initialExercises[0], reps_max: 4 }] }).success).toBe(false);
  });
  it("allows a one-set starting prescription and rejects invalid or duplicate exercises", () => {
    expect(routineSchema.safeParse({ ...routine, exercises: [{ ...initialExercises[0], sets: 1 }] }).success).toBe(true);
    expect(routineSchema.safeParse({ ...routine, exercises: [{ ...initialExercises[0], sets: 0 }] }).success).toBe(false);
    expect(routineSchema.safeParse({ ...routine, exercises: [initialExercises[0], initialExercises[0]] }).success).toBe(false);
  });
});
describe("timestamp rest timer", () => {
  const start = Date.parse("2026-10-18T10:00:00Z");
  const deadline = "2026-10-18T10:01:30Z";
  it("calculates remaining time after interruption rather than counting ticks", () => {
    expect(remainingSeconds(deadline, start)).toBe(90);
    expect(remainingSeconds(deadline, start + 73500)).toBe(17);
    expect(remainingSeconds(deadline, start + 90000)).toBe(0);
    expect(remainingSeconds(deadline, start + 900000)).toBe(0);
    expect(remainingSeconds(null, start)).toBe(0);
  });
});
describe("actual performance validation", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const set = { position: 1, reps: "", reps_other: "", weight_kg: "", completed: false };
  it("retains unknown reps as null and never checks off a partial set", () => {
    expect(setSchema.parse(set)).toEqual({ ...set, reps: null, reps_other: null, weight_kg: null });
    expect(setSchema.parse({ ...set, reps: 8 }).completed).toBe(false);
    expect(setSchema.safeParse({ ...set, completed: true }).success).toBe(false);
  });
  it("accepts explicitly recorded zero while rejecting invalid reps or weight", () => {
    expect(setSchema.parse({ ...set, reps: "0", weight_kg: "0", completed: true }).reps).toBe(0);
    for (const reps of [-1, 2.5, 1001, "NaN"]) expect(setSchema.safeParse({ ...set, reps }).success).toBe(false);
    expect(setSchema.safeParse({ ...set, weight_kg: -1 }).success).toBe(false);
  });
  it("requires a variation and a revision for optimistic concurrency", () => {
    const exercise = { id, revision: 0, variation: "Counter push-up", resistance: "", per_side: false, sets: [set] };
    expect(performanceSchema.safeParse(exercise).success).toBe(true);
    expect(performanceSchema.safeParse({ ...exercise, variation: " " }).success).toBe(false);
    expect(performanceSchema.safeParse({ ...exercise, revision: -1 }).success).toBe(false);
  });
  it("requires both sides only for explicitly completed per-side sets", () => {
    const exercise = { id, revision: 0, variation: "Bird dog", resistance: "", per_side: true, sets: [{ ...set, reps: 6, completed: true }] };
    expect(performanceSchema.safeParse(exercise).success).toBe(false);
    expect(performanceSchema.safeParse({ ...exercise, sets: [{ ...exercise.sets[0], reps_other: 6 }] }).success).toBe(true);
    expect(performanceSchema.safeParse({ ...exercise, sets: [{ ...exercise.sets[0], completed: false }] }).success).toBe(true);
  });
  it("validates optional effort, discomfort and actual cardio without inventing distance", () => {
    const cardio = { revision: 0, diary_date: "2026-10-18", session_id: null, kind: "walk", minutes: "20", distance_km: "", effort: "", notes: "", discomfort: "Knee felt uncomfortable" };
    expect(cardioSchema.parse(cardio)).toMatchObject({ minutes: 20, distance_km: null, effort: null, discomfort: "Knee felt uncomfortable" });
    expect(cardioSchema.safeParse({ ...cardio, minutes: 0 }).success).toBe(false);
    expect(cardioSchema.safeParse({ ...cardio, diary_date: "2026-02-30" }).success).toBe(false);
    expect(cardioSchema.safeParse({ ...cardio, effort: 11 }).success).toBe(false);
    expect(notesSchema.safeParse({ id, revision: 0, notes: "", discomfort: "", effort: 1 }).success).toBe(true);
  });
});
