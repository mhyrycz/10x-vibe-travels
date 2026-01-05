/**
 * Activities Service
 *
 * Handles business logic for activity management within travel plans, including:
 * - Activity updates (title, duration, transport time)
 * - Activity movement between days and positions
 * - Authorization verification through plan ownership chain
 * - Event logging for plan modifications
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { UpdateActivityDto, MoveActivityDto, ActivityUpdatedDto, ActivityDto } from "../../types";
import { logPlanEdited } from "./events.service";
import { type ServiceResult, isValidUUID, createErrorResult, handleUnexpectedError } from "./serviceUtils";

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod schema for validating activity update request
 * At least one field must be provided
 */
export const updateActivitySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    duration_minutes: z.number().int().min(5).max(720).optional(),
    transport_minutes: z.number().int().min(0).max(600).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Zod schema for validating activity move request
 * Both fields are required
 */
export const moveActivitySchema = z.object({
  target_day_id: z.string().uuid("Invalid target day ID format"),
  target_order_index: z.number().int().min(1).max(50, "Order index must be between 1 and 50"),
});

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Updates activity details (title, duration, transport time)
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - UUID of the plan containing the activity
 * @param activityId - UUID of the activity to update
 * @param data - Partial update data (at least one field required)
 * @returns ServiceResult with updated activity or error
 *
 * Update Flow:
 * 1. Validate UUID formats
 * 2. Verify activity exists and belongs to specified plan
 * 3. Verify plan ownership (owner_id === userId)
 * 4. Update activity record with provided fields
 * 5. Log plan_edited event (fire-and-forget)
 * 6. Return updated activity
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - NOT_FOUND: Plan or activity not found
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database error
 */
export async function updateActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  activityId: string,
  data: UpdateActivityDto
): Promise<ServiceResult<ActivityDto>> {
  try {
    // Step 1: Validate UUID formats
    if (!isValidUUID(planId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
    }

    if (!isValidUUID(activityId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid activity ID format");
    }

    // Step 2: Verify activity exists and belongs to plan, and user owns plan
    // Use single query with joins for efficiency
    const { data: verification, error: verifyError } = await supabase
      .from("plan_activities")
      .select(
        `
        id,
        day_id,
        plan_days!inner(
          id,
          plans!inner(
            id,
            owner_id
          )
        )
      `
      )
      .eq("id", activityId)
      .single();

    if (verifyError || !verification) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Extract plan info from nested structure
    const planInfo = verification.plan_days?.plans;

    // Step 3: Verify activity belongs to specified plan
    if (planInfo?.id !== planId) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Step 4: Verify plan ownership
    if (planInfo?.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "You don't have permission to access this plan");
    }

    // Step 5: Update activity with provided fields
    const { data: updatedActivity, error: updateError } = await supabase
      .from("plan_activities")
      .update(data)
      .eq("id", activityId)
      .select("id, title, duration_minutes, transport_minutes, order_index, created_at, updated_at")
      .single();

    if (updateError || !updatedActivity) {
      console.error("Error updating activity:", updateError);
      return createErrorResult("INTERNAL_ERROR", "Failed to update activity");
    }

    // Step 6: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: updatedActivity as ActivityDto,
    };
  } catch (error) {
    return handleUnexpectedError("updateActivity", error);
  }
}

/**
 * Moves an activity to a different day and/or position
 *
 * This function uses a PostgreSQL stored procedure to atomically handle the complex
 * reordering logic while respecting the database constraint: check (order_index between 1 and 50)
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - UUID of the plan containing the activity
 * @param activityId - UUID of the activity to move
 * @param data - Target day and position information
 * @returns ServiceResult with updated activity or error
 *
 * Move Flow:
 * 1. Validate UUID formats for all identifiers
 * 2. Verify activity exists and belongs to the specified plan
 * 3. Verify user owns the plan (authorization check)
 * 4. Verify target day belongs to the same plan
 * 5. Execute stored procedure to atomically reorder activities
 * 6. Log plan_edited event (fire-and-forget)
 * 7. Return updated activity with new position
 *
 * The stored procedure handles three scenarios:
 * - Cross-day moves: Compact source, make space in target, move activity
 * - Same-day move down: Shift intervening activities up, move activity
 * - Same-day move up: Shift intervening activities down, move activity
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format or target day not in same plan
 * - NOT_FOUND: Plan, activity, or target day not found
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database or stored procedure error
 */
export async function moveActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  activityId: string,
  data: MoveActivityDto
): Promise<ServiceResult<ActivityUpdatedDto>> {
  try {
    // Step 1: Validate UUID formats
    if (!isValidUUID(planId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
    }

    if (!isValidUUID(activityId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid activity ID format");
    }

    if (!isValidUUID(data.target_day_id)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid target day ID format");
    }

    // Step 2: Verify activity exists and get current state with authorization
    // Use single query with joins for efficiency
    const { data: activityData, error: activityError } = await supabase
      .from("plan_activities")
      .select(
        `
        id,
        day_id,
        order_index,
        plan_days!inner(
          id,
          plans!inner(
            id,
            owner_id
          )
        )
      `
      )
      .eq("id", activityId)
      .single();

    if (activityError || !activityData) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Extract plan info from nested structure
    const planInfo = activityData.plan_days?.plans;

    // Step 3: Verify activity belongs to specified plan
    if (planInfo?.id !== planId) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Step 4: Verify plan ownership
    if (planInfo?.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "You don't have permission to access this plan");
    }

    // Step 5: Verify target day belongs to same plan
    const { data: targetDay, error: dayError } = await supabase
      .from("plan_days")
      .select("id, plan_id")
      .eq("id", data.target_day_id)
      .single();

    if (dayError || !targetDay) {
      return createErrorResult("NOT_FOUND", "Target day not found");
    }

    if (targetDay.plan_id !== planId) {
      return createErrorResult("VALIDATION_ERROR", "Target day does not belong to this plan");
    }

    // Step 6: Execute reordering via stored procedure
    // The stored procedure handles all the complex reordering logic atomically
    const { data: updatedActivity, error: moveError } = await supabase
      .rpc("move_activity_transaction", {
        p_activity_id: activityId,
        p_target_day_id: data.target_day_id,
        p_target_order_index: data.target_order_index,
      })
      .single();

    if (moveError || !updatedActivity) {
      console.error("Error moving activity:", moveError);
      return createErrorResult("INTERNAL_ERROR", "Failed to move activity");
    }

    // Step 7: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: updatedActivity as ActivityUpdatedDto,
    };
  } catch (error) {
    return handleUnexpectedError("moveActivity", error);
  }
}
