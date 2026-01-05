/**
 * Plans Service
 *
 * Handles business logic for travel plan creation, including:
 * - Input validation with Zod schemas
 * - Plan limit enforcement
 * - AI itinerary generation orchestration
 * - Hierarchical database insertions (plan -> days -> blocks -> activities)
 * - Event logging
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../../db/database.types";
import type { CreatePlanDto, RegeneratePlanDto, PlanDto, DayDto, ActivityDto, PaginatedPlansDto } from "../../types";
import { generatePlanItinerary, type AIItineraryResponse } from "./ai.service";
import { logPlanGenerated, logPlanEdited, logPlanDeleted, logPlanRegenerated } from "./events.service";
import { checkRateLimit } from "./rateLimiter.service";
import {
  type ServiceResult,
  isValidUUID,
  createErrorResult,
  handleUnexpectedError,
  verifyPlanOwnership,
} from "./serviceUtils";

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Zod schema for validating plan creation request
 * Includes custom validations for dates and date ranges
 */
export const createPlanSchema = z
  .object({
    destination_text: z.string().min(1).max(160),
    date_start: z.string().refine(
      (date) => {
        const startDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        return startDate >= today;
      },
      { message: "Start date cannot be in the past" }
    ),
    date_end: z.string(),
    note_text: z.string().max(20000),
    people_count: z.number().int().min(1).max(20),
    trip_type: z.enum(["leisure", "business"]),
    comfort: z.enum(["relax", "balanced", "intense"]),
    budget: z.enum(["budget", "moderate", "luxury"]),
    transport_modes: z
      .array(z.enum(["car", "walk", "public"]))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.date_start);
      const endDate = new Date(data.date_end);
      return endDate >= startDate;
    },
    {
      message: "End date must be equal to or after start date",
      path: ["date_end"],
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.date_start);
      const endDate = new Date(data.date_end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    },
    {
      message: "Trip duration cannot exceed 30 days",
      path: ["date_end"],
    }
  );

/**
 * Zod schema for validating plan update (metadata only) request
 * Requires at least one field to be provided
 */
export const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(140).optional(),
    budget: z.enum(["budget", "moderate", "luxury"]).optional(),
    note_text: z.string().max(20000).optional(),
    people_count: z.number().int().min(1).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Zod schema for validating plan regeneration request
 * All fields are optional - can regenerate with existing params
 */
export const regeneratePlanSchema = z
  .object({
    date_start: z
      .string()
      .refine(
        (date) => {
          const startDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return startDate >= today;
        },
        { message: "Start date cannot be in the past" }
      )
      .optional(),
    date_end: z.string().optional(),
    note_text: z.string().max(20000).optional(),
    comfort: z.enum(["relax", "balanced", "intense"]).optional(),
    transport_modes: z
      .array(z.enum(["car", "walk", "public"]))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.date_start && data.date_end) {
        return new Date(data.date_end) > new Date(data.date_start);
      }
      return true;
    },
    { message: "End date must be after start date" }
  );

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates automatic plan name from destination and dates
 *
 * @param destination - Destination text
 * @param dateStart - Start date (YYYY-MM-DD)
 * @param dateEnd - End date (YYYY-MM-DD)
 * @returns Formatted plan name
 *
 * @example
 * generatePlanName("Kraków, Poland", "2025-06-15", "2025-06-20")
 * // Returns: "Kraków, Poland, 2025-06-15 – 2025-06-20"
 */
export function generatePlanName(destination: string, dateStart: string, dateEnd: string): string {
  return `${destination}, ${dateStart} – ${dateEnd}`;
}

/**
 * Calculates trip length in days (inclusive)
 *
 * @param dateStart - Start date (YYYY-MM-DD)
 * @param dateEnd - End date (YYYY-MM-DD)
 * @returns Number of days in trip
 *
 * @example
 * calculateTripLengthDays("2025-06-15", "2025-06-20")
 * // Returns: 6
 */
