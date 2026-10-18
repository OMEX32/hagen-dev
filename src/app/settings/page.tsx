import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Shell } from "@/components/shell";
import { ManagedForm } from "@/features/forms/managed-form";
import { ProfileFields } from "@/features/profile/profile-fields";
import { TargetForm } from "@/features/profile/target-form";
import { saveProfile } from "@/features/profile/actions";
import { signOut } from "@/features/auth/actions";
import { requireProfile } from "@/features/auth/session";
import { addDays, dateInTimezone } from "@/lib/dates";
import { resolveTarget } from "@/lib/targets";

export default async function Settings() {
  const { supabase, profile, user } = await requireProfile();
  const { data: history, error } = await supabase.from("target_history").select("*").eq("user_id", user.id).order("effective_date", { ascending: false });
  if (error) throw new Error("Cannot load target history.");
  const today = dateInTimezone(profile.timezone);
  const target = resolveTarget(history ?? [], today);
  return <Shell settings>
    <div className="page-heading"><p className="eyebrow">Make it yours</p><h1>Settings.</h1><p className="muted">A plan that fits where you are.</p></div>
    <section className="card"><div className="section-heading"><h2>Your profile</h2><span className="pill">Metric units</span></div><ManagedForm action={saveProfile} submitLabel="Save profile"><ProfileFields profile={profile} /></ManagedForm></section>
    <section className="card"><h2>Future targets</h2><p className="muted section-description">Changes start tomorrow or later. Previous days keep their targets, so your history stays meaningful.</p><TargetForm target={target} tomorrow={addDays(today, 1)} requestId={randomUUID()} /></section>
    <section className="card"><h2>Target history</h2><p className="field-help section-description">The latest target on or before a diary date applies to that day.</p><ul className="history-list">{history?.map((item) => <li key={item.id}><div><strong>From {item.effective_date}</strong><span>{item.effective_date > today ? "Scheduled" : item.id === target?.id ? "Current" : "Earlier target"}{item.manual_override ? " · manual override" : ""}</span></div><div><strong>{item.food_kcal.toLocaleString("en-GB")} kcal</strong><span>{item.protein_g} g protein</span></div></li>)}</ul></section>
    <section className="card"><h2>Exercise schedule</h2><p className="muted section-description">Edit your weekly activities and strength prescription. Changes apply prospectively.</p><Link className="text-link" href="/training/routine">Edit future routine →</Link></section>
    <section className="card"><h2>Your account</h2><p className="muted account-email">{user.email}</p><ManagedForm action={signOut} submitLabel="Sign out" pendingLabel="Signing out…" className="signout-form" /></section>
  </Shell>;
}
