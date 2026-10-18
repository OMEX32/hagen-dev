import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.HAGEN_ALLOW_TEST_WRITES !== "true") throw new Error("Set HAGEN_ALLOW_TEST_WRITES=true only for a disposable development/test project.");
const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Configure .env.test using .env.test.example. Never use production.");
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const a = client(), b = client(), anon = client();
for (const [label, db] of [["A", a], ["B", b]]) {
  const email = process.env[`TEST_USER_${label}_EMAIL`];
  const password = process.env[`TEST_USER_${label}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing disposable account ${label}.`);
  const { error } = await db.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  const existing = await db.from("profiles").select("*");
  assert.ifError(existing.error);
  assert.equal(existing.data.length, 0, "Use fresh disposable accounts; existing profiles will not be overwritten.");
}
const profile = { display_name: "Isolation test", age: 20, height_cm: 180, starting_weight_estimate_kg: 90, equation: "male", timezone: "Europe/Brussels" };
const target = { maintenance_kcal: 2600, deficit_kcal: 500, food_kcal: 2100, protein_g: 140, manual_override: false };
const idA = (await a.auth.getUser()).data.user.id;
const idB = (await b.auth.getUser()).data.user.id;

// A failing multi-row onboarding must leave no partial profile.
const failed = await b.rpc("complete_onboarding", { p_profile: profile, p_target: { ...target, food_kcal: -1 }, p_request_id: randomUUID() });
assert.ok(failed.error);
assert.equal((await b.from("profiles").select("*")).data.length, 0);
for (const db of [a, b]) {
  const result = await db.rpc("complete_onboarding", { p_profile: profile, p_target: target, p_request_id: randomUUID() });
  assert.ifError(result.error);
}
for (const [db, other] of [[a, idB], [b, idA]]) {
  for (const table of ["profiles", "target_history"]) {
    const read = await db.from(table).select("*").eq("user_id", other);
    assert.ifError(read.error);
    assert.deepEqual(read.data, []);
    assert.ok((await db.from(table).delete().eq("user_id", other)).error);
  }
  assert.ok((await db.from("profiles").update({ display_name: "intrusion" }).eq("user_id", other)).error);
  assert.ok((await db.from("target_history").update({ food_kcal: 999 }).eq("user_id", other)).error);
  assert.ok((await db.from("target_history").insert({ ...target, user_id: other, effective_date: "2099-01-01", request_id: randomUUID() })).error);
  // JSON owner injection is ignored; identity still comes from auth.uid().
  assert.ifError((await db.rpc("update_profile", { p_profile: { ...profile, user_id: other, display_name: "Own profile only" } })).error);
}
for (const table of ["profiles", "target_history"]) assert.ok((await anon.from(table).select("*")).error);
assert.ok((await anon.rpc("complete_onboarding", { p_profile: profile, p_target: target, p_request_id: randomUUID() })).error);
assert.equal((await a.from("profiles").select("*").single()).data.user_id, idA);
assert.equal((await b.from("profiles").select("*").single()).data.user_id, idB);

const today = (await a.from("target_history").select("*").single()).data.effective_date;
const date = new Date(`${today}T12:00:00Z`);
date.setUTCDate(date.getUTCDate() + 1);
const tomorrow = date.toISOString().slice(0, 10);
const firstRequest = randomUUID();
const write = (t, when, request) => a.rpc("schedule_target", { p_target: t, p_effective_date: when, p_request_id: request });
assert.ok((await write(target, today, randomUUID())).error);
assert.ifError((await write(target, tomorrow, firstRequest)).error);
const changed = { ...target, food_kcal: 2300, manual_override: true };
assert.ifError((await write(changed, tomorrow, randomUUID())).error);
assert.ifError((await write(target, tomorrow, firstRequest)).error);
const rows = await a.from("target_history").select("*").order("effective_date");
assert.ifError(rows.error);
assert.equal(rows.data.length, 2);
assert.equal(rows.data[0].food_kcal, 2100);
assert.equal(rows.data[1].food_kcal, 2300, "A delayed retry must not overwrite newer targets.");
await Promise.all([a.auth.signOut(), b.auth.signOut()]);
console.log("PASS: atomic onboarding, anonymous denial, two-account read/write isolation, owner injection, prospective targets, and retry safety.");
console.log("Test records remain only in the two disposable accounts; delete those accounts in Supabase after inspection.");
