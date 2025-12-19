# API Endpoint Implementation Plan: Update Activity

## 1. Endpoint Overview

The Update Activity endpoint allows authenticated users to modify details of a specific activity within their travel plan. Users can update the activity title, duration, and transport time. The endpoint verifies plan ownership and logs all modifications for analytics purposes.

**Key Features**:
- Partial updates (all fields optional, at least one required)
- Plan ownership verification
- Activity-level modifications without affecting plan structure
- Event logging for audit trail

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/plans/{planId}/activities/{activityId}`
- **Authentication**: Required (Bearer token - `auth.uid()`)
- **Path Parameters**:
  - **Required**:
    - `planId` (string, UUID): The unique identifier of the plan containing the activity
    - `activityId` (string, UUID): The unique identifier of the activity to update
- **Request Body** (JSON, all fields optional but at least one required):
  ```json
  {
    "title": "Updated Activity Title",           // Optional: string, 1-200 characters
    "duration_minutes": 90,                      // Optional: integer, 5-720 minutes
    "transport_minutes": 20                      // Optional: integer, 0-600 minutes, nullable
  }
  ```

## 3. Used Types

### DTOs (Data Transfer Objects)

```typescript
/**
 * DTO for updating activity details
 * PATCH /api/plans/{planId}/activities/{activityId}
 */
export type UpdateActivityDto = Partial<
  Pick<TablesUpdate<"plan_activities">, "title" | "duration_minutes" | "transport_minutes">
>;

/**
 * DTO for activity response (already exists in types.ts)
 * Used for all activity-related responses
 */
export type ActivityDto = Omit<PlanActivity, "block_id">;
```

### Zod Validation Schema

```typescript
/**
 * Zod schema for validating activity update request
 * At least one field must be provided
 */
export const updateActivitySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    duration_minutes: z.number().int().min(5).max(720).optional(),
    transport_minutes: z.number().int().min(0).max(600).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
```

## 4. Response Details

### Success Response (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Activity Title",
  "duration_minutes": 90,
  "transport_minutes": 20,
  "order_index": 1,
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T14:00:00Z"
}
```

### Error Responses

**400 Bad Request** (Validation failure):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid activity data",
    "details": {
      "issues": [
        {
          "path": ["title"],
          "message": "String must contain at least 1 character(s)"
        }
      ]
    }
  }
}
```

**403 Forbidden** (Not plan owner):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this plan"
  }
}
```

**404 Not Found** (Plan or activity not found):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Activity not found"
  }
}
```

**500 Internal Server Error**:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Data Flow

### Request Flow

```
1. Client Request
   ↓
2. API Endpoint (PATCH /api/plans/{planId}/activities/{activityId})
   - Extract path parameters (planId, activityId)
   - Extract authenticated userId (auth.uid())
   - Parse and validate request body
   ↓
3. Service Layer (updateActivity)
   - Validate UUID formats
   - Verify plan ownership through activity chain
   - Update activity record
   - Log plan_edited event
   ↓
4. Database Operations
   - Query: activity → block → day → plan (verify ownership)
   - Update: plan_activities table
   - Insert: events table (plan_edited)
   ↓
5. Response
   - Return updated activity details
   - HTTP 200 OK
```

### Database Query Chain

```sql
-- Step 1: Verify ownership (single query with joins)
SELECT 
  a.id,
  a.block_id,
  p.id as plan_id,
  p.owner_id
FROM plan_activities a
JOIN plan_blocks b ON a.block_id = b.id
JOIN plan_days d ON b.day_id = d.id
JOIN plans p ON d.plan_id = p.id
WHERE a.id = :activityId
  AND p.id = :planId
  AND p.owner_id = :userId;

-- Step 2: Update activity
UPDATE plan_activities
SET 
  title = COALESCE(:title, title),
  duration_minutes = COALESCE(:duration_minutes, duration_minutes),
  transport_minutes = COALESCE(:transport_minutes, transport_minutes),
  updated_at = NOW()
WHERE id = :activityId
RETURNING *;

