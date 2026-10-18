import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { ManagedForm, Field } from "@/features/forms/managed-form";
import { requestPasswordReset } from "@/features/auth/actions";
import { publicConfig } from "@/lib/env";

export default function ForgotPassword() {
  if (!publicConfig()) redirect("/setup");
  return <AuthLayout title="Find your way back." description="We’ll send a link to reset your password.">
    <ManagedForm action={requestPasswordReset} submitLabel="Send reset link" pendingLabel="Requesting link…"><Field name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required /></ManagedForm>
    <Link className="text-link auth-link" href="/login">Back to sign in</Link>
  </AuthLayout>;
}
