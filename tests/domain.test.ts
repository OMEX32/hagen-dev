import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dateInTimezone, isDiaryDate } from "../src/lib/dates.ts";
import { foodTarget, resolveTarget } from "../src/lib/targets.ts";

test("Brussels diary day follows local midnight, rather than the UTC day", () => {
  assert.equal(dateInTimezone("Europe/Brussels", new Date("2026-10-18T22:30:00Z")), "2026-10-19");
  assert.equal(dateInTimezone("Europe/Brussels", new Date("2026-01-01T23:30:00Z")), "2026-01-02");
});

test("DST changes do not shift diary-date arithmetic", () => {
  assert.equal(dateInTimezone("Europe/Brussels", new Date("2026-03-29T01:30:00Z")), "2026-03-29");
  assert.equal(dateInTimezone("Europe/Brussels", new Date("2026-10-25T01:30:00Z")), "2026-10-25");
  assert.equal(addDays("2026-03-28", 1), "2026-03-29");
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
});

test("dates are validated strictly, including leap days and month rollover", () => {
  assert.equal(isDiaryDate("2026-02-29"), false);
  assert.equal(isDiaryDate("2028-02-29"), true);
  assert.equal(isDiaryDate("2026-04-31"), false);
  assert.equal(isDiaryDate("2026-2-01"), false);
  assert.equal(isDiaryDate(""), false);
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.throws(() => addDays("2026-02-29", 1));
});

test("future target updates preserve old dates even with unsorted history", () => {
  const history = [
    { effective_date: "2026-11-01", food: 2200 },
    { effective_date: "2026-10-18", food: 2100 },
    { effective_date: "2026-12-01", food: 2300 },
  ];
  const original = structuredClone(history);
  assert.equal(resolveTarget(history, "2026-10-17"), null);
  assert.equal(resolveTarget(history, "2026-10-18")?.food, 2100);
  assert.equal(resolveTarget(history, "2026-10-31")?.food, 2100);
  assert.equal(resolveTarget(history, "2026-11-01")?.food, 2200);
  assert.equal(resolveTarget(history, "2026-12-15")?.food, 2300);
  assert.equal(resolveTarget([], "2026-10-18"), null);
  assert.deepEqual(history, original);
});

test("manual targets are independent of the provisional requested deficit", () => {
  assert.equal(foodTarget(2600, 500), 2100);
  assert.equal(foodTarget(2600, 500, 2300), 2300);
  assert.equal(foodTarget(2600, 0), 2600);
  assert.throws(() => foodTarget(500, 500));
  assert.throws(() => foodTarget(Infinity, 500));
  assert.throws(() => foodTarget(2600, -500));
  assert.throws(() => foodTarget(2600, 500, NaN));
});
