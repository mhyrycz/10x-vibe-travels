/**
 * Activities Service
 *
 * Handles business logic for activity management within travel plans, including:
 * - Activity updates (title, duration, transport time)
 * - Activity movement between blocks and positions
 * - Authorization verification through plan ownership chain
 * - Event logging for plan modifications
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { UpdateActivityDto, ActivityDto } from "../../types";
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
        block_id,
        plan_blocks!inner(
          id,
          plan_days!inner(
            id,
            plans!inner(
              id,
              owner_id
            )
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
    const planInfo = verification.plan_blocks?.plan_days?.plans;

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
