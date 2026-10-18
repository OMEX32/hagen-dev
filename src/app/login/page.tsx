import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { ManagedForm, Field } from "@/features/forms/managed-form";
import { authenticate } from "@/features/auth/actions";
import { publicConfig } from "@/lib/env";
import { ClearFoodDrafts } from "@/features/food/drafts";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (!publicConfig()) redirect("/setup");
  const params = await searchParams;
  const signup = params.mode === "signup";
  return <AuthLayout title={signup ? "Make room for progress." : "Welcome back."} description={signup ? "Create your private space for a steadier routine." : "Pick up where you left off, one day at a time."}>
    <ClearFoodDrafts />
    {params.error && <p className="notice error" role="alert">That link is invalid or expired. Sign in or request a new reset link.</p>}
    <ManagedForm key={signup ? "signup" : "login"} action={authenticate} submitLabel={signup ? "Create account" : "Sign in"} pendingLabel={signup ? "Creating account…" : "Signing in…"}>
      <input type="hidden" name="mode" value={signup ? "signup" : "login"} />
      <Field name="email" label="Email address" type="email" inputMode="email" autoComplete="email" maxLength={254} required />
      <Field name="password" label="Password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 10 : 1} maxLength={128} help={signup ? "At least 10 characters." : undefined} required />
    </ManagedForm>
    {!signup && <Link className="text-link auth-link" href="/forgot-password">Forgot your password?</Link>}
    <div className="auth-switch">{signup ? "Already have an account?" : "New to Hagen?"} <Link className="text-link" href={signup ? "/login" : "/login?mode=signup"}>{signup ? "Sign in" : "Create an account"}</Link></div>
  </AuthLayout>;
}
