export function FoodMigrationNotice() {
  return <section className="card"><h2>Food logging needs one database update.</h2><p className="muted section-description">Your existing profile and targets are ready. Apply the new food migration in your Supabase SQL Editor, then refresh this page.</p><code className="migration-filename">202610180002_food.sql</code><p className="field-help">The file is in the project’s supabase/migrations folder. Run this new migration once; keep the existing foundation tables.</p></section>;
}
