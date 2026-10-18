import Link from "next/link";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/features/auth/session";
import { addDays, dateInTimezone, isDiaryDate, readableDate } from "@/lib/dates";
import { resolveTarget } from "@/lib/targets";

export default async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const today = dateInTimezone(profile.timezone);
  const requested = (await searchParams).date;
  const date = requested && isDiaryDate(requested) ? requested : today;
  const { data: history, error } = await supabase.from("target_history").select("*").eq("user_id", profile.user_id).order("effective_date");
  if (error) throw new Error("Cannot load targets. Please try again.");
  const target = resolveTarget(history ?? [], date);
  return <Shell>
    <div className="page-heading"><p className="eyebrow">Your own pace</p><h1>{date === today ? `Hello, ${profile.display_name}.` : "One day at a time."}</h1><p className="muted">Small steps. A steadier routine.</p></div>
    <div className="date-bar"><Link className="icon-button" href={`/today?date=${addDays(date, -1)}`} aria-label="Previous day">←</Link><div><strong>{readableDate(date)}</strong><span>{date === today ? "Today" : <Link href="/today" className="text-link">Back to today</Link>}</span></div><Link className="icon-button" href={`/today?date=${addDays(date, 1)}`} aria-label="Next day">→</Link></div>
    <section className="plan-card" aria-labelledby="plan-title"><div className="card-top"><p className="eyebrow" id="plan-title">Your daily starting plan</p><span className="pill">Provisional</span></div>
      {target ? <><div className="target-pair"><div><strong>{target.food_kcal.toLocaleString("en-GB")}</strong><span>kcal · food target</span></div><div><strong>{target.protein_g.toLocaleString("en-GB")}<small> g</small></strong><span>protein target</span></div></div><p className="plan-note">{target.manual_override ? "Manual food target" : `${target.maintenance_kcal.toLocaleString("en-GB")} kcal estimated maintenance − ${target.deficit_kcal.toLocaleString("en-GB")} kcal requested deficit`}</p></> : <p>No target was set for this day.</p>}
      <Link href="/settings" className="text-link">Review your targets <span aria-hidden="true">↗</span></Link>
    </section>
    <section className="card empty-card"><span className="small-symbol" aria-hidden="true">↗</span><h2>Your foundation is in place.</h2><p className="muted">Your account, profile, and starting targets are saved. Food logging comes next, followed by training and progress.</p><div className="empty-status"><span aria-hidden="true" />Food diary unavailable · intake is unknown</div><p className="field-help">There are no intake totals or calorie-remaining estimates yet.</p></section>
    <p className="footnote">Your day follows {profile.timezone}. Targets are estimates and won’t change automatically.</p>
  </Shell>;
}
