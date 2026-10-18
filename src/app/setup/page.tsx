import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { publicConfig } from "@/lib/env";

export default function SetupPage() {
  const configured = !!publicConfig();
  return <AuthLayout title={configured ? "Connection configured." : "Let’s give Hagen a home."} description="A fresh start for your personal fitness diary.">
    <span className="pill">Foundation · setup</span>
    <h2>{configured ? "Ready to check sign-in" : "Connect your private database"}</h2>
    <p className="muted">{configured ? "Supabase environment values are present. Sign in to verify the connection and applied migrations." : "Hagen needs a Supabase project before it can create your account or save your profile."}</p>
    <ol className="setup-steps">
      <li><strong>Create a development project.</strong><span>Start with Supabase through Vercel Marketplace. The README has the steps for a new account and project.</span></li>
      <li><strong>Add the connection values.</strong><span>Copy .env.example to .env.local and fill in the project URL, publishable key, and app URL.</span></li>
      <li><strong>Apply the foundation migration.</strong><span>Run the SQL file in supabase/migrations, configure auth redirects, and restart the app.</span></li>
    </ol>
    <p className="notice">No account or health records have been created by this setup screen.</p>
    {configured && <Link className="button primary" href="/login">Continue to sign in <span aria-hidden="true">→</span></Link>}
  </AuthLayout>;
}
