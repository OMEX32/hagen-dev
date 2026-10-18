type ReadError = { code: string; message: string };
export const pageSize = 500;

// Supabase limits rows per response. Accumulate ordered pages so a larger
// collection cannot silently lose entries.
export async function allRows<T>(load: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: ReadError | null }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const result = await load(start, start + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    rows.push(...result.data ?? []);
    if (!result.data || result.data.length < pageSize) return { data: rows, error: null };
  }
}
