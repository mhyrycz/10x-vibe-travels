/**
 * User Preferences API Endpoint
 * POST /api/users/me/preferences - Create user travel preferences during onboarding
 * GET /api/users/me/preferences - Retrieve user travel preferences
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Rate Limit: None (onboarding endpoint)
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import {
  createUserPreferences,
  createUserPreferencesSchema,
  getUserPreferences,
} from "../../../../lib/services/userPreferences.service";
import type { ErrorDto } from "../../../../types";

// Disable prerendering for this API route (SSR required for auth)
export const prerender = false;

/**
 * POST /api/users/me/preferences
 * Creates initial travel preferences for authenticated user during onboarding
 *
 * @returns 201 Created with user preferences data
 * @returns 400 Bad Request if validation fails
 * @returns 409 Conflict if preferences already exist
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
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

    // Validate against Zod schema
    const validation = createUserPreferencesSchema.safeParse(requestBody);

    if (!validation.success) {
      const errorResponse: ErrorDto = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: {
            field: validation.error.errors[0]?.path.join("."),
            constraint: validation.error.errors[0]?.message,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Call service function to create preferences
    const result = await createUserPreferences(supabase, userId, validation.data);

    // Step 5: Handle service result and return appropriate response
    if (!result.success) {
      const statusCode = result.error.code === "CONFLICT" ? 409 : 500;
      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorDto["error"]["code"],
          message: result.error.message,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Return success response with created preferences
    return new Response(JSON.stringify(result.data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in POST /api/users/me/preferences:", error);

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

/**
 * GET /api/users/me/preferences
 * Retrieves travel preferences for the authenticated user
 *
 * @returns 200 OK with user preferences data
 * @returns 404 Not Found if preferences don't exist (user hasn't completed onboarding)
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Step 1: Extract Supabase client from context
    const supabase = locals.supabase;

    // Step 2: Use DEFAULT_USER_ID for development (TODO: implement real JWT auth)
    const userId = DEFAULT_USER_ID;

    // Step 3: Call service function to retrieve preferences
    const result = await getUserPreferences(supabase, userId);

    // Step 4: Handle service result and return appropriate response
    if (!result.success) {
      const statusCode = result.error.code === "NOT_FOUND" ? 404 : 500;
      const errorResponse: ErrorDto = {
        error: {
          code: result.error.code as ErrorDto["error"]["code"],
          message: result.error.message,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 5: Return success response with preferences
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in GET /api/users/me/preferences:", error);

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
