/**
 * Plans API Endpoint
 * GET /api/plans - List all travel plans for authenticated user with pagination
 * POST /api/plans - Create a new travel plan with AI-generated itinerary
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Rate Limit: 10 requests per hour per user (POST only)
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { checkRateLimit } from "../../lib/services/rateLimiter.service";
import { createPlan, createPlanSchema, listPlans, validateListQueryParams } from "../../lib/services/plans.service";
import type { ErrorDto } from "../../types";

// Disable prerendering for this API route (SSR required for auth and dynamic operations)
export const prerender = false;

/**
 * GET /api/plans
 * Retrieves paginated list of travel plans for the authenticated user
 *
 * Query Parameters:
 * - limit (optional): Number of results per page (1-100, default: 10)
 * - offset (optional): Pagination offset (min: 0, default: 0)
 * - sort (optional): Sort field with optional '-' prefix for descending (default: '-created_at')
 *
 * @returns 200 OK with paginated plan list
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Extract query parameters from URL
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
      sort: url.searchParams.get("sort") || undefined,
    };

    // Step 4: Validate and normalize query parameters
    const validatedParams = validateListQueryParams(rawParams);

    console.log(`Fetching plans for user ${userId}:`, {
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      sort: `${validatedParams.ascending ? "" : "-"}${validatedParams.sortField}`,
    });

    // Step 5: Call service function to fetch plans
    const result = await listPlans(supabase, userId, validatedParams);

    // Step 6: Handle service result
    if (!result.success) {
      console.error(`Failed to fetch plans for user ${userId}:`, result.error);

      const errorResponse: ErrorDto = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch plans",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 7: Return success response with paginated data
    console.log(`✅ Plans fetched successfully:`, {
      count: result.data.data.length,
      total: result.data.pagination.total,
      offset: result.data.pagination.offset,
    });

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in GET /api/plans:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching plans",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/plans
 * Creates a new travel plan with AI-generated itinerary
 *
 * @returns 201 Created with complete plan data (nested structure)
 * @returns 400 Bad Request if validation fails
 * @returns 403 Forbidden if user has reached 10-plan limit
 * @returns 429 Too Many Requests if rate limit exceeded (10 requests/hour)
 * @returns 500 Internal Server Error on unexpected errors
 * @returns 503 Service Unavailable if AI generation times out
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Check rate limit (10 requests per hour)
    const rateLimit = await checkRateLimit(
      userId,
      10, // limit: 10 requests
      60 * 60 * 1000 // window: 1 hour in milliseconds
    );

    if (!rateLimit.allowed) {
      // User exceeded rate limit - calculate time until reset
      const minutesUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);

      const errorResponse: ErrorDto = {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. You can create ${minutesUntilReset > 60 ? "another plan in " + Math.ceil(minutesUntilReset / 60) + " hours" : "another plan in " + minutesUntilReset + " minutes"}.`,
        },
      };

      console.log(`Rate limit exceeded for user ${userId}. Reset in ${minutesUntilReset} minutes.`);

      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)), // seconds
        },
      });
    }

    // Step 4: Parse request body
    const body = await request.json();

    // Step 5: Validate request data with Zod schema
    const validation = createPlanSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid plan data",
          details: {
            issues: validation.error.issues,
          },
        },
      };

      console.log("Plan validation failed:", validation.error.issues);

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Call service function to create plan with AI generation
    console.log(`Creating plan for user ${userId}:`, {
      destination: validation.data.destination_text,
      dates: `${validation.data.date_start} to ${validation.data.date_end}`,
    });

    const result = await createPlan(supabase, userId, validation.data);

    // Step 7: Handle service result and return appropriate response
    if (!result.success) {
      // Map service error codes to HTTP status codes
      let statusCode: number;
      switch (result.error.code) {
        case "FORBIDDEN":
          statusCode = 403;
          break;
        case "INTERNAL_ERROR":
          // Check if it's an AI timeout based on message
          statusCode = result.error.message.includes("timeout") ? 503 : 500;
          break;
        default:
          statusCode = 500;
      }

      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorDto["error"]["code"],
          message: result.error.message,
        },
      };

      console.error(`Plan creation failed for user ${userId}:`, result.error);

      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 8: Return success response with complete plan
    console.log(`✅ Plan created successfully:`, {
      planId: result.data.id,
      planName: result.data.name,
      days: result.data.days.length,
    });

    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in POST /api/plans:", error);

    const errorResponse: ErrorDto = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while creating the plan",
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
