/**
 * Type definitions for Create Plan view
 */

import type { FieldErrors } from "react-hook-form";
import type { UserPreferencesDto } from "@/types";

/**
 * Client-side form data type
 * Matches CreatePlanDto structure but kept separate for potential UI-specific fields
 */
export interface CreatePlanFormData {
  destination_text: string;
  date_start: string; // ISO date string YYYY-MM-DD
  date_end: string; // ISO date string YYYY-MM-DD
  note_text: string;
  people_count: number;
  trip_type: "leisure" | "business";
  comfort: "relax" | "balanced" | "intense";
  budget: "budget" | "moderate" | "luxury";
  transport_modes: ("car" | "walk" | "public")[] | null;
}

/**
 * View model for the entire Create Plan view state
 */
export interface CreatePlanViewModel {
  userPreferences: UserPreferencesDto | null;
  isLoadingPreferences: boolean;
  planCount: number;
  isLoadingPlanCount: boolean;
  planLimit: number; // constant: 10
  isCreatingPlan: boolean;
  canCreatePlan: boolean; // derived: planCount < planLimit
  formErrors: FieldErrors<CreatePlanFormData>;
}
