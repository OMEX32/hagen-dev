import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { allRows } from "@/lib/read-pages";
export const needsTrainingMigration = (error: { code: string } | null) => !!error && ["42P01", "PGRST205", "PGRST202"].includes(error.code);
export async function getTrainingDay(db: SupabaseClient<Database>, user: string, date: string) {
  const [routines, session, cardio] = await Promise.all([
    db.from("training_routines").select("*").eq("user_id", user).lte("effective_date", date).order("effective_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1),
    db.from("training_sessions").select("*").eq("user_id", user).eq("diary_date", date).maybeSingle(),
    allRows((start, end) => db.from("cardio_logs").select("*").eq("user_id", user).eq("diary_date", date).order("created_at").order("id").range(start, end)),
  ]);
  if ([routines, session, cardio].some((r) => needsTrainingMigration(r.error))) return null;
  if (routines.error || session.error || cardio.error) throw new Error("Training could not be loaded. Please retry.");
  return { routine: routines.data?.[0] ?? null, session: session.data, cardio: cardio.data ?? [] };
}
export async function getSessionDetail(db: SupabaseClient<Database>, user: string, id: string) {
  const session = await db.from("training_sessions").select("*").eq("user_id", user).eq("id", id).maybeSingle();
  if (needsTrainingMigration(session.error)) return null;
  if (session.error) throw new Error("Session could not be loaded.");
  if (!session.data) return { session: null };
  const [exercises, cardio, previousSession] = await Promise.all([
    db.from("session_exercises").select("*").eq("user_id", user).eq("session_id", id).order("position"),
    db.from("cardio_logs").select("*").eq("user_id", user).eq("session_id", id).maybeSingle(),
    db.from("training_sessions").select("*").eq("user_id", user).eq("kind", "strength").eq("status", "completed").lt("diary_date", session.data.diary_date).order("diary_date", { ascending: false }).limit(1),
  ]);
  if (exercises.error || cardio.error || previousSession.error) throw new Error("Session records could not be loaded.");
  const actualSets = exercises.data.length ? await db.from("workout_sets").select("*").eq("user_id", user).in("exercise_id", exercises.data.map((e) => e.id)).order("position") : { data: [], error: null };
  const prevId = previousSession.data[0]?.id;
  const previous = prevId ? await db.from("session_exercises").select("*").eq("user_id", user).eq("session_id", prevId).order("position") : { data: [], error: null };
  const previousSets = previous.data?.length ? await db.from("workout_sets").select("*").eq("user_id", user).in("exercise_id", previous.data.map((e) => e.id)).order("position") : { data: [], error: null };
  if (actualSets.error || previous.error || previousSets.error) throw new Error("Set records could not be loaded.");
  return { session: session.data, exercises: exercises.data, sets: actualSets.data ?? [], cardio: cardio.data, previous: previous.data ?? [], previousSets: previousSets.data ?? [], previousDate: previousSession.data[0]?.diary_date };
}
