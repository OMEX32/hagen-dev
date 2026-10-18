// Hand-authored contract for milestones 1–3. Regenerate from the applied database
// with the README command before accepting provider integration.
import type { Target } from "@/lib/targets";
import type { FoodLog, SavedFood, SavedMeal, SavedMealItem, DiaryDay } from "@/features/food/types";

import type { Routine, TrainingSession, SessionExercise, WorkoutSet, CardioLog } from "@/features/training/types";

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
    Tables: {
      profiles: Table<Profile>; target_history: Table<Target & { request_id: string }>;
      food_logs: Table<FoodLog>; saved_foods: Table<SavedFood>; saved_meals: Table<SavedMeal>;
      saved_meal_items: Table<SavedMealItem>; food_diary_days: Table<DiaryDay>;
      training_routines: Table<Routine>; training_sessions: Table<TrainingSession>; session_exercises: Table<SessionExercise>;
      workout_sets: Table<WorkoutSet>; cardio_logs: Table<CardioLog>;
    };
    Views: { [_ in never]: never };
    Functions: {
      complete_onboarding: { Args: { p_profile: Json; p_target: Json; p_request_id: string }; Returns: undefined };
      update_profile: { Args: { p_profile: Json }; Returns: undefined };
      schedule_target: { Args: { p_target: Json; p_effective_date: string; p_request_id: string }; Returns: undefined };
      training_write: { Args: { p_action: string; p_data: Json; p_request_id: string }; Returns: string };
      food_write: { Args: { p_action: string; p_data: Json; p_request_id: string }; Returns: string | null };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
