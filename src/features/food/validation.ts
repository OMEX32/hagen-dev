import { z } from "zod";
import { isDiaryDate } from "@/lib/dates";
import { categories, preparations } from "./types";

const amount = (min = 0) => z.preprocess((value) => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number({ error: "Enter a valid number." }).finite().min(min).max(1_000_000)
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001, "Use up to 3 decimal places."));
const quantityAmount = z.preprocess((value) => typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  z.number({ error: "Enter a valid quantity." }).finite().min(0.000001).max(1000000000)
    .refine((value) => Math.abs(value * 1000000 - Math.round(value * 1000000)) < 0.001, "Use up to 6 decimal places."));
export const diaryDate = z.string().refine(isDiaryDate, "Choose a valid date.");
export const categorySchema = z.enum(categories);
export const snapshotSchema = z.object({
  name: z.string().trim().min(1, "Enter a food or meal name.").max(120),
  basis: z.enum(["total", "per_100g", "per_serving"]),
  basis_kcal: amount(), basis_protein: amount(), quantity: quantityAmount,
  serving_description: z.string().trim().max(100).default(""),
  preparation: z.enum(preparations).default("unspecified"), notes: z.string().trim().max(2000).default(""),
}).superRefine((value, ctx) => {
  if (value.basis === "per_serving" && !value.serving_description) ctx.addIssue({ code: "custom", path: ["serving_description"], message: "Describe one serving, for example one pot (150 g)." });
  if (value.basis === "total" && value.quantity !== 1) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Total nutrition describes the whole entry; quantity must be 1." });
});
export const logSchema = snapshotSchema.safeExtend({ diary_date: diaryDate, category: categorySchema, id: z.uuid().optional() });
export const foodSchema = snapshotSchema.safeExtend({ id: z.uuid().optional() }).refine((value) => value.basis !== "total", { path: ["basis"], message: "Reusable foods need per-100-g or per-serving nutrition." });
export const mealSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(1).max(120), items: z.array(snapshotSchema).min(1, "Add at least one meal item.").max(50) });
export const logFoodSchema = z.object({ id: z.uuid(), diary_date: diaryDate, category: categorySchema, quantity: amount(0.001), notes: z.string().trim().max(2000).default("") });
export const logMealSchema = z.object({ id: z.uuid(), diary_date: diaryDate, category: categorySchema, multiplier: amount(0.001).pipe(z.number().max(1000)) });
export const copyCategorySchema = z.object({ source_date: diaryDate, diary_date: diaryDate, category: categorySchema });
export const deleteSchema = z.object({ id: z.uuid() });
export const diarySchema = z.object({ diary_date: diaryDate, complete: z.boolean(), confirmed: z.boolean() }).refine((value) => !value.complete || value.confirmed, { path: ["confirmed"], message: "Confirm that your food diary is complete." });

export function snapshotFromForm(data: FormData, prefix = "") {
  const get = (name: string) => data.get(`${prefix}${name}`);
  return { name: get("name"), basis: get("basis"), basis_kcal: get("basis_kcal"), basis_protein: get("basis_protein"), quantity: get("quantity"), serving_description: get("serving_description") ?? "", preparation: get("preparation") ?? "unspecified", notes: get("notes") ?? "" };
}
