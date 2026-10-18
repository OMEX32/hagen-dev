import { z } from "zod";
import { isDiaryDate } from "@/lib/dates";

const number = (label: string, min: number, max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number({ error: `Enter ${label.toLowerCase()}.` }).finite().min(min).max(max),
);

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Enter a name.").max(60),
  age: number("Age", 18, 120).pipe(z.number().int()),
  height_cm: number("Height", 80, 250),
  starting_weight_estimate_kg: number("Estimated starting weight", 20, 500),
  equation: z.enum(["male", "female"]),
  timezone: z.string().min(1).max(100).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
  }, "Enter a valid timezone, such as Europe/Brussels."),
});

export const targetSchema = z.object({
  maintenance_kcal: number("Maintenance estimate", 1, 100000),
  deficit_kcal: number("Requested deficit", 0, 100000),
  food_kcal: number("Food target", 1, 100000),
  protein_g: number("Protein target", 0, 10000),
  manual_override: z.boolean(),
}).superRefine((value, ctx) => {
  if (!value.manual_override && Math.abs(value.food_kcal - (value.maintenance_kcal - value.deficit_kcal)) > 0.001) {
    ctx.addIssue({ code: "custom", path: ["food_kcal"], message: "Choose manual override or use maintenance minus requested deficit." });
  }
});

export const dateSchema = z.string().refine(isDiaryDate, "Choose a valid date.");
export const requestSchema = z.uuid();
export function targetFromForm(data: FormData) {
  return { ...Object.fromEntries(data), manual_override: data.get("manual_override") === "on" };
}
