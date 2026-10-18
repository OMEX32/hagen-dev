"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireUser } from "@/features/auth/session";
import { profileSchema, targetSchema, targetFromForm, dateSchema, requestSchema } from "./validation";
import { dateInTimezone } from "@/lib/dates";
import type { FormResult } from "@/features/forms/types";

export async function completeOnboarding(data: FormData): Promise<FormResult> {
  const schema = profileSchema.extend({ ...targetSchema.shape, confirmed: z.literal("on", { error: "Confirm these starting assumptions before continuing." }), request_id: requestSchema });
  const parsed = schema.safeParse(targetFromForm(data));
  const target = targetSchema.safeParse(targetFromForm(data));
  if (!parsed.success) return { error: "Check the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  if (!target.success) return { error: "Check your targets.", fields: z.flattenError(target.error).fieldErrors };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_profile: profileSchema.parse(parsed.data), p_target: target.data, p_request_id: parsed.data.request_id,
  });
  if (error) return { error: "Your setup wasn’t saved. Check your connection and that the foundation migration has been applied, then retry." };
  revalidatePath("/", "layout");
  redirect("/today");
}

export async function saveProfile(data: FormData): Promise<FormResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: "Check the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const { supabase } = await requireProfile();
  const { error } = await supabase.rpc("update_profile", { p_profile: parsed.data });
  if (error) return { error: "Your profile wasn’t saved. Check your connection and try again." };
  revalidatePath("/", "layout");
  return { message: "Profile saved. Your daily targets haven’t changed." };
}

export async function saveTarget(data: FormData): Promise<FormResult> {
  const parsed = targetSchema.safeParse(targetFromForm(data));
  const date = dateSchema.safeParse(data.get("effective_date"));
  const request = requestSchema.safeParse(data.get("request_id"));
  if (!parsed.success) return { error: "Check your targets.", fields: z.flattenError(parsed.error).fieldErrors };
  if (!date.success) return { fields: { effective_date: ["Choose a valid date."] }, error: "Check the start date." };
  if (!request.success) return { error: "Reload this page before saving." };
  const { supabase, profile } = await requireProfile();
  if (date.data <= dateInTimezone(profile.timezone)) return { fields: { effective_date: ["Choose tomorrow or a later date to preserve your history."] }, error: "Choose a future start date." };
  const { error } = await supabase.rpc("schedule_target", { p_target: parsed.data, p_effective_date: date.data, p_request_id: request.data });
  if (error) return { error: "Your targets weren’t saved. Check your connection and start date, then retry." };
  revalidatePath("/", "layout");
  return { message: `Targets saved from ${date.data}. Earlier days keep their previous targets.` };
}
