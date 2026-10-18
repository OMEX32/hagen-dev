"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, publicConfig } from "@/lib/env";
import { requireUser } from "./session";
import type { FormResult } from "@/features/forms/types";

const emailSchema = z.email("Enter a valid email address.").max(254);
const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(128, "Use at most 128 characters.");

export async function authenticate(data: FormData): Promise<FormResult> {
  if (!publicConfig()) return { error: "Connect Supabase first. Open the setup page for instructions." };
  const mode = data.get("mode");
  const schema = z.object({ email: emailSchema, password: mode === "signup" ? passwordSchema : z.string().min(1, "Enter your password.").max(128) });
  const parsed = schema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: "Check the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const supabase = await createClient();
  if (mode === "signup") {
    const { data: result, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${appOrigin()}/auth/callback` } });
    if (error) return { error: "Couldn’t create the account. Try again shortly or sign in if you already registered." };
    if (!result.session) return { message: "Check your email to confirm your account, then return to sign in." };
  } else {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Couldn’t sign in. Check your email and password, confirm your email, or request a reset." };
  }
  redirect("/today");
}

export async function requestPasswordReset(data: FormData): Promise<FormResult> {
  const parsed = z.object({ email: emailSchema }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return { fields: z.flattenError(parsed.error).fieldErrors, error: "Check your email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${appOrigin()}/auth/callback?next=/update-password` });
  if (error) return { error: "Couldn’t request a reset. Wait a moment and try again." };
  return { message: "If that address has an account, a reset link is on its way. Open it in this browser." };
}

export async function updatePassword(data: FormData): Promise<FormResult> {
  const schema = z.object({ password: passwordSchema, confirmation: z.string() }).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "The passwords don’t match." });
  const parsed = schema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { fields: z.flattenError(parsed.error).fieldErrors, error: "Check the highlighted fields." };
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Couldn’t change the password. Request a fresh reset link and try again." };
  redirect("/today");
}

export async function signOut(): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { error: "Couldn’t sign out. Check your connection and try again." };
  redirect("/login");
}
