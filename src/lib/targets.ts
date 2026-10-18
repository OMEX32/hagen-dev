export type Target = {
  id: string;
  user_id: string;
  effective_date: string;
  maintenance_kcal: number;
  deficit_kcal: number;
  food_kcal: number;
  protein_g: number;
  manual_override: boolean;
  created_at: string;
};

export function resolveTarget<T extends { effective_date: string }>(history: readonly T[], date: string): T | null {
  return history.reduce<T | null>((current, item) =>
    item.effective_date <= date && (!current || item.effective_date > current.effective_date) ? item : current, null);
}

export function foodTarget(maintenance: number, deficit: number, override?: number): number {
  if (![maintenance, deficit, ...(override === undefined ? [] : [override])].every(Number.isFinite)) {
    throw new Error("Targets must be finite numbers.");
  }
  const result = override ?? maintenance - deficit;
  if (maintenance <= 0 || deficit < 0 || result <= 0) throw new Error("Enter positive maintenance and food targets, and a non-negative deficit.");
  return result;
}
