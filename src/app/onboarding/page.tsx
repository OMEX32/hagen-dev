import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { ManagedForm } from "@/features/forms/managed-form";
import { ProfileFields } from "@/features/profile/profile-fields";
import { TargetFields } from "@/features/profile/target-fields";
import { completeOnboarding } from "@/features/profile/actions";
import { requireUser } from "@/features/auth/session";

export default async function Onboarding() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Cannot load profile. Apply the foundation migration and retry.");
  if (profile?.onboarded_at) redirect("/today");
  return <AuthLayout title="Start where you are." description="Check your starting assumptions. You can edit them in Settings whenever you need.">
    <ManagedForm action={completeOnboarding} submitLabel="Save my starting plan">
      <input type="hidden" name="request_id" value={randomUUID()} />
      <div className="section-label"><span>01</span><h2>A little about you</h2></div>
      <ProfileFields />
      <div className="section-label"><span>02</span><h2>Your starting targets</h2></div>
      <TargetFields />
      <label className="check-label"><input type="checkbox" name="confirmed" required />I’ve checked these inputs and understand that the targets are provisional estimates.</label>
    </ManagedForm>
  </AuthLayout>;
}
