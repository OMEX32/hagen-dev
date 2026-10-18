import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // Only known destinations; no redirect target can escape this application.
  const next = request.nextUrl.searchParams.get("next") === "/update-password" ? "/update-password" : "/today";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, appOrigin()));
  }
  return NextResponse.redirect(new URL("/login?error=link", appOrigin()));
}
