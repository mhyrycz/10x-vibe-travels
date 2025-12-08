/**
 * User Preferences Service
 *
 * Handles business logic for user travel preferences including
 * creation, retrieval, and updates during onboarding flow.
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { CreateUserPreferencesDto, UpdateUserPreferencesDto, UserPreferencesDto } from "../../types";
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
 * Zod schema for validating partial user preferences updates
 * All fields are optional - validates only the fields provided in the request
 */
export const updateUserPreferencesSchema = createUserPreferencesSchema.partial();

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

/**
 * Retrieves user travel preferences from the database
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the authenticated user
 * @returns ServiceResult containing either the user preferences or an error
 *
 * Business Logic:
 * 1. Query user_preferences table for the user's record
 * 2. Return preferences if found
 * 3. Return 404 error if preferences don't exist (user hasn't completed onboarding)
 */
export async function getUserPreferences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ServiceResult<UserPreferencesDto>> {
  try {
    // Step 1: Query user preferences by user_id
    const { data: preferences, error: selectError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Step 2: Handle query errors
    if (selectError) {
      // PGRST116 = no rows returned (user hasn't completed onboarding)
      if (selectError.code === "PGRST116") {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User preferences not found. Please complete onboarding.",
          },
        };
      }

      // Other database errors
      console.error("Error retrieving user preferences:", selectError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve user preferences",
        },
      };
    }

    // Step 3: Return the preferences
    return {
      success: true,
      data: preferences,
    };
  } catch (error) {
    console.error("Unexpected error in getUserPreferences:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }
}

/**
 * Updates existing user travel preferences with partial data
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the authenticated user from JWT token
 * @param data - Partial preferences data to update (validated by Zod schema)
 * @returns ServiceResult containing either the updated preferences or an error
 *
 * Business Logic:
 * 1. Check if preferences exist for this user (404 Not Found if missing)
 * 2. Update only the provided fields in the preferences record
 * 3. Return the complete updated record
 * 4. No event logging (only initial creation is tracked)
 *
 * Error Codes:
 * - NOT_FOUND: User preferences don't exist
 * - INTERNAL_ERROR: Unexpected database error
 */
export async function updateUserPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: UpdateUserPreferencesDto
): Promise<ServiceResult<UserPreferencesDto>> {
  try {
    // Step 1: Retrieve existing preferences (also serves as existence check)
    const { data: existing, error: fetchError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      // PGRST116 = no rows returned (preferences don't exist)
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User preferences not found. Please complete onboarding first.",
          },
        };
      }

      // Other database errors
      console.error("Error fetching user preferences:", fetchError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check user preferences",
        },
      };
    }

    // Step 2: If no fields to update, return existing preferences
    // This handles the empty body {} case without hitting the database
    if (Object.keys(data).length === 0) {
      return {
        success: true,
        data: existing,
      };
    }

    // Step 3: Update only the provided fields
    const { data: updated, error: updateError } = await supabase
      .from("user_preferences")
      .update(data)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user preferences:", updateError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update user preferences",
        },
      };
    }

    // Step 4: Return the complete updated record
    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Unexpected error in updateUserPreferences:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }
}
