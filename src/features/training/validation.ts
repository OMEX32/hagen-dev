import { z } from "zod";
import { isDiaryDate } from "@/lib/dates";
export const diaryDate = z.string().refine(isDiaryDate, "Choose a valid date.");
const nullableNumber = <T extends z.ZodType>(schema: T) => z.preprocess((v) => v === "" || v === null || v === undefined ? null : v, schema.nullable());
const optionalInt = nullableNumber(z.coerce.number().int().min(0).max(1000));
const text = z.string().trim().max(2000);
export const exercisePlanSchema = z.object({ key: z.string().regex(/^[a-z_]{1,40}$/), name: z.string().trim().min(1).max(120), instructions: z.string().trim().min(1).max(2000), sets: z.coerce.number().int().min(1).max(6), reps_min: z.coerce.number().int().min(1).max(100), reps_max: z.coerce.number().int().min(1).max(100), per_side: z.boolean(), variation: z.string().trim().min(1).max(120) }).refine((v) => v.reps_max >= v.reps_min, "Maximum reps must be at least minimum reps.");
export const routineSchema = z.object({ effective_date: diaryDate, days: z.array(z.object({ weekday: z.number().int().min(1).max(7), kind: z.enum(["strength", "walk", "easy", "rest"]), minutes: nullableNumber(z.coerce.number().int().min(1).max(300)) }).refine((v) => v.kind === "walk" ? v.minutes !== null : v.minutes === null, "Walking needs planned minutes.")).length(7).refine((v) => new Set(v.map((d) => d.weekday)).size === 7), exercises: z.array(exercisePlanSchema).min(1).max(12).refine((v) => new Set(v.map((e) => e.key)).size === v.length) });
export const setSchema = z.object({ position: z.number().int().min(1).max(6), reps: optionalInt, reps_other: optionalInt, weight_kg: nullableNumber(z.coerce.number().min(0).max(1000)), completed: z.boolean() }).refine((v) => !v.completed || v.reps !== null, "Completed sets need actual repetitions.");
export const performanceSchema = z.object({ id: z.uuid(), revision: z.coerce.number().int().min(0), variation: z.string().trim().min(1).max(120), resistance: z.string().trim().max(120), per_side: z.boolean(), sets: z.array(setSchema).min(1).max(6) }).superRefine((value, ctx) => {
  value.sets.forEach((set, i) => {
    if (value.per_side && set.completed && set.reps_other === null) ctx.addIssue({ code: "custom", path: ["sets", i, "reps_other"], message: "Completed per-side sets need repetitions on both sides." });
  });
});
export const notesSchema = z.object({ id: z.uuid(), revision: z.coerce.number().int().min(0), notes: text, discomfort: text, effort: nullableNumber(z.coerce.number().int().min(1).max(10)) });
export const cardioSchema = z.object({ id: z.uuid().optional(), revision: z.coerce.number().int().min(0), diary_date: diaryDate, session_id: z.uuid().nullable(), kind: z.enum(["walk", "jog"]), minutes: z.coerce.number().positive().max(1440), distance_km: nullableNumber(z.coerce.number().min(0).max(500)), effort: nullableNumber(z.coerce.number().int().min(1).max(10)), notes: text, discomfort: text });
