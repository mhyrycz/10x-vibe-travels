/**
 * Service Layer Utilities
 *
 * Shared helper functions and types used across multiple service modules
 * for consistent error handling, validation, and authorization patterns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

// ============================================================================
// Service Result Type
// ============================================================================

/**
 * Standard service result type for success/error union pattern
 * Used consistently across all service functions
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ============================================================================
// UUID Validation
// ============================================================================

/**
 * Simple UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID format
 *
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Creates a standardized error ServiceResult
 * Reduces boilerplate for error returns
 *
 * @param code - Error code (e.g., VALIDATION_ERROR, NOT_FOUND)
 * @param message - Human-readable error message
 * @returns ServiceResult with error structure
 */
export function createErrorResult<T extends string>(
  code: T,
  message: string
): { success: false; error: { code: T; message: string } } {
  return {
    success: false,
    error: { code, message },
  };
}

/**
 * Creates a standardized internal error ServiceResult from caught exceptions
 * Logs the error and returns a generic message to the user
 *
 * @param context - Context string for logging (e.g., function name)
 * @param error - The caught exception/error
 * @returns ServiceResult with INTERNAL_ERROR code
 */
export function handleUnexpectedError(context: string, error: unknown): ServiceResult<never> {
  console.error(`Unexpected error in ${context}:`, error);
  return createErrorResult("INTERNAL_ERROR", "An unexpected error occurred");
}

// ============================================================================
// Plan Ownership Verification
// ============================================================================

/**
 * Validates plan ID format and verifies plan ownership
 * Common authorization pattern used across multiple service functions
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - UUID of the plan to verify
 * @param selectFields - Fields to select from plans table (default: "id, owner_id")
 * @returns ServiceResult with plan data or authorization error
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - NOT_FOUND: Plan doesn't exist
 * - FORBIDDEN: User doesn't own the plan
 */
export async function verifyPlanOwnership(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  selectFields = "id, owner_id"
): Promise<
  | { success: true; plan: { id: string; owner_id: string; [key: string]: unknown } }
  | { success: false; error: { code: "VALIDATION_ERROR" | "NOT_FOUND" | "FORBIDDEN"; message: string } }
> {
  // Step 1: Validate UUID format
  if (!isValidUUID(planId)) {
    return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
  }

  // Step 2: Fetch plan to check existence and ownership
  const { data: plan, error: planError } = await supabase.from("plans").select(selectFields).eq("id", planId).single();

  // Step 3: Handle not found
  if (planError || !plan) {
    console.log(`Plan ${planId} not found`);
    return createErrorResult("NOT_FOUND", "Plan not found");
  }

  // Step 4: Verify ownership
  const planData = plan as unknown as { id: string; owner_id: string; [key: string]: unknown };
  if (planData.owner_id !== userId) {
    console.log(`User ${userId} attempted to access plan ${planId} owned by ${planData.owner_id}`);
    return createErrorResult("FORBIDDEN", "You don't have permission to access this plan");
  }

  return {
    success: true,
    plan: planData,
  };
}
