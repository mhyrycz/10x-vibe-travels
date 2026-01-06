/**
 * Activity Move API Endpoint
 * POST /api/plans/{planId}/activities/{activityId}/move - Move activity to different block/position
 *
 * Authentication: Requires authenticated user session (enforced by middleware)
 * Authorization: Verifies plan ownership through activity chain
 */

import type { APIRoute } from "astro";
import { moveActivity, moveActivitySchema } from "../../../../../../lib/services/activities.service";
import type { ErrorDto } from "../../../../../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

/**
 * POST /api/plans/{planId}/activities/{activityId}/move
 * Moves an activity to a different block and/or position
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan
 * - activityId (required, UUID): The unique identifier of the activity
 *
 * Request Body:
 * - target_block_id (required, UUID): Destination block ID
 * - target_order_index (required, integer, 1-50): Target position in block
 *
 * @returns 200 OK with updated activity details
 * @returns 400 Bad Request if validation fails
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan, activity, or target block doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Get authenticated user from middleware
    const userId = locals.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    const validation = moveActivitySchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid move data",
          details: validation.error.flatten(),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Call service function
    const result = await moveActivity(supabase, userId, planId, activityId, validation.data);

    // Step 7: Handle service result
    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCode = (() => {
        switch (result.error.code) {
          case "VALIDATION_ERROR":
            return 400;
          case "FORBIDDEN":
            return 403;
          case "NOT_FOUND":
            return 404;
          case "INTERNAL_ERROR":
          default:
            return 500;
        }
      })();

      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as "VALIDATION_ERROR" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR",
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in move activity endpoint:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
