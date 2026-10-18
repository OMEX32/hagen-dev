"use client";
import { Field, SelectField } from "@/features/forms/managed-form";
import type { Profile } from "@/lib/supabase/database.types";

export function ProfileFields({ profile }: { profile?: Profile }) {
  return <>
    <Field name="display_name" label="What should we call you?" autoComplete="given-name" maxLength={60} defaultValue={profile?.display_name ?? ""} required />
    <div className="field-grid">
      <Field name="age" label="Age" type="number" inputMode="numeric" min={18} max={120} step={1} defaultValue={profile?.age ?? 20} required />
      <Field name="height_cm" label="Height (cm)" type="number" inputMode="decimal" min={80} max={250} step="0.01" defaultValue={profile?.height_cm ?? 180} required />
    </div>
    <Field name="starting_weight_estimate_kg" label="Estimated starting weight (kg)" type="number" inputMode="decimal" min={20} max={500} step="0.01" defaultValue={profile?.starting_weight_estimate_kg ?? 90} help="A starting assumption only. This won’t create a weigh-in." required />
    <SelectField name="equation" label="Equation used in the earlier estimate" defaultValue={profile?.equation ?? "male"}>
      <option value="male">Male equation</option><option value="female">Female equation</option>
    </SelectField>
    <p className="field-help">These inputs describe your starting assumptions. Changing them won’t automatically recalculate your targets.</p>
    <Field name="timezone" label="Timezone" defaultValue={profile?.timezone ?? "Europe/Brussels"} list="timezones" autoComplete="off" required />
    <datalist id="timezones"><option value="Europe/Brussels" /><option value="Europe/London" /><option value="Europe/Paris" /><option value="Asia/Baghdad" /><option value="UTC" /></datalist>
    <p className="field-help">Your diary follows this timezone. Units: kcal, g, kg, cm, km, minutes.</p>
  </>;
}
