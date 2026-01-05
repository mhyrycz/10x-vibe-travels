/**
 * VibeTravels DTO and Command Model Type Definitions
 *
 * This file contains all Data Transfer Object (DTO) types and Command Models
 * used throughout the application for API requests and responses.
 * All types are derived from the database entity definitions in database.types.ts
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Type Aliases for Database Tables and Enums
// ============================================================================

type UserPreferences = Tables<"user_preferences">;
type Plan = Tables<"plans">;
type PlanDay = Tables<"plan_days">;
type PlanActivity = Tables<"plan_activities">;
type Event = Tables<"events">;

type UserRoleEnum = Enums<"user_role_enum">;
type TripTypeEnum = Enums<"trip_type_enum">;
type ComfortLevelEnum = Enums<"comfort_level_enum">;
type BudgetLevelEnum = Enums<"budget_level_enum">;
type EventTypeEnum = Enums<"event_type_enum">;
type TransportModeEnum = Enums<"transport_mode_enum">;

// ============================================================================
// User Preferences DTOs
// ============================================================================

/**
 * DTO for creating user preferences during onboarding
 * POST /api/users/me/preferences
 */
export type CreateUserPreferencesDto = Pick<
  TablesInsert<"user_preferences">,
  "people_count" | "trip_type" | "age" | "country" | "comfort" | "budget"
>;

/**
 * DTO for updating user preferences
 * PATCH /api/users/me/preferences
 */
export type UpdateUserPreferencesDto = Partial<CreateUserPreferencesDto>;

/**
 * DTO for user preferences response
 * GET /api/users/me/preferences
 */
export type UserPreferencesDto = UserPreferences;

// ============================================================================
// User Account DTOs
// ============================================================================

/**
 * DTO for current user account information
 * GET /api/users/me
 *
 * Combines data from auth.users (Supabase) and user_roles tables
 */
export interface UserAccountDto {
  id: string;
  email: string;
  role: UserRoleEnum;
  created_at: string;
}

// ============================================================================
// Plan DTOs
// ============================================================================

/**
 * DTO for creating a new travel plan with AI generation
 * POST /api/plans
 */
export type CreatePlanDto = Pick<
  TablesInsert<"plans">,
  | "destination_text"
  | "date_start"
  | "date_end"
  | "note_text"
  | "people_count"
  | "trip_type"
  | "comfort"
  | "budget"
  | "transport_modes"
>;

/**
 * DTO for updating plan metadata
 * PATCH /api/plans/{planId}
 */
export type UpdatePlanDto = Partial<Pick<TablesUpdate<"plans">, "name" | "budget" | "note_text" | "people_count">>;

/**
 * DTO for regenerating plan itinerary with updated parameters
 * POST /api/plans/{planId}/regenerate
 */
export type RegeneratePlanDto = Partial<
  Pick<TablesUpdate<"plans">, "date_start" | "date_end" | "note_text" | "comfort" | "transport_modes">
>;

/**
 * DTO for plan list item (summary view)
 * GET /api/plans (list response item)
 */
export type PlanListItemDto = Pick<Plan, "id" | "name" | "destination_text" | "date_start" | "date_end" | "created_at">;

/**
 * DTO for activity within a day
 * Used in nested plan responses
 *
 * Omits day_id as it's implied by parent day context
 * Includes description for AI-generated context and custom activity notes
 */
export type ActivityDto = Omit<PlanActivity, "day_id">;

/**
 * DTO for plan day with nested activities and computed warnings
 * Used in nested plan responses
 *
 * Includes computed fields:
 * - activities: Flat array of activities for the day
 * - total_duration_minutes: Sum of all activity durations + transport times
 * - warning: Alert message if day exceeds 12 hours
 *
 * Omits plan_id as it's implied by parent plan context
 */
export type DayDto = Omit<PlanDay, "plan_id" | "created_at" | "updated_at"> & {
  activities: ActivityDto[];
  total_duration_minutes: number;
  warning: string | null;
};

/**
 * DTO for complete plan with full nested structure
 * GET /api/plans/{planId}
 * POST /api/plans (creation response)
 */
export type PlanDto = Plan & {
  days: DayDto[];
};

/**
 * DTO for plan update response
 * PATCH /api/plans/{planId}
 */
