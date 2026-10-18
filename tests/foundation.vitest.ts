import { describe, expect, it } from "vitest";
import { profileSchema, targetSchema } from "../src/features/profile/validation";
import { resolveTarget } from "../src/lib/targets";
import { dateInTimezone } from "../src/lib/dates";

const target = { maintenance_kcal: "2600", deficit_kcal: "500", food_kcal: "2100", protein_g: "140", manual_override: false };
describe("foundation form boundaries", () => {
  it("accepts label-derived numbers, zero deficit and zero protein", () => {
    expect(targetSchema.parse(target).food_kcal).toBe(2100);
    expect(targetSchema.safeParse({ ...target, deficit_kcal: "0", food_kcal: "2600", protein_g: "0" }).success).toBe(true);
  });
  it.each(["", " ", "NaN", "Infinity", "-1", "abc"])("rejects invalid food target %s", (value) => {
    expect(targetSchema.safeParse({ ...target, food_kcal: value, manual_override: true }).success).toBe(false);
  });
  it("requires explicit override for a target that differs from the estimate", () => {
    expect(targetSchema.safeParse({ ...target, food_kcal: "2300" }).success).toBe(false);
    expect(targetSchema.safeParse({ ...target, food_kcal: "2300", manual_override: true }).success).toBe(true);
  });
  it("validates profile inputs and timezone", () => {
    const profile = { display_name: "Omex", age: "20", height_cm: "180", starting_weight_estimate_kg: "90", equation: "male", timezone: "Europe/Brussels" };
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, timezone: "Brussels/Invalid" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, age: "20.5" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, display_name: " " }).success).toBe(false);
  });
});
it("selects the historical target at local midnight", () => {
  const day = dateInTimezone("Europe/Brussels", new Date("2026-10-18T22:30:00Z"));
  expect(resolveTarget([{ effective_date: "2026-10-18", food: 2100 }, { effective_date: "2026-10-19", food: 2200 }], day)?.food).toBe(2200);
});
