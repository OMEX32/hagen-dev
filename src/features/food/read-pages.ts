type ReadError = { code: string; message: string };
export const foodPageSize = 500;

// Supabase limits rows per response. Accumulate ordered pages so a larger
// diary/library cannot silently lose entries or understate nutrition totals.
export async function allFoodRows<T>(load: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: ReadError | null }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += foodPageSize) {
    const result = await load(start, start + foodPageSize - 1);
    if (result.error) return { data: null, error: result.error };
    rows.push(...result.data ?? []);
    if (!result.data || result.data.length < foodPageSize) return { data: rows, error: null };
  }
}