-- Step 3: Log event
INSERT INTO events (user_id, plan_id, event_type, created_at)
VALUES (:userId, :planId, 'plan_edited', NOW());
```

## 6. Security Considerations

### Authentication
- **Requirement**: Valid Bearer token required for all requests
- **Implementation**: Extract `auth.uid()` from Supabase context
- **Validation**: Reject requests without valid authentication (401)

### Authorization
- **Ownership Verification**: Must verify plan ownership through full chain:
  - activity → block → day → plan → owner_id
- **Implementation**: Use join query to verify ownership in single database call
- **Threat**: Users attempting to modify activities in plans they don't own

### Input Validation
- **UUID Validation**: Verify planId and activityId are valid UUIDs before database queries
- **Data Validation**: Use Zod schema to validate request body
- **SQL Injection**: Supabase uses parameterized queries (built-in protection)

### Potential Security Threats

1. **Authorization Bypass**:
   - **Threat**: User provides valid activityId but wrong planId
   - **Mitigation**: Verify activity belongs to specified plan AND user owns plan

2. **Data Integrity**:
   - **Threat**: Invalid data causing database constraint violations
   - **Mitigation**: Zod validation before database operations

3. **Information Disclosure**:
   - **Threat**: Error messages revealing system details
   - **Mitigation**: Generic error messages, detailed logs server-side only

## 7. Error Handling

### Error Scenarios and Responses

| Scenario | Status Code | Error Code | Message |
|----------|-------------|------------|---------|
| No fields provided | 400 | VALIDATION_ERROR | At least one field must be provided |
| Invalid UUID format | 400 | VALIDATION_ERROR | Invalid activity ID format |
| Title too short/long | 400 | VALIDATION_ERROR | String must contain between 1 and 200 characters |
| Duration out of range | 400 | VALIDATION_ERROR | Number must be between 5 and 720 |
| Transport minutes out of range | 400 | VALIDATION_ERROR | Number must be between 0 and 600 |
| Invalid JSON | 400 | VALIDATION_ERROR | Invalid JSON in request body |
| Plan not found | 404 | NOT_FOUND | Plan not found |
| Activity not found | 404 | NOT_FOUND | Activity not found |
| Activity doesn't belong to plan | 404 | NOT_FOUND | Activity not found |
| User doesn't own plan | 403 | FORBIDDEN | You don't have permission to access this plan |
| Database error | 500 | INTERNAL_ERROR | Failed to update activity |
| Unexpected error | 500 | INTERNAL_ERROR | An unexpected error occurred |

### Error Handling Strategy

1. **Validation Errors**: Caught by Zod, return 400 with detailed issues
2. **Authorization Errors**: Check ownership, return 403 if not owner
3. **Not Found Errors**: Return 404 for missing resources
4. **Database Errors**: Log error, return generic 500 message
5. **Unexpected Errors**: Catch-all try/catch, log and return 500

## 8. Performance Considerations

### Database Optimization

1. **Single Ownership Query**: Use JOIN to verify ownership in one query instead of multiple queries
2. **Index Usage**:
   - Primary key lookups for activity (fast)
   - Foreign key indexes for joins (plan_blocks.day_id, plan_days.plan_id)
3. **Selective Updates**: Only update provided fields using COALESCE

### Response Time Expectations

- **Target**: < 200ms for typical update
- **Breakdown**:
  - Validation: < 5ms
  - Ownership verification: < 50ms
  - Update operation: < 50ms
  - Event logging (fire-and-forget): < 50ms
  - Response serialization: < 10ms

### Potential Bottlenecks

1. **Chain Query**: Join across 4 tables could be slow without proper indexes
2. **Event Logging**: Synchronous insert could add latency
3. **Updated_at Trigger**: Database trigger on plan_activities table

### Optimization Strategies

1. Use fire-and-forget for event logging (don't wait for insert)
2. Ensure proper indexes on foreign keys
3. Consider caching plan ownership results (if same user updates multiple activities)

## 9. Implementation Steps

### Step 1: Add UpdateActivityDto Type Definition

**File**: `src/types.ts`

Add new DTO type after existing activity types:

```typescript
/**
 * DTO for updating activity details
 * PATCH /api/plans/{planId}/activities/{activityId}
 */
export type UpdateActivityDto = Partial<
  Pick<TablesUpdate<"plan_activities">, "title" | "duration_minutes" | "transport_minutes">
>;
```

### Step 2: Create Zod Validation Schema

**File**: `src/lib/services/activities.service.ts` (new file)

```typescript
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { UpdateActivityDto, ActivityDto } from "../../types";
import { logPlanEdited } from "./events.service";

/**
 * Zod schema for validating activity update request
 * At least one field must be provided
 */
export const updateActivitySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    duration_minutes: z.number().int().min(5).max(720).optional(),
    transport_minutes: z.number().int().min(0).max(600).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Helper functions will go here
```

### Step 3: Implement Service Function - updateActivity()

**File**: `src/lib/services/activities.service.ts`

```typescript
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
 * Creates a standardized error ServiceResult
 */
function createErrorResult<T extends string>(
  code: T,
  message: string
): { success: false; error: { code: T; message: string } } {
  return {
    success: false,
    error: { code, message },
  };
}

/**
 * Creates a standardized internal error from caught exceptions
 */
