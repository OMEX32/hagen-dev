import { AuthLayout } from "@/components/auth-layout";
import { ManagedForm, Field } from "@/features/forms/managed-form";
import { updatePassword } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
export default async function UpdatePassword() {
  await requireUser();
  return <AuthLayout title="A fresh password." description="Choose a password with at least 10 characters.">
    <ManagedForm action={updatePassword} submitLabel="Update password"><Field name="password" label="New password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /><Field name="confirmation" label="Confirm password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></ManagedForm>
  </AuthLayout>;
}
