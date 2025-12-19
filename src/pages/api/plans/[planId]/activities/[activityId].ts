/**
 * Activity Management API Endpoint
 * PATCH /api/plans/{planId}/activities/{activityId} - Update activity details
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Authorization: Verifies plan ownership before update through activity chain
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../../../db/supabase.client";
import { updateActivity, updateActivitySchema } from "../../../../../lib/services/activities.service";
import type { ErrorDto } from "../../../../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

/**
 * PATCH /api/plans/{planId}/activities/{activityId}
 * Updates activity details (title, duration, transport time)
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan
 * - activityId (required, UUID): The unique identifier of the activity
 *
 * Request Body (at least one field required):
 * - title (optional, string, 1-200 chars): Updated activity title
 * - duration_minutes (optional, integer, 5-720): Updated duration in minutes
 * - transport_minutes (optional, integer, 0-600, nullable): Updated transport time in minutes
 *
 * @returns 200 OK with updated activity details
 * @returns 400 Bad Request if validation fails or no fields provided
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan or activity doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract path parameters
    const planId = params.planId;
    const activityId = params.activityId;

    if (!planId || !activityId) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Plan ID and Activity ID are required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Parse request body
    let body;
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

    // Step 5: Validate request body with Zod
    const validation = updateActivitySchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid activity data",
          details: validation.error.flatten(),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Call service function
    const result = await updateActivity(supabase, userId, planId, activityId, validation.data);

    // Step 7: Handle service errors with status mapping
    if (!result.success) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_ERROR: 500,
      };

      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as import("../../../../../types").ErrorCode,
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Catch any unexpected errors not handled by service layer
    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while updating the activity",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
