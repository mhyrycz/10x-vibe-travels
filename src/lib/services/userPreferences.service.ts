/**
 * User Preferences Service
 *
 * Handles business logic for user travel preferences including
 * creation, retrieval, and updates during onboarding flow.
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { CreateUserPreferencesDto, UserPreferencesDto } from "../../types";
import { logPreferencesCompleted } from "./events.service";

/**
 * Zod schema for validating user preferences creation request
 * Mirrors the CreateUserPreferencesDto type with runtime validation
 */
export const createUserPreferencesSchema = z.object({
  people_count: z.number().int().min(1).max(20),
  trip_type: z.enum(["leisure", "business"]),
  age: z.number().int().min(13).max(120),
  country: z.string().min(2).max(120),
  comfort: z.enum(["relax", "balanced", "intense"]),
  budget: z.enum(["budget", "moderate", "luxury"]),
});

/**
 * Service result type for standardized error handling
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * Creates user travel preferences in the database
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the authenticated user from JWT token
 * @param data - Validated user preferences data
 * @returns ServiceResult containing either the created preferences or an error
 *
 * Business Logic:
 * 1. Check if preferences already exist for this user (409 Conflict)
 * 2. Insert new preferences record with user_id
 * 3. Log 'preferences_completed' event (fire-and-forget)
 * 4. Return the created record
 */
export async function createUserPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: CreateUserPreferencesDto
): Promise<ServiceResult<UserPreferencesDto>> {
  try {
    // Step 1: Check for existing preferences (conflict check)
    const { data: existingPreferences, error: selectError } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows returned (expected when preferences don't exist)
      console.error("Error checking existing preferences:", selectError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check existing preferences",
        },
      };
    }

    if (existingPreferences) {
      return {
        success: false,
        error: {
          code: "CONFLICT",
          message: "User preferences already exist. Use PATCH to update.",
        },
      };
    }

    // Step 2: Insert new preferences record
    const { data: newPreferences, error: insertError } = await supabase
      .from("user_preferences")
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting user preferences:", insertError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create user preferences",
        },
      };
    }

    // Step 3: Log 'preferences_completed' event (fire-and-forget)
    // Don't await - errors should not block the response
    logPreferencesCompleted(supabase, userId);

    // Step 4: Return the created record
    return {
      success: true,
      data: newPreferences,
    };
  } catch (error) {
    console.error("Unexpected error in createUserPreferences:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }
}
