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
import type {
  UpdateActivityDto,
  MoveActivityDto,
  ActivityUpdatedDto,
  ActivityDto,
  CreateActivityDto,
} from "../../types";
import { logPlanEdited } from "./events.service";
import { type ServiceResult, isValidUUID, createErrorResult, handleUnexpectedError } from "./serviceUtils";

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod schema for validating activity update request
 * At least one field must be provided
 * Description field accepts strings 1-500 chars or empty string (clears description)
 */
export const updateActivitySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    duration_minutes: z.number().int().min(5).max(720).optional(),
    transport_minutes: z.number().int().min(0).max(600).nullable().optional(),
    description: z.string().min(1).max(500).optional().or(z.literal("")),
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

/**
 * Zod schema for validating custom activity creation
 * Title is required, other fields are optional
 * Description accepts strings 1-500 chars or empty string
 */
export const createActivitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().min(1).max(500).optional().or(z.literal("")),
  duration_minutes: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes")
    .max(720, "Duration must be 720 minutes or less")
    .optional(),
  transport_minutes: z
    .number()
    .int()
    .min(0, "Transport time cannot be negative")
    .max(600, "Transport time must be 600 minutes or less")
    .nullable()
    .optional(),
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

/**
 * Create a new custom activity in a plan day
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - ID of the plan
 * @param dayId - ID of the day to add activity to
 * @param data - Activity creation data
 * @returns ServiceResult with created ActivityDto or error
 */
export async function createActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  dayId: string,
  data: CreateActivityDto
): Promise<ServiceResult<ActivityDto>> {
  try {
    // Step 1: Validate UUIDs
    if (!isValidUUID(planId) || !isValidUUID(dayId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid UUID format");
    }

    // Step 2: Validate input data
    const validationResult = createActivitySchema.safeParse(data);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return createErrorResult("VALIDATION_ERROR", `Invalid ${firstError.path.join(".")}: ${firstError.message}`);
    }

    const validatedData = validationResult.data;

    // Step 3: Verify day exists and user owns the parent plan
    const { data: day, error: dayError } = await supabase.from("plan_days").select("plan_id").eq("id", dayId).single();

    if (dayError || !day) {
      return createErrorResult("NOT_FOUND", "Day not found");
    }

    if (day.plan_id !== planId) {
      return createErrorResult("FORBIDDEN", "Day does not belong to plan");
    }

    const { data: plan, error: planError } = await supabase.from("plans").select("owner_id").eq("id", planId).single();

    if (planError || !plan) {
      return createErrorResult("NOT_FOUND", "Plan not found");
    }

    if (plan.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "User does not own this plan");
    }

    // Step 4: Get max order_index for the day
    const { data: maxOrderData } = await supabase
      .from("plan_activities")
      .select("order_index")
      .eq("day_id", dayId)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = maxOrderData ? maxOrderData.order_index + 1 : 1;

    // Step 5: Insert activity
    const { data: newActivity, error: insertError } = await supabase
      .from("plan_activities")
      .insert({
        day_id: dayId,
        title: validatedData.title,
        description: validatedData.description || null,
        duration_minutes: validatedData.duration_minutes || 60,
        transport_minutes: validatedData.transport_minutes ?? null,
        order_index: nextOrderIndex,
      })
      .select(
        `
        id,
        title,
        description,
        duration_minutes,
        transport_minutes,
        order_index,
        created_at,
        updated_at,
        day_id
      `
      )
      .single();

    if (insertError || !newActivity) {
      return createErrorResult("INTERNAL_ERROR", "Failed to create activity");
    }

    // Step 6: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: newActivity as ActivityDto,
    };
  } catch (error) {
    return handleUnexpectedError("createActivity", error);
  }
}

/**
 * Delete an activity and recompute order_index for remaining activities
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - ID of the plan
 * @param activityId - ID of the activity to delete
 * @returns ServiceResult with void or error
 */
export async function deleteActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  activityId: string
): Promise<ServiceResult<void>> {
  try {
    // Step 1: Validate UUIDs
    if (!isValidUUID(planId) || !isValidUUID(activityId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid UUID format");
    }

    // Step 2: Verify activity exists and user owns the parent plan
    const { data: activity, error: activityError } = await supabase
      .from("plan_activities")
      .select(
        `
        id,
        day_id,
        order_index,
        plan_days!inner (
          plan_id,
          plans!inner (
            owner_id
          )
        )
      `
      )
      .eq("id", activityId)
      .single();
    console.log(activity, activityError);
    if (activityError || !activity) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Type guard to access nested properties safely
    const activityWithRelations = activity as unknown as {
      id: string;
      day_id: string;
      order_index: number;
      plan_days: {
        plan_id: string;
        plans: {
          owner_id: string;
        };
      };
    };

    if (activityWithRelations.plan_days.plan_id !== planId) {
      return createErrorResult("FORBIDDEN", "Activity does not belong to plan");
    }

    if (activityWithRelations.plan_days.plans.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "User does not own this plan");
    }

    const dayId = activityWithRelations.day_id;

    // Step 3: Delete the activity
    const { error: deleteError } = await supabase.from("plan_activities").delete().eq("id", activityId);

    if (deleteError) {
      return createErrorResult("INTERNAL_ERROR", "Failed to delete activity");
    }

    // Step 4: Recompute order_index for remaining activities in the same day
    const { data: remainingActivities, error: fetchError } = await supabase
      .from("plan_activities")
      .select("id")
      .eq("day_id", dayId)
      .order("order_index", { ascending: true });

    if (fetchError) {
      return createErrorResult("INTERNAL_ERROR", "Failed to recompute activity order");
    }

    if (remainingActivities && remainingActivities.length > 0) {
      // Update order_index sequentially (1, 2, 3, ...)
      for (let i = 0; i < remainingActivities.length; i++) {
        await supabase
          .from("plan_activities")
          .update({ order_index: i + 1 })
          .eq("id", remainingActivities[i].id);
      }
    }

    // Step 5: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return handleUnexpectedError("deleteActivity", error);
  }
}
