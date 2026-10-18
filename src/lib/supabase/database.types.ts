// Hand-authored contract for milestone 1. Regenerate from the applied database
// with the README command before accepting provider integration.
import type { Target } from "@/lib/targets";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Profile = {
  user_id: string;
  display_name: string;
  age: number;
  height_cm: number;
  starting_weight_estimate_kg: number;
  equation: "male" | "female";
  timezone: string;
  units: "metric";
  onboarded_at: string | null;
  updated_at: string;
};
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: { profiles: Table<Profile>; target_history: Table<Target & { request_id: string }> };
    Views: { [_ in never]: never };
    Functions: {
      complete_onboarding: { Args: { p_profile: Json; p_target: Json; p_request_id: string }; Returns: undefined };
      update_profile: { Args: { p_profile: Json }; Returns: undefined };
      schedule_target: { Args: { p_target: Json; p_effective_date: string; p_request_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