export type PlanUpdatedDto = Pick<Plan, "id" | "name" | "budget" | "note_text" | "people_count" | "updated_at">;

// ============================================================================
// Activity DTOs
// ============================================================================

/**
 * DTO for updating activity details
 * PATCH /api/plans/{planId}/activities/{activityId}
 */
export type UpdateActivityDto = Partial<
  Pick<TablesUpdate<"plan_activities">, "title" | "duration_minutes" | "transport_minutes" | "description">
>;

/**
 * DTO for creating custom activity
 * POST /api/plans/{planId}/days/{dayId}/activities
 */
export interface CreateActivityDto {
  title: string;
  description?: string | null;
  duration_minutes?: number;
  transport_minutes?: number | null;
}

/**
 * Command Model for moving activity to different day/position
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export interface MoveActivityDto {
  target_day_id: string;
  target_order_index: number;
}

/**
 * DTO for activity update/move response
 * PATCH /api/plans/{planId}/activities/{activityId}
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export type ActivityUpdatedDto = PlanActivity;

// ============================================================================
// Admin DTOs
// ============================================================================

/**
 * DTO for platform-wide statistics
 * GET /api/admin/stats
 */
export interface AdminStatsDto {
  total_users: number;
  total_plans: number;
  generated_at: string;
}

/**
 * DTO for user list item in admin panel
 * GET /api/admin/users
 *
 * Combines auth.users, user_roles, and aggregated plan counts
 */
export interface AdminUserListItemDto {
  id: string;
  email: string;
  role: UserRoleEnum;
  created_at: string;
  has_preferences: boolean;
  plan_count: number;
}

/**
 * DTO for plan list item in admin panel
 * GET /api/admin/plans
 *
 * Extends plan data with owner email from auth.users
 */
export type AdminPlanListItemDto = Pick<Plan, "id" | "name" | "destination_text" | "owner_id" | "created_at"> & {
  owner_email: string;
};

// ============================================================================
// Pagination DTOs
// ============================================================================

/**
 * DTO for pagination metadata
 * Used in all paginated list responses
 */
export interface PaginationDto {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Generic DTO for paginated list responses
 * Wraps data array with pagination metadata
 */
export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}

/**
 * Specific paginated response types for type safety
 */
export type PaginatedPlansDto = PaginatedResponseDto<PlanListItemDto>;
export type PaginatedAdminUsersDto = PaginatedResponseDto<AdminUserListItemDto>;
export type PaginatedAdminPlansDto = PaginatedResponseDto<AdminPlanListItemDto>;

// ============================================================================
// Error DTOs
// ============================================================================

/**
 * Standard error code enumeration
 * Maps to HTTP status codes and business logic errors
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

/**
 * DTO for error details
 * Provides specific information about validation failures
 */
export interface ErrorDetailsDto {
  field?: string;
  constraint?: string;
  [key: string]: unknown;
}

/**
 * DTO for standard error responses
 * All API errors follow this structure
 */
export interface ErrorDto {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailsDto;
  };
}

// ============================================================================
// Event DTOs (for internal logging)
// ============================================================================

/**
 * DTO for creating event log entries
 * Used internally for analytics tracking
 */
export type CreateEventDto = Pick<
  TablesInsert<"events">,
  "user_id" | "event_type" | "plan_id" | "destination_text" | "transport_modes" | "trip_length_days"
>;

/**
 * DTO for event log entry
 * Read-only analytics data
 */
export type EventDto = Event;

// ============================================================================
// Query Parameter DTOs
// ============================================================================

/**
 * DTO for list query parameters
 * Common pagination and sorting options
 */
export interface ListQueryDto {
  limit?: number;
  offset?: number;
  sort?: string;
}

/**
 * DTO for admin users list query parameters
 * Extends base list query with search functionality
 */
export type AdminUsersQueryDto = ListQueryDto & {
  search?: string;
};

/**
 * DTO for admin plans list query parameters
 * Extends base list query with user filtering
 */
export type AdminPlansQueryDto = ListQueryDto & {
  user_id?: string;
};

// ============================================================================
// Re-export Enums for Convenience
// ============================================================================

export type { UserRoleEnum, TripTypeEnum, ComfortLevelEnum, BudgetLevelEnum, EventTypeEnum, TransportModeEnum };
