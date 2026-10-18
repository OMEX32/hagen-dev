import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicConfig } from "@/lib/env";

export async function requireUser() {
  if (!publicConfig()) redirect("/setup");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Your profile could not be loaded. Check the database connection and migrations.");
  if (!profile?.onboarded_at) redirect("/onboarding");
  return { supabase, user, profile };
}
