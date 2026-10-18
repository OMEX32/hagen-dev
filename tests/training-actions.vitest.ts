import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), requireProfile: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/features/auth/session", () => ({ requireProfile: mocks.requireProfile }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("REDIRECT:" + url); } }));
import { saveCardio, saveExercise, openSession } from "@/features/training/actions";
const request = "00000000-0000-4000-8000-000000000001";
function form(values: Record<string, string>) { const f = new FormData(); f.set("request_id", request); Object.entries(values).forEach(([k, v]) => f.set(k, v)); return f; }
const activity = () => form({ diary_date: "2026-10-18", kind: "walk", minutes: "20", distance_km: "", effort: "", notes: "", discomfort: "", revision: "0", user_id: "another-account" });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireProfile.mockResolvedValue({ supabase: { rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ data: request, error: null });
});
it("normalizes unknown optional movement values and discards submitted owner IDs", async () => {
  expect(await saveCardio(activity())).toEqual({ message: "Activity saved." });
  const [name, args] = mocks.rpc.mock.calls[0];
  expect(name).toBe("training_write");
  expect(args).toMatchObject({ p_action: "save_cardio", p_request_id: request, p_data: { minutes: 20, session_id: null, distance_km: null, effort: null } });
  expect(args.p_data).not.toHaveProperty("user_id");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/today");
});
it("rejects invalid performance and request identities before making database writes", async () => {
  expect(await saveExercise(form({ set_count: "0" }))).toHaveProperty("error");
  const data = activity(); data.delete("request_id");
  expect(await saveCardio(data)).toHaveProperty("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("reports a missing migration without false success or invalidating saved views", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "provider details" } });
  expect(await saveCardio(activity())).toEqual({ error: "Training needs its database update. Apply 202610180003_training.sql, then retry." });
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
});
it("reports conflicting revisions without returning a success message", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "Record changed; reload before saving" } });
  const result = await saveCardio(activity());
  expect(result.error).toContain("record changed"); expect(result.message).toBeUndefined();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
});
it("keeps raw database details private on a failed save", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "private unique key detail" } });
  const result = await saveCardio(activity());
  expect(result.error).toContain("Your entries are still here");
  expect(result.error).not.toContain("private unique key");
  expect(result.message).toBeUndefined();
});
it("lets expired-session guards reach the framework instead of claiming a save", async () => {
  mocks.requireProfile.mockRejectedValue(new Error("REDIRECT:/login"));
  await expect(saveCardio(activity())).rejects.toThrow("REDIRECT:/login");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("opens the database-returned owned session only after a successful write", async () => {
  await expect(openSession(form({ diary_date: "2026-10-18" }))).rejects.toThrow("REDIRECT:/training/session?id=" + request);
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "08006", message: "connection failure" } });
  expect(await openSession(form({ diary_date: "2026-10-18" }))).toHaveProperty("error");
});
