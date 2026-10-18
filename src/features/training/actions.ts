"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/features/auth/session";
import type { FormResult } from "@/features/forms/types";
import type { Json } from "@/lib/supabase/database.types";
import { cardioSchema, diaryDate, notesSchema, performanceSchema, routineSchema } from "./validation";

async function write(action: string, payload: Json, form: FormData) {
  const request = z.uuid().safeParse(form.get("request_id"));
  if (!request.success) return { error: "Reload this form before saving." };
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc("training_write", { p_action: action, p_data: payload, p_request_id: request.data });
  if (error) {
    if (["PGRST202", "PGRST205", "42P01"].includes(error.code)) return { error: "Training needs its database update. Apply 202610180003_training.sql, then retry." };
    if (error.code === "40001" || error.message.includes("Earlier request already saved")) return { error: "This record changed or an earlier attempt already saved. Reload to review the saved record before retrying. Your tab draft is retained." };
    // Only return our controlled validation messages, never raw database details.
    const messages = ["Routine edits start tomorrow or later", "Open today or an earlier day", "Save a routine for this date first", "Start or reopen the session first", "Completed sets need actual reps on each recorded side", "Log actual activity today or earlier", "Start or reopen this walking session first", "Reopen the walking session first", "Start strength training first", "Confirm reopening this session", "Start and confirm this session first", "Save actual walking duration before completing"];
    const known = messages.find((message) => error.message === message);
    return { error: known ? known + "." : "Your change wasn’t saved. Check your connection and try again. Your entries are still here." };
  }
  revalidatePath("/today"); revalidatePath("/training", "layout");
  return { id: data };
}
const bad = (error: z.ZodError): FormResult => ({ error: error.issues[0]?.message ?? "Check the entered values." });
const base = z.object({ id: z.uuid(), revision: z.coerce.number().int().min(0) });

export async function openSession(form: FormData): Promise<FormResult> {
  const parsed = diaryDate.safeParse(form.get("diary_date"));
  if (!parsed.success) return bad(parsed.error);
  const result = await write("open", { diary_date: parsed.data }, form);
  if (result.error) return result;
  redirect("/training/session?id=" + result.id);
}
export async function saveRoutine(form: FormData): Promise<FormResult> {
  const count = Number(form.get("exercise_count"));
  if (!Number.isInteger(count) || count < 1 || count > 12) return { error: "Choose 1–12 exercises." };
  const days = Array.from({ length: 7 }, (_, i) => {
    const kind = form.get("day." + i + ".kind");
    return { weekday: i + 1, kind, minutes: kind === "walk" ? form.get("day." + i + ".minutes") : null };
  });
  const exercises = Array.from({ length: count }, (_, i) => {
    const get = (name: string) => form.get("exercise." + i + "." + name);
    return { key: get("key"), name: get("name"), instructions: get("instructions"), sets: get("sets"), reps_min: get("reps_min"), reps_max: get("reps_max"), per_side: get("per_side") === "on", variation: get("variation") };
  });
  const parsed = routineSchema.safeParse({ effective_date: form.get("effective_date"), days, exercises });
  if (!parsed.success) return bad(parsed.error);
  const result = await write("save_routine", parsed.data, form);
  return result.error ? result : { message: "Routine saved. Existing sessions stay unchanged." };
}
export async function saveExercise(form: FormData): Promise<FormResult> {
  const count = Number(form.get("set_count"));
  if (!Number.isInteger(count) || count < 1 || count > 6) return { error: "Invalid set count. Reload this session." };
  const sets = Array.from({ length: count }, (_, i) => {
    const get = (name: string) => form.get("set." + i + "." + name);
    return { position: i + 1, reps: get("reps"), reps_other: get("reps_other"), weight_kg: get("weight_kg"), completed: get("completed") === "on" };
  });
  const parsed = performanceSchema.safeParse({ ...Object.fromEntries(form), per_side: form.get("per_side") === "on", sets });
  if (!parsed.success) return bad(parsed.error);
  if (parsed.data.per_side && parsed.data.sets.some((s) => s.completed && s.reps_other === null)) return { error: "Completed per-side sets need actual repetitions on both sides." };
  const result = await write("save_exercise", parsed.data, form);
  return result.error ? result : { message: "Exercise saved." };
}
export async function saveSessionNotes(form: FormData): Promise<FormResult> {
  const parsed = notesSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return bad(parsed.error);
  const result = await write("notes", parsed.data, form);
  return result.error ? result : { message: "Session notes saved." };
}
export async function changeSessionState(form: FormData): Promise<FormResult> {
  const parsed = base.extend({ status: z.enum(["in_progress", "completed", "skipped"]), confirmed: z.boolean() }).safeParse({ ...Object.fromEntries(form), confirmed: form.get("confirmed") === "on" });
  if (!parsed.success) return bad(parsed.error);
  const result = await write("state", parsed.data, form);
  return result.error ? result : { message: "Activity status saved." };
}
export async function setRestTimer(form: FormData): Promise<FormResult> {
  const parsed = z.object({ id: z.uuid(), seconds: z.coerce.number().pipe(z.union([z.literal(0), z.literal(60), z.literal(90)])) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return bad(parsed.error);
  const result = await write("timer", parsed.data, form);
  return result.error ? result : { message: "Rest timer saved." };
}
export async function saveCardio(form: FormData): Promise<FormResult> {
  const parsed = cardioSchema.safeParse({ ...Object.fromEntries(form), id: form.get("id") || undefined, session_id: form.get("session_id") || null });
  if (!parsed.success) return bad(parsed.error);
  const result = await write("save_cardio", parsed.data, form);
  return result.error ? result : { message: "Activity saved." };
}
export async function deleteCardio(form: FormData): Promise<FormResult> {
  const parsed = base.extend({ confirmed: z.literal(true, { error: "Confirm deletion first." }) }).safeParse({ ...Object.fromEntries(form), confirmed: form.get("confirmed") === "on" });
  if (!parsed.success) return bad(parsed.error);
  const result = await write("delete_cardio", parsed.data, form);
  return result.error ? result : { message: "Activity deleted." };
}
