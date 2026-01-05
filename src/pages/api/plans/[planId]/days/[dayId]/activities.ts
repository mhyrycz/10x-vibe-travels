/**
 * Day Activities API Endpoint
 * POST /api/plans/{planId}/days/{dayId}/activities - Create a custom activity in a day
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Authorization: Verifies plan ownership through day chain
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../../../../db/supabase.client";
import { createActivity, createActivitySchema } from "../../../../../../lib/services/activities.service";
import type { ErrorDto } from "../../../../../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

/**
 * POST /api/plans/{planId}/days/{dayId}/activities
 * Creates a new custom activity in a specific day
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan
 * - dayId (required, UUID): The unique identifier of the day
 *
 * Request Body:
 * - title (required, string, 1-200 chars): Activity title
 * - description (optional, string, 1-500 chars or empty string): Activity description
 * - duration_minutes (optional, integer, 5-720): Duration in minutes (default: 60)
 * - transport_minutes (optional, integer, 0-600, nullable): Transport time in minutes
 *
 * @returns 201 Created with new activity details
 * @returns 400 Bad Request if validation fails
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan or day doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract path parameters
    const planId = params.planId;
    const dayId = params.dayId;

    if (!planId || !dayId) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Plan ID and Day ID are required",
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
    const validation = createActivitySchema.safeParse(body);

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
    const result = await createActivity(supabase, userId, planId, dayId, validation.data);

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
          code: result.error.code as import("../../../../../../types").ErrorCode,
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response with 201 Created
    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Catch any unexpected errors not handled by service layer
    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while creating the activity",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
