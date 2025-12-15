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
import type { Database } from "../../db/database.types";
import type {
  CreatePlanDto,
  PlanDto,
  DayDto,
  BlockDto,
  ActivityDto,
  PaginatedPlansDto,
  BlockTypeEnum,
} from "../../types";
import { generatePlanItinerary, type AIItineraryResponse } from "./ai.service";
import { logPlanGenerated } from "./events.service";

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

// ============================================================================
// Service Result Type
// ============================================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

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
 * Calculates total duration for a block and generates warning if too long
 *
 * @param activities - Array of activities in the block
 * @returns Object with total duration and warning message
 */
function calculateBlockMetrics(
  activities: ActivityDto[],
  blockType: BlockTypeEnum
): {
  total_duration_minutes: number;
  warning: string | null;
} {
  const totalDuration = activities.reduce((sum, activity) => {
    return sum + activity.duration_minutes + (activity.transport_minutes || 0);
  }, 0);

  // Generate warning based on block type thresholds
  let warning: string | null = null;
  const hours = Math.round((totalDuration / 60) * 10) / 10; // Round to 1 decimal

  if (blockType === "morning" && totalDuration > 240) {
    warning = `This morning block is quite packed (${hours} hours). Consider spacing activities.`;
  } else if (blockType === "afternoon" && totalDuration > 300) {
    warning = `This afternoon block is quite packed (${hours} hours). Consider spacing activities.`;
  } else if (blockType === "evening" && totalDuration > 240) {
    warning = `This evening block is quite packed (${hours} hours). Consider spacing activities.`;
  }

  return {
    total_duration_minutes: totalDuration,
    warning,
  };
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
 * 1. Check user's plan count (max 10 plans per user)
 * 2. Generate plan name from destination and dates
 * 3. Call AI service to generate itinerary
 * 4. Insert plan record
 * 5. Insert plan_days records for each day
 * 6. Insert plan_blocks (morning, afternoon, evening) for each day
 * 7. Insert plan_activities for each activity from AI response
 * 8. Fetch complete plan with nested structure
 * 9. Log plan_generated event
 * 10. Return complete PlanDto
 *
 * Error Codes:
 * - FORBIDDEN: User has reached 10-plan limit
 * - INTERNAL_ERROR: Database or AI service error
 */
export async function createPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: CreatePlanDto
): Promise<ServiceResult<PlanDto>> {
  try {
    // Step 1: Check plan count limit
    const planCount = await getUserPlanCount(supabase, userId);
    if (planCount >= 10) {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Plan limit reached (maximum 10 plans per user)",
        },
      };
    }

    // Step 2: Generate plan name
    const planName = generatePlanName(data.destination_text, data.date_start, data.date_end);
    const tripLengthDays = calculateTripLengthDays(data.date_start, data.date_end);

    // Step 3: Call AI service to generate itinerary
    let aiItinerary: AIItineraryResponse;
    try {
      aiItinerary = await generatePlanItinerary(data);
    } catch (error) {
      console.error("AI service error:", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error && error.message.includes("timeout")
              ? "Itinerary generation timed out. Please try again"
              : "Failed to generate itinerary",
        },
      };
    }

    // Step 4: Insert plan record
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
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create plan",
        },
      };
    }

    // Step 5: Insert plan_days records
    const daysToInsert = aiItinerary.days.map((day, index) => {
      const dayDate = new Date(data.date_start);
      dayDate.setDate(dayDate.getDate() + index);
      return {
        plan_id: plan.id,
        day_index: day.day_index,
        day_date: dayDate.toISOString().split("T")[0],
      };
    });

    const { data: insertedDays, error: daysError } = await supabase.from("plan_days").insert(daysToInsert).select();

    if (daysError || !insertedDays) {
      console.error("Error creating plan days:", daysError);
      // Rollback: delete plan
      await supabase.from("plans").delete().eq("id", plan.id);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create plan days",
        },
      };
    }

    // Step 6 & 7: Insert blocks and activities for each day
    for (let i = 0; i < insertedDays.length; i++) {
      const day = insertedDays[i];
      const aiDay = aiItinerary.days[i];

      // Insert 3 blocks per day (morning, afternoon, evening)
      const blocksToInsert = [
        { day_id: day.id, block_type: "morning" as const },
        { day_id: day.id, block_type: "afternoon" as const },
        { day_id: day.id, block_type: "evening" as const },
      ];

      const { data: insertedBlocks, error: blocksError } = await supabase
        .from("plan_blocks")
        .insert(blocksToInsert)
        .select();

      if (blocksError || !insertedBlocks || insertedBlocks.length !== 3) {
        console.error("Error creating plan blocks:", blocksError);
        // Rollback: delete plan (cascade will handle days)
        await supabase.from("plans").delete().eq("id", plan.id);
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to create plan blocks",
          },
        };
      }

      // Insert activities for each block
      const morningBlock = insertedBlocks.find((b) => b.block_type === "morning");
      const afternoonBlock = insertedBlocks.find((b) => b.block_type === "afternoon");
      const eveningBlock = insertedBlocks.find((b) => b.block_type === "evening");

      if (!morningBlock || !afternoonBlock || !eveningBlock) {
        console.error("Missing required blocks for day");
        await supabase.from("plans").delete().eq("id", plan.id);
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to create plan blocks",
          },
        };
      }

      // Helper to map activities for a given block
      function mapActivitiesForBlock(
        block: { block_type: BlockTypeEnum; created_at: string; day_id: string; id: string },
        activities: AIItineraryResponse["days"][number]["activities"]["morning"]
      ) {
        return activities.map((activity, idx) => ({
          block_id: block.id,
          title: activity.title,
          duration_minutes: activity.duration_minutes,
          transport_minutes: activity.transport_minutes,
          order_index: idx + 1,
        }));
      }

      const activitiesToInsert = [
        ...mapActivitiesForBlock(morningBlock, aiDay.activities.morning),
        ...mapActivitiesForBlock(afternoonBlock, aiDay.activities.afternoon),
        ...mapActivitiesForBlock(eveningBlock, aiDay.activities.evening),
      ];

      const { error: activitiesError } = await supabase.from("plan_activities").insert(activitiesToInsert);

      if (activitiesError) {
        console.error("Error creating plan activities:", activitiesError);
        // Rollback: delete plan (cascade will handle days/blocks)
        await supabase.from("plans").delete().eq("id", plan.id);
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to create plan activities",
          },
        };
      }
    }

    // Step 8: Fetch complete plan with nested structure
    const { data: completePlan, error: fetchError } = await fetchCompletePlan(supabase, plan.id);

    if (fetchError || !completePlan) {
      console.error("Error fetching complete plan:", fetchError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Plan created but failed to retrieve complete data",
        },
      };
    }

    // Step 9: Log plan_generated event (fire-and-forget)
    logPlanGenerated(supabase, userId, plan.id, data.destination_text, data.transport_modes || null, tripLengthDays);

    // Step 10: Return complete plan
    return {
      success: true,
      data: completePlan,
    };
  } catch (error) {
    console.error("Unexpected error in createPlan:", error);
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
 * Fetches complete plan with nested days, blocks, and activities
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

    // Fetch blocks and activities for each day
    const daysWithBlocks: DayDto[] = [];
    for (const day of days || []) {
      const { data: blocks, error: blocksError } = await supabase.from("plan_blocks").select("*").eq("day_id", day.id);

      if (blocksError) {
        return { data: null, error: new Error("Failed to fetch blocks") };
      }

      const blocksWithActivities: BlockDto[] = [];
      for (const block of blocks || []) {
        const { data: activities, error: activitiesError } = await supabase
          .from("plan_activities")
          .select("*")
          .eq("block_id", block.id)
          .order("order_index");

        if (activitiesError) {
          return { data: null, error: new Error("Failed to fetch activities") };
        }

        const activitiesDto: ActivityDto[] = (activities || []).map((activity) => ({
          id: activity.id,
          title: activity.title,
          duration_minutes: activity.duration_minutes,
          transport_minutes: activity.transport_minutes,
          order_index: activity.order_index,
          created_at: activity.created_at,
          updated_at: activity.updated_at,
        }));

        const metrics = calculateBlockMetrics(activitiesDto, block.block_type);

        blocksWithActivities.push({
          id: block.id,
          block_type: block.block_type,
          activities: activitiesDto,
          total_duration_minutes: metrics.total_duration_minutes,
          warning: metrics.warning,
        });
      }

      daysWithBlocks.push({
        id: day.id,
        day_index: day.day_index,
        day_date: day.day_date,
        blocks: blocksWithActivities,
      });
    }

    const completePlan: PlanDto = {
      ...plan,
      days: daysWithBlocks,
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
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch plans",
        },
      };
    }

    // Step 2: Get total count for pagination metadata
    const { count, error: countError } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId);

    if (countError) {
      console.error("Error counting plans:", countError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to count plans",
        },
      };
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
    console.error("Unexpected error in listPlans:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }
}

// ============================================================================
// Get Plan Details Service Function
// ============================================================================

/**
 * Simple UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 */
function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

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
    // Step 1: Validate UUID format
    if (!isValidUUID(planId)) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid plan ID format",
        },
      };
    }

    // Step 2: Fetch plan to check ownership
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, owner_id")
      .eq("id", planId)
      .single();

    // Step 3: Handle not found
    if (planError || !plan) {
      console.log(`Plan ${planId} not found`);
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Plan not found",
        },
      };
    }

    // Step 4: Verify ownership
    if (plan.owner_id !== userId) {
      console.log(`User ${userId} attempted to access plan ${planId} owned by ${plan.owner_id}`);
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to access this plan",
        },
      };
    }

    // Step 5: Fetch complete plan structure
    const { data: completePlan, error: fetchError } = await fetchCompletePlan(supabase, planId);

    if (fetchError || !completePlan) {
      console.error(`Error fetching complete plan ${planId}:`, fetchError);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch plan details",
        },
      };
    }

    console.log(`✅ Plan ${planId} retrieved successfully for user ${userId}`);
    return {
      success: true,
      data: completePlan,
    };
  } catch (error) {
    console.error("Unexpected error in getPlanDetails:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  }
}
