import type { Target } from "@/lib/targets";
import type { FoodLog } from "./types";
import { nutritionSummary, formatNutrition } from "./nutrition";

export function NutritionCard({ entries, completed, target }: { entries: FoodLog[]; completed: boolean; target: Target | null }) {
  const summary = nutritionSummary(entries, completed, target);
  return <section className="plan-card" aria-label="Daily nutrition summary">
    <div className="card-top"><p className="eyebrow">{completed ? "Your complete food diary" : "Logged so far"}</p><span className="pill">{completed ? "Complete" : "Incomplete"}</span></div>
    <div className="target-pair"><div><strong>{summary.known ? formatNutrition(summary.kcal) : "—"}</strong><span>kcal logged{target ? ` / ${formatNutrition(target.food_kcal)} target` : ""}</span></div><div><strong>{summary.known ? formatNutrition(summary.protein_g) : "—"}<small> g</small></strong><span>protein{target ? ` / ${formatNutrition(target.protein_g)} g target` : ""}</span></div></div>
    {summary.known && target ? <div className="remaining-grid"><p><strong>{formatNutrition(Math.abs(summary.remainingKcal!))} kcal</strong><span>{summary.remainingKcal! < 0 ? "over food target" : "remaining to food target"}</span></p><p><strong>{formatNutrition(Math.abs(summary.remainingProtein!))} g</strong><span>{summary.remainingProtein! < 0 ? "over protein target" : "remaining to protein target"}</span></p></div> : <p className="plan-note">{summary.known ? "No target was set for this date." : "No food logged yet. Intake is unknown until you log food or confirm this diary is complete."}</p>}
    {!completed && summary.known && <p className="field-help">These totals reflect entries so far. Unlogged food isn’t included.</p>}
    <p className="field-help">Targets are provisional estimates. Exercise calories aren’t added to your food allowance.</p>
  </section>;
}
