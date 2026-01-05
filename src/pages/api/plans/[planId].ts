/**
 * Plan Details API Endpoint
 * GET /api/plans/{planId} - Retrieve complete plan with nested structure
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Authorization: Verifies plan ownership before returning data
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { getPlanDetails, updatePlan, updatePlanSchema, deletePlan } from "../../../lib/services/plans.service";
import type { ErrorDto, UpdatePlanDto, ErrorCode } from "../../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

const statusMap: Record<string, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/**
 * GET /api/plans/{planId}
 * Retrieves complete plan details with full nested structure
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan to retrieve
 *
 * @returns 200 OK with complete plan data (nested days, blocks, activities, warnings)
 * @returns 400 Bad Request if planId is not a valid UUID
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract planId from path parameters
    const planId = params.planId;

    if (!planId) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Plan ID is required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching plan details for plan ${planId}, user ${userId}`);

    // Step 4: Call service function to get plan details
    const result = await getPlanDetails(supabase, userId, planId);

    // Step 5: Handle service result based on error code
    if (!result.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorCode,
          message: result.error.message,
        },
      };

      console.error(`Failed to fetch plan ${planId}:`, result.error);

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Return success response with complete plan
    console.log(`✅ Plan ${planId} fetched successfully:`, {
      planName: result.data.name,
      days: result.data.days.length,
      totalActivities: result.data.days.reduce((sum, day) => sum + day.activities.length, 0),
    });

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in GET /api/plans/{planId}:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching the plan",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/plans/{planId}
 * Updates plan metadata (name, budget, note_text, people_count)
 * Does NOT regenerate itinerary - use POST /api/plans/{planId}/regenerate for that
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan to update
 *
 * Request Body (at least one field required):
 * - name (optional, string, 1-140 chars): Plan name
 * - budget (optional, enum): 'budget' | 'moderate' | 'luxury'
 * - note_text (optional, string, max 20000 chars): Travel notes
 * - people_count (optional, number, 1-20): Number of travelers
 *
 * @returns 200 OK with updated fields and timestamp
 * @returns 400 Bad Request if validation fails or empty body
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract planId from path parameters
    const planId = params.planId;

    if (!planId) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Plan ID is required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Parse request body
    let body: UpdatePlanDto;
    try {
      body = await request.json();
    } catch {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Validate request body
    const validation = updatePlanSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update data",
          details: validation.error.flatten(),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Call service layer
    const result = await updatePlan(supabase, userId, planId, validation.data);

    // Step 7: Handle service errors
    if (!result.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorCode,
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response
    console.log(`Plan ${planId} updated successfully:`, {
      updatedFields: Object.keys(validation.data),
    });

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in PATCH /api/plans/{planId}:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while updating the plan",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/plans/{planId}
 * Permanently deletes a plan and all associated nested data
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan to delete
 *
 * @returns 204 No Content on successful deletion (empty body)
 * @returns 400 Bad Request if planId is not a valid UUID
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Note: Deletion is permanent and irreversible. The database automatically
 * cascades the deletion to all associated plan_days and plan_activities.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract planId from path parameters
    const planId = params.planId;

    if (!planId) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Plan ID is required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Call deletePlan service function
    console.log(`DELETE /api/plans/${planId} - Deleting plan for user ${userId}`);

    const result = await deletePlan(supabase, userId, planId);

    // Step 5: Handle service errors
    if (!result.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorCode,
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Return 204 No Content (successful deletion has no response body)
    console.log(`Plan ${planId} deleted successfully`);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in DELETE /api/plans/{planId}:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while deleting the plan",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