function handleUnexpectedError(context: string, error: unknown): ServiceResult<never> {
  console.error(`Unexpected error in ${context}:`, error);
  return createErrorResult("INTERNAL_ERROR", "An unexpected error occurred");
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * Updates activity details (title, duration, transport time)
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - UUID of the plan containing the activity
 * @param activityId - UUID of the activity to update
 * @param data - Partial update data (at least one field required)
 * @returns ServiceResult with updated activity or error
 *
 * Update Flow:
 * 1. Validate UUID formats
 * 2. Verify activity exists and belongs to specified plan
 * 3. Verify plan ownership (owner_id === userId)
 * 4. Update activity record with provided fields
 * 5. Log plan_edited event (fire-and-forget)
 * 6. Return updated activity
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID format
 * - NOT_FOUND: Plan or activity not found
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database error
 */
export async function updateActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  activityId: string,
  data: UpdateActivityDto
): Promise<ServiceResult<ActivityDto>> {
  try {
    // Step 1: Validate UUID formats
    if (!isValidUUID(planId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
    }

    if (!isValidUUID(activityId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid activity ID format");
    }

    // Step 2: Verify activity exists and belongs to plan, and user owns plan
    // Use single query with joins for efficiency
    const { data: verification, error: verifyError } = await supabase
      .from("plan_activities")
      .select(
        `
        id,
        block_id,
        plan_blocks!inner(
          id,
          plan_days!inner(
            id,
            plans!inner(
              id,
              owner_id
            )
          )
        )
      `
      )
      .eq("id", activityId)
      .single();

    if (verifyError || !verification) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Extract plan info from nested structure
    const planInfo = verification.plan_blocks?.plan_days?.plans;
    
    // Step 3: Verify activity belongs to specified plan
    if (planInfo?.id !== planId) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Step 4: Verify plan ownership
    if (planInfo?.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "You don't have permission to access this plan");
    }

    // Step 5: Update activity with provided fields
    const { data: updatedActivity, error: updateError } = await supabase
      .from("plan_activities")
      .update(data)
      .eq("id", activityId)
      .select("id, title, duration_minutes, transport_minutes, order_index, created_at, updated_at")
      .single();

    if (updateError || !updatedActivity) {
      console.error("Error updating activity:", updateError);
      return createErrorResult("INTERNAL_ERROR", "Failed to update activity");
    }

    // Step 6: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: updatedActivity as ActivityDto,
    };
  } catch (error) {
    return handleUnexpectedError("updateActivity", error);
  }
}
```

### Step 4: Create API Endpoint Handler

**File**: `src/pages/api/plans/[planId]/activities/[activityId].ts` (new file)

Create directory structure: `src/pages/api/plans/[planId]/activities/`

```typescript
/**
 * Activity Management API Endpoint
 * PATCH /api/plans/{planId}/activities/{activityId} - Update activity details
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Authorization: Verifies plan ownership before update
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
 * - duration_minutes (optional, integer, 5-720): Updated duration
 * - transport_minutes (optional, integer, 0-600, nullable): Updated transport time
 *
 * @returns 200 OK with updated activity details
 * @returns 400 Bad Request if validation fails
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

    // Step 7: Handle service errors
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
    // Catch any unexpected errors
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
```

### Step 5: Export Schema and Function

**File**: `src/lib/services/activities.service.ts`

Ensure exports at the top of file:

```typescript
export { updateActivitySchema, updateActivity };
export type { ServiceResult };
```

### Step 6: Testing Checklist

**Unit Tests**:
- [ ] Validate Zod schema with valid data
- [ ] Validate Zod schema rejects invalid data
- [ ] Test updateActivity with valid data
- [ ] Test updateActivity with invalid UUIDs
- [ ] Test updateActivity with non-existent activity
- [ ] Test updateActivity with wrong plan owner

**Integration Tests**:
- [ ] PATCH with valid data returns 200
- [ ] PATCH with no fields returns 400
- [ ] PATCH with invalid UUID returns 400
- [ ] PATCH with non-existent activity returns 404
- [ ] PATCH as wrong user returns 403
- [ ] PATCH logs plan_edited event

**Manual Testing**:
1. Update activity title only
2. Update duration only
3. Update transport_minutes to null
4. Update all fields at once
5. Attempt to update activity in plan owned by different user
6. Verify updated_at timestamp changes
7. Verify plan_edited event is logged

### Step 7: Error Monitoring

- Add error tracking for failed updates
- Monitor 403 errors (potential security issues)
- Track update frequency per user
- Alert on high 500 error rates

### Step 8: Documentation Updates

- Update API documentation with new endpoint
- Add example requests/responses to README
- Document error codes and meanings
- Update Postman collection with new endpoint