export function calculateTripLengthDays(dateStart: string, dateEnd: string): number {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Retrieves the count of plans owned by a user
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns Number of plans owned by user
 */
export async function getUserPlanCount(supabase: SupabaseClient<Database>, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) {
    console.error("Error counting user plans:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Generates AI itinerary with consistent error handling
 * Shared by createPlan and regeneratePlan
 *
 * @param supabase - Supabase client instance for fetching user preferences
 * @param userId - User ID for fetching preferences
 * @param params - Plan parameters for AI generation
 * @returns ServiceResult with AI itinerary or error
 */
async function generateAIItinerary(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: CreatePlanDto
): Promise<ServiceResult<AIItineraryResponse>> {
  try {
    const aiItinerary = await generatePlanItinerary(supabase, userId, params);
    return { success: true, data: aiItinerary };
  } catch (error) {
    console.error("AI service error:", error);
    const errorMessage =
      error instanceof Error && error.message.includes("timeout")
        ? "Itinerary generation timed out. Please try again"
        : "Failed to generate itinerary";
    return createErrorResult("INTERNAL_ERROR", errorMessage);
  }
}

/**
 * Calculates total duration for a day and generates warning if too long
 *
 * @param activities - Array of activities in the day
 * @returns Object with total duration and warning message
 */
function calculateDayMetrics(activities: ActivityDto[]): {
  total_duration_minutes: number;
  warning: string | null;
} {
  const totalDuration = activities.reduce((sum, activity) => {
    return sum + activity.duration_minutes + (activity.transport_minutes || 0);
  }, 0);

  // Generate warning if day exceeds 12 hours (720 minutes)
  let warning: string | null = null;
  const hours = Math.round((totalDuration / 60) * 10) / 10; // Round to 1 decimal

  if (totalDuration > 720) {
    warning = `This day may be too intensive - ${hours} hours total`;
  }

  return {
    total_duration_minutes: totalDuration,
    warning,
  };
}

/**
 * Inserts days and activities for a plan
 * Shared by createPlan and regeneratePlan to avoid code duplication
 *
 * @param supabase - Supabase client instance
 * @param planId - ID of the plan to insert data for
 * @param aiItinerary - AI-generated itinerary response
 * @param dateStart - Start date of the trip (YYYY-MM-DD)
 * @returns ServiceResult with null data on success or error
 */
async function insertPlanItineraryData(
  supabase: SupabaseClient<Database>,
  planId: string,
  aiItinerary: AIItineraryResponse,
  dateStart: string
): Promise<ServiceResult<null>> {
  // Step 1: Insert plan_days records
  const daysToInsert = aiItinerary.days.map((day, index) => {
    const dayDate = new Date(dateStart);
    dayDate.setDate(dayDate.getDate() + index);
    return {
      plan_id: planId,
      day_index: day.day_index,
      day_date: dayDate.toISOString().split("T")[0],
    };
  });

  const { data: insertedDays, error: daysError } = await supabase.from("plan_days").insert(daysToInsert).select();

  if (daysError || !insertedDays) {
    console.error("Error creating plan days:", daysError);
    return createErrorResult("INTERNAL_ERROR", "Failed to create plan days");
  }

  // Step 2: Insert activities for each day
  for (let i = 0; i < insertedDays.length; i++) {
    const day = insertedDays[i];
    const aiDay = aiItinerary.days[i];

    // Map activities with sequential order_index
    const activitiesToInsert = aiDay.activities.map((activity, idx) => ({
      day_id: day.id,
      title: activity.title,
      description: activity.description,
      duration_minutes: activity.duration_minutes,
      transport_minutes: activity.transport_minutes,
      order_index: idx + 1,
    }));

    const { error: activitiesError } = await supabase.from("plan_activities").insert(activitiesToInsert);

    if (activitiesError) {
      console.error("Error creating plan activities:", activitiesError);
      return createErrorResult("INTERNAL_ERROR", "Failed to create plan activities");
    }
  }

  return { success: true, data: null };
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Creates a new travel plan with AI-generated itinerary
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the authenticated user
 * @param data - Validated plan creation data
 * @returns ServiceResult containing either the created plan or an error
 *
 * Business Logic Flow:
 * 1. Check rate limit (10 plans per hour)
 * 2. Check user's plan count (max 10 plans total per user)
 * 3. Generate plan name from destination and dates
 * 4. Call AI service to generate itinerary
 * 5. Insert plan record
 * 6. Insert plan_days and plan_activities
 * 7. Fetch complete plan with nested structure
 * 8. Log plan_generated event
 * 9. Return complete PlanDto
 *
 * Error Codes:
 * - RATE_LIMIT_EXCEEDED: User has exceeded 10 plans per hour
 * - FORBIDDEN: User has reached 10-plan limit
 * - INTERNAL_ERROR: Database or AI service error
 */
export async function createPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: CreatePlanDto
): Promise<ServiceResult<PlanDto>> {
  try {
    // Step 1: Check rate limit (10 plans per hour, shared with regenerate)
    const rateLimit = await checkRateLimit(`plan-operations:${userId}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return createErrorResult("RATE_LIMIT_EXCEEDED", "Rate limit exceeded. You can create up to 10 plans per hour");
    }

    // Step 2: Check user's plan count (max 10 plans total)
    const currentPlanCount = await getUserPlanCount(supabase, userId);
    if (currentPlanCount >= 10) {
      return createErrorResult(
        "FORBIDDEN",
        "You have reached the maximum limit of 10 plans. Please delete an existing plan to create a new one."
      );
    }

    // Step 3: Generate plan name
    const planName = generatePlanName(data.destination_text, data.date_start, data.date_end);
    const tripLengthDays = calculateTripLengthDays(data.date_start, data.date_end);

    // Step 4: Call AI service to generate itinerary
    const aiResult = await generateAIItinerary(supabase, userId, data);
    if (!aiResult.success) {
      return aiResult;
    }
    const aiItinerary = aiResult.data;

    // Step 5: Insert plan record
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        owner_id: userId,
        name: planName,
        destination_text: data.destination_text,
        date_start: data.date_start,
        date_end: data.date_end,
        note_text: data.note_text,
        people_count: data.people_count,
        trip_type: data.trip_type,
        comfort: data.comfort,
        budget: data.budget,
        transport_modes: data.transport_modes || null,
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error("Error creating plan:", planError);
      return createErrorResult("INTERNAL_ERROR", "Failed to create plan");
    }

    // Step 6: Insert plan days, blocks, and activities
    const insertionResult = await insertPlanItineraryData(supabase, plan.id, aiItinerary, data.date_start);
    if (!insertionResult.success) {
      // Rollback: delete plan (cascade will handle any partially inserted data)
      await supabase.from("plans").delete().eq("id", plan.id);
      return insertionResult;
    }

    // Step 7: Fetch complete plan with nested structure
    const { data: completePlan, error: fetchError } = await fetchCompletePlan(supabase, plan.id);

    if (fetchError || !completePlan) {
      console.error("Error fetching complete plan:", fetchError);
      return createErrorResult("INTERNAL_ERROR", "Plan created but failed to retrieve complete data");
    }

    // Step 8: Log plan_generated event (fire-and-forget)
    logPlanGenerated(supabase, userId, plan.id, data.destination_text, data.transport_modes || null, tripLengthDays);

    // Step 9: Return complete plan
    return {
      success: true,
      data: completePlan,
    };
  } catch (error) {
    return handleUnexpectedError("createPlan", error);
  }
}

/**
 * Updates plan metadata (name, budget, note_text, people_count)
 * Does NOT regenerate itinerary - use regeneratePlan() for that
 *
 * Authorization: Verifies plan exists and belongs to authenticated user
 *
 * @param supabase - Authenticated Supabase client instance
 * @param userId - ID of the authenticated user making the request
 * @param planId - UUID of the plan to update
 * @param data - Partial update data (at least one field required)
 * @returns ServiceResult<PlanUpdatedDto> with updated fields and timestamp
 *
 * @example
 * ```typescript
 * const result = await updatePlan(supabase, userId, planId, {
 *   name: "Updated Plan Name",
 *   budget: "luxury"
 * });
 * ```
 */
export async function updatePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  data: {
    name?: string;
    budget?: "budget" | "moderate" | "luxury";
    note_text?: string;
    people_count?: number;
  }
): Promise<
  ServiceResult<{
    id: string;
    name: string;
    budget: string;
    note_text: string;
    people_count: number;
    updated_at: string;
  }>
> {
  try {
    console.log(`Updating plan ${planId} for user ${userId}`);

    // Step 1-4: Validate and verify ownership
    const verification = await verifyPlanOwnership(supabase, userId, planId);
    if (!verification.success) {
      return verification;
    }

    // Step 5: Update plan with provided fields
    const { data: updatedPlan, error: updateError } = await supabase
      .from("plans")
      .update(data)
      .eq("id", planId)
      .select("id, name, budget, note_text, people_count, updated_at")
      .single();

    if (updateError || !updatedPlan) {
      console.error(`Error updating plan ${planId}:`, updateError);
      return createErrorResult("INTERNAL_ERROR", "Failed to update plan");
    }

    // Step 6: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId).catch((error) => {
      console.error("Failed to log plan_edited event:", error);
    });

    console.log(`✅ Plan ${planId} updated successfully`);
    return {
      success: true,
      data: updatedPlan,
    };
  } catch (error) {
    return handleUnexpectedError("updatePlan", error);
  }
}

/**
 * Fetches complete plan with nested days and activities
 *
 * @param supabase - Supabase client instance
 * @param planId - Plan ID
 * @returns Complete PlanDto with nested structure
 */
async function fetchCompletePlan(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<{ data: PlanDto | null; error: Error | null }> {
  try {
    // Fetch plan
    const { data: plan, error: planError } = await supabase.from("plans").select("*").eq("id", planId).single();

    if (planError || !plan) {
      return { data: null, error: new Error("Plan not found") };
    }

    // Fetch days
    const { data: days, error: daysError } = await supabase
      .from("plan_days")
      .select("*")
      .eq("plan_id", planId)
      .order("day_index");

    if (daysError) {
      return { data: null, error: new Error("Failed to fetch days") };
    }

    // Fetch activities for each day
    const daysWithActivities: DayDto[] = [];
    for (const day of days || []) {
      const { data: activities, error: activitiesError } = await supabase
        .from("plan_activities")
        .select("*")
        .eq("day_id", day.id)
        .order("order_index");

      if (activitiesError) {
        return { data: null, error: new Error("Failed to fetch activities") };
      }

      const activitiesDto: ActivityDto[] = (activities || []).map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        duration_minutes: activity.duration_minutes,
        transport_minutes: activity.transport_minutes,
        order_index: activity.order_index,
        created_at: activity.created_at,
        updated_at: activity.updated_at,
      }));

      const metrics = calculateDayMetrics(activitiesDto);

      daysWithActivities.push({
        id: day.id,
        day_index: day.day_index,
        day_date: day.day_date,
        activities: activitiesDto,
        total_duration_minutes: metrics.total_duration_minutes,
        warning: metrics.warning,
      });
    }

    const completePlan: PlanDto = {
      ...plan,
      days: daysWithActivities,
    };

    return { data: completePlan, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

// ============================================================================
// List Plans Query Parameter Validation
// ============================================================================

/**
 * Allowed sort fields for plan list queries
 * Whitelist to prevent SQL injection through sort parameter
 */
const ALLOWED_SORT_FIELDS = ["created_at", "date_start", "date_end", "name"] as const;

/**
 * Interface for validated list query parameters
 */
export interface ValidatedListParams {
  limit: number;
  offset: number;
  sortField: string;
  ascending: boolean;
}

/**
 * Validates and normalizes list query parameters
 * Returns validated values or defaults
 *
 * @param params - Raw query parameters from URL
 * @returns Validated parameters with defaults applied
 */
export function validateListQueryParams(params: {
  limit?: string | number;
  offset?: string | number;
  sort?: string;
}): ValidatedListParams {
  // Parse and validate limit (default: 10, max: 100, min: 1)
  let limit = 10;
  if (params.limit !== undefined) {
    const parsedLimit = typeof params.limit === "string" ? parseInt(params.limit, 10) : params.limit;
    if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
      limit = parsedLimit;
    }
  }

  // Parse and validate offset (default: 0, min: 0)
  let offset = 0;
  if (params.offset !== undefined) {
    const parsedOffset = typeof params.offset === "string" ? parseInt(params.offset, 10) : params.offset;
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
    }
  }

  // Parse and validate sort field (default: '-created_at')
  let sortField = "created_at";
  let ascending = false;

  if (params.sort) {
    const sortParam = params.sort.trim();
    const isDescending = sortParam.startsWith("-");
    const fieldName = isDescending ? sortParam.substring(1) : sortParam;

    // Check if field is in whitelist
    if (ALLOWED_SORT_FIELDS.includes(fieldName as (typeof ALLOWED_SORT_FIELDS)[number])) {
      sortField = fieldName;
      ascending = !isDescending;
    }
    // If invalid field, fall back to default (created_at descending)
  }

  return {
    limit,
    offset,
    sortField,
    ascending,
  };
}

// ============================================================================
// List Plans Service Function
// ============================================================================

/**
 * Retrieves paginated list of travel plans for a user
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the user whose plans to retrieve
 * @param params - Query parameters (limit, offset, sort)
 * @returns ServiceResult with paginated plans data
 */
export async function listPlans(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: ValidatedListParams
): Promise<ServiceResult<PaginatedPlansDto>> {
  try {
    // Step 1: Build query for plan data with pagination and sorting
    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("id, name, destination_text, date_start, date_end, created_at")
      .eq("owner_id", userId)
      .order(params.sortField, { ascending: params.ascending })
      .range(params.offset, params.offset + params.limit - 1);

    if (plansError) {
      console.error("Error fetching plans:", plansError);
      return createErrorResult("INTERNAL_ERROR", "Failed to fetch plans");
    }

    // Step 2: Get total count for pagination metadata
    const { count, error: countError } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId);

    if (countError) {
      console.error("Error counting plans:", countError);
      return createErrorResult("INTERNAL_ERROR", "Failed to count plans");
    }
    // Step 3: Build paginated response
    const response: PaginatedPlansDto = {
      data: plans || [],
      pagination: {
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
      },
    };

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return handleUnexpectedError("listPlans", error);
  }
}

// ============================================================================
// Delete Plan Service Function
// ============================================================================

/**
 * Permanently deletes a plan and all nested data (cascading)
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - ID of the plan to delete
 * @returns ServiceResult with null data on success or authorization error
 *
 * Deletion Flow:
 * 1. Validate planId is a valid UUID format
 * 2. Verify plan exists and user owns it (uses verifyPlanOwnership)
 * 3. Capture plan context (destination_text) BEFORE deletion for event logging
 * 4. Execute DELETE query (database handles cascading to days/blocks/activities)
 * 5. Log plan_deleted event (fire-and-forget)
 * 6. Return success
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - NOT_FOUND: Plan doesn't exist
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database error during deletion
 *
 * Note: Deletion is permanent and irreversible. Database cascading automatically
 * deletes all associated plan_days and plan_activities.
 */
export async function deletePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string
): Promise<ServiceResult<null>> {
  try {
    console.log(`Attempting to delete plan ${planId} for user ${userId}`);

    // Step 1: Verify plan ownership and fetch destination_text for logging
    const verification = await verifyPlanOwnership(supabase, userId, planId, "id, owner_id, destination_text");

    if (!verification.success) {
      return verification;
    }

    // Step 2: Log plan_deleted event BEFORE deletion
    // Must happen before DELETE because of foreign key constraint on events.plan_id
    // IMPORTANT: Must await to ensure event is logged before plan is deleted
    console.log(`Logging plan_deleted event before deletion of plan ${planId}`);
    try {
      await logPlanDeleted(supabase, userId, planId);
    } catch (logError: unknown) {
      console.error(`Failed to log plan_deleted event for plan ${planId}:`, logError);
      // Continue with deletion even if event logging fails
    }

    // Step 3: Execute DELETE query (cascades to nested tables automatically)
    const { error: deleteError } = await supabase.from("plans").delete().eq("id", planId);

    if (deleteError) {
      console.error(`Database error deleting plan ${planId}:`, deleteError);
      return createErrorResult("INTERNAL_ERROR", "Failed to delete plan");
    }

    console.log(`Plan ${planId} deleted successfully`);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    return handleUnexpectedError("deletePlan", error);
  }
}

// ============================================================================
// Regenerate Plan Service Function
// ============================================================================

/**
 * Regenerates a plan's itinerary using AI while preserving plan identity
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - ID of the plan to regenerate
 * @param updates - Optional parameter updates to merge with existing plan
 * @returns ServiceResult with complete regenerated plan
 *
 * Regeneration Flow:
 * 1. Validate planId is a valid UUID format
 * 2. Check rate limit (shares 10/hour bucket with plan creation)
 * 3. Verify plan exists and user owns it
 * 4. Merge provided updates with existing plan parameters
 * 5. Generate new itinerary with AI using merged parameters
 * 6. Update plan record with new parameters
 * 7. Delete all nested data (days, blocks, activities) via cascading
 * 8. Insert new days, blocks, and activities from AI response
 * 9. Log plan_regenerated event
 * 10. Fetch and return complete regenerated plan
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - FORBIDDEN: Rate limit exceeded or user doesn't own plan
 * - NOT_FOUND: Plan doesn't exist
 * - INTERNAL_ERROR: Database or AI service error
 *
 * Note: Parameter updates ARE persisted to the plan record. Merged parameters
 * are used for AI generation and saved permanently to the database.
 */
export async function regeneratePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  updates: RegeneratePlanDto
): Promise<ServiceResult<PlanDto>> {
  try {
    console.log(`Regenerating plan ${planId} for user ${userId}`);

    // Step 1: Validate UUID format
    if (!isValidUUID(planId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
    }

    // Step 2: Check rate limit (shared with plan creation - max 10 per hour)
    const rateLimit = await checkRateLimit(`plan-operations:${userId}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return createErrorResult(
        "RATE_LIMIT_EXCEEDED",
        "Rate limit exceeded. You can regenerate/create up to 10 plans per hour"
      );
    }

    // Step 3: Verify ownership and fetch existing plan data
    const verification = await verifyPlanOwnership(supabase, userId, planId, "*");

    if (!verification.success) {
      return verification;
    }

    const existingPlan = verification.plan as Tables<"plans">;

    // Step 4: Merge provided updates with existing plan parameters
    const mergedParams = {
      destination_text: existingPlan.destination_text,
      date_start: updates.date_start || existingPlan.date_start,
      date_end: updates.date_end || existingPlan.date_end,
      note_text: updates.note_text !== undefined ? updates.note_text : existingPlan.note_text,
      people_count: existingPlan.people_count,
      trip_type: existingPlan.trip_type,
      comfort: updates.comfort || existingPlan.comfort,
      budget: existingPlan.budget,
      transport_modes: updates.transport_modes !== undefined ? updates.transport_modes : existingPlan.transport_modes,
    };

    console.log(`Merged parameters for regeneration:`, {
      dateRange: `${mergedParams.date_start} to ${mergedParams.date_end}`,
      comfort: mergedParams.comfort,
      hasUpdates: Object.keys(updates).length > 0,
    });

    // Step 5: Generate new itinerary with AI
    const aiResult = await generateAIItinerary(supabase, userId, mergedParams as CreatePlanDto);
    if (!aiResult.success) {
      return aiResult;
    }
    const aiItinerary = aiResult.data;

    // Step 6: Update plan record with merged parameters
    const { error: updateError } = await supabase
      .from("plans")
      .update({
        date_start: mergedParams.date_start,
        date_end: mergedParams.date_end,
        note_text: mergedParams.note_text,
        comfort: mergedParams.comfort,
        transport_modes: mergedParams.transport_modes,
      })
      .eq("id", planId);

    if (updateError) {
      console.error(`Error updating plan ${planId}:`, updateError);
      return createErrorResult("INTERNAL_ERROR", "Failed to update plan parameters");
    }

    // Step 7: Delete all existing nested data (cascades automatically via foreign keys)
    const { error: deleteDaysError } = await supabase.from("plan_days").delete().eq("plan_id", planId);

    if (deleteDaysError) {
      console.error(`Error deleting old plan days for ${planId}:`, deleteDaysError);
      return createErrorResult("INTERNAL_ERROR", "Failed to delete old itinerary");
    }

    // Step 8: Insert new days and activities
    const insertionResult = await insertPlanItineraryData(supabase, planId, aiItinerary, mergedParams.date_start);
    if (!insertionResult.success) {
      return insertionResult;
    }

    // Step 9: Fetch complete regenerated plan
    const { data: completePlan, error: fetchError } = await fetchCompletePlan(supabase, planId);

    if (fetchError || !completePlan) {
      console.error("Error fetching regenerated plan:", fetchError);
      return createErrorResult("INTERNAL_ERROR", "Plan regenerated but failed to retrieve complete data");
    }

    // Step 10: Log plan_regenerated event (fire-and-forget)
    const tripLengthDays = calculateTripLengthDays(mergedParams.date_start, mergedParams.date_end);
    logPlanRegenerated(
      supabase,
      userId,
      planId,
      mergedParams.destination_text,
      mergedParams.transport_modes,
      tripLengthDays
    );

    console.log(`✅ Plan ${planId} regenerated successfully`);
    return {
      success: true,
      data: completePlan,
    };
  } catch (error) {
    return handleUnexpectedError("regeneratePlan", error);
  }
}

// ============================================================================
// Get Plan Details Service Function
// ============================================================================

/**
 * Retrieves complete plan details with authorization check
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - ID of the plan to retrieve
 * @returns ServiceResult with complete plan data or authorization error
 *
 * Authorization Flow:
 * 1. Validate planId is a valid UUID format
 * 2. Fetch plan to check if it exists
 * 3. Verify plan ownership (owner_id === userId)
 * 4. Fetch complete nested structure if authorized
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - NOT_FOUND: Plan doesn't exist
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database error
 */
export async function getPlanDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string
): Promise<ServiceResult<PlanDto>> {
  try {
    // Step 1-4: Validate and verify ownership
    const verification = await verifyPlanOwnership(supabase, userId, planId);
    if (!verification.success) {
      return verification;
    }

    // Step 5: Fetch complete plan structure
    const { data: completePlan, error: fetchError } = await fetchCompletePlan(supabase, planId);

    if (fetchError || !completePlan) {
      console.error(`Error fetching complete plan ${planId}:`, fetchError);
      return createErrorResult("INTERNAL_ERROR", "Failed to fetch plan details");
    }

    console.log(`✅ Plan ${planId} retrieved successfully for user ${userId}`);
    return {
      success: true,
      data: completePlan,
    };
  } catch (error) {
    return handleUnexpectedError("getPlanDetails", error);
  }
}
