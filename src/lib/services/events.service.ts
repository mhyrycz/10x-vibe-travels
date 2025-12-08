/**
 * Events Service
 *
 * Handles analytics event logging for tracking user actions and platform activity.
 * All event logging is fire-and-forget to avoid blocking primary operations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { CreateEventDto } from "../../types";

/**
 * Logs an analytics event to the events table
 *
 * This function operates in a fire-and-forget manner - failures are logged
 * but do not throw errors or block the calling operation.
 *
 * @param supabase - Authenticated Supabase client instance
 * @param eventData - Event data conforming to CreateEventDto
 *
 * @example
 * ```typescript
 * // Log preferences_completed event
 * logEvent(supabase, {
 *   user_id: userId,
 *   event_type: 'preferences_completed',
 *   plan_id: null,
 *   destination_text: null,
 *   transport_modes: null,
 *   trip_length_days: null,
 * });
 * ```
 */
export async function logEvent(supabase: SupabaseClient<Database>, eventData: CreateEventDto): Promise<void> {
  try {
    const { error } = await supabase.from("events").insert(eventData);

    if (error) {
      console.error("Failed to log event:", {
        eventType: eventData.event_type,
        error,
      });
    }
  } catch (error) {
    console.error("Unexpected error logging event:", {
      eventType: eventData.event_type,
      error,
    });
  }
}

/**
 * Helper function to log 'preferences_completed' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the user who completed preferences
 */
export async function logPreferencesCompleted(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "preferences_completed",
    plan_id: null,
    destination_text: null,
    transport_modes: null,
    trip_length_days: null,
  });
}

/**
 * Helper function to log 'plan_generated' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the user who generated the plan
 * @param planId - ID of the newly generated plan
 * @param destinationText - Destination of the trip
 * @param transportModes - Selected transport modes
 * @param tripLengthDays - Length of the trip in days
 */
export async function logPlanGenerated(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  destinationText: string,
  transportModes: Database["public"]["Enums"]["transport_mode_enum"][] | null,
  tripLengthDays: number
): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "plan_generated",
    plan_id: planId,
    destination_text: destinationText,
    transport_modes: transportModes,
    trip_length_days: tripLengthDays,
  });
}

/**
 * Helper function to log 'plan_regenerated' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the user who regenerated the plan
 * @param planId - ID of the regenerated plan
 * @param destinationText - Destination of the trip
 * @param transportModes - Selected transport modes
 * @param tripLengthDays - Length of the trip in days
 */
export async function logPlanRegenerated(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  destinationText: string,
  transportModes: Database["public"]["Enums"]["transport_mode_enum"][] | null,
  tripLengthDays: number
): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "plan_regenerated",
    plan_id: planId,
    destination_text: destinationText,
    transport_modes: transportModes,
    trip_length_days: tripLengthDays,
  });
}

/**
 * Helper function to log 'plan_edited' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the user who edited the plan
 * @param planId - ID of the edited plan
 */
export async function logPlanEdited(supabase: SupabaseClient<Database>, userId: string, planId: string): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "plan_edited",
    plan_id: planId,
    destination_text: null,
    transport_modes: null,
    trip_length_days: null,
  });
}

/**
 * Helper function to log 'plan_deleted' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the user who deleted the plan
 * @param planId - ID of the deleted plan (retained for analytics even after plan deletion)
 */
export async function logPlanDeleted(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string
): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "plan_deleted",
    plan_id: planId,
    destination_text: null,
    transport_modes: null,
    trip_length_days: null,
  });
}

/**
 * Helper function to log 'account_created' event
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the newly created user account
 */
export async function logAccountCreated(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  await logEvent(supabase, {
    user_id: userId,
    event_type: "account_created",
    plan_id: null,
    destination_text: null,
    transport_modes: null,
    trip_length_days: null,
  });
}
