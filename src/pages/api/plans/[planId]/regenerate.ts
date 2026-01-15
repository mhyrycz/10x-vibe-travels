/**
 * Plan Regeneration API Endpoint
 * POST /api/plans/{planId}/regenerate - Regenerate plan itinerary with AI
 *
 * Authentication: Requires authenticated user session (enforced by middleware)
 * Authorization: Verifies plan ownership before regeneration
 * Rate Limiting: Shares 10/hour bucket with plan creation
 */

import type { APIRoute } from "astro";
import { regeneratePlan, regeneratePlanSchema } from "../../../../lib/services/plans.service";
import type { ErrorDto, RegeneratePlanDto } from "../../../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

/**
 * POST /api/plans/{planId}/regenerate
 * Regenerates a travel plan's itinerary using AI while preserving plan identity
 *
 * Path Parameters:
 * - planId (required, UUID): The unique identifier of the plan to regenerate
 *
 * Request Body (all fields optional):
 * - date_start (optional, string, YYYY-MM-DD): New start date
 * - date_end (optional, string, YYYY-MM-DD): New end date
 * - note_text (optional, string, max 20000 chars): Updated travel notes
 * - comfort (optional, enum): 'relax' | 'balanced' | 'intense'
 * - transport_modes (optional, array): ['car', 'walk', 'public']
 *
 * @returns 200 OK with complete regenerated plan (nested days, blocks, activities)
 * @returns 400 Bad Request if validation fails or invalid UUID
 * @returns 403 Forbidden if user doesn't own the plan
 * @returns 404 Not Found if plan doesn't exist
 * @returns 429 Too Many Requests if rate limit exceeded
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Note: Parameter updates are persisted to the plan record. The plan_id remains
 * unchanged - only nested data (days, blocks, activities) is regenerated.
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

    // Step 4: Parse request body (allow empty body for regeneration with existing params)
    let body: RegeneratePlanDto;
    try {
      const rawBody = await request.text();
      body = rawBody ? JSON.parse(rawBody) : {};
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
    const validation = regeneratePlanSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid regeneration data",
          details: validation.error.flatten(),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Call service layer
    const result = await regeneratePlan(supabase, userId, planId, validation.data, locals.runtime?.env);

    // Step 7: Handle service errors
    if (!result.success) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMIT_EXCEEDED: 429,
        INTERNAL_ERROR: 500,
      };

      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as import("../../../../types").ErrorCode,
          message: result.error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: statusMap[result.error.code] || 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response with complete regenerated plan
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Catch any unexpected errors
    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while regenerating the plan",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
