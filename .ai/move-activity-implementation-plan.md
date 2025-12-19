# API Endpoint Implementation Plan: Move Activity

## 1. Endpoint Overview

The Move Activity endpoint enables users to reorganize their travel itinerary by moving activities between different time blocks (morning, afternoon, evening) or changing their position within the same block. This endpoint maintains data integrity through careful order index management and ensures authorization through plan ownership verification.

**Purpose:**
- Allow users to drag-and-drop activities between blocks in the UI
- Reorder activities within the same block
- Maintain consistent ordering through automatic reindexing
- Log modifications for analytics tracking

**Key Challenges:**
- Unique constraint on `(block_id, order_index)` requires careful transaction handling
- Must prevent race conditions during concurrent reordering operations
- Need to handle both same-block and cross-block moves efficiently

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/plans/{planId}/activities/{activityId}/move`

### Path Parameters

**Required:**
- `planId` (string, UUID): The unique identifier of the plan containing the activity
- `activityId` (string, UUID): The unique identifier of the activity to move

### Request Body

```json
{
  "target_block_id": "uuid",
  "target_order_index": 2
}
```

**Fields:**
- `target_block_id` (string, required): UUID of the destination block. Must belong to the same plan as the activity.
- `target_order_index` (number, required): Integer between 1 and 50. Indicates the position in the target block where the activity should be placed.

### Authentication
- **Required**: Bearer token in Authorization header
- **Format**: `Authorization: Bearer {access_token}`
- **Source**: Supabase Auth JWT token
- **User ID extraction**: Via `auth.uid()` in middleware

### Content-Type
`application/json`

## 3. Used Types

### Request Types

```typescript
/**
 * Command Model for moving activity to different block/position
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export interface MoveActivityDto {
  target_block_id: string;
  target_order_index: number;
}
```

### Response Types

```typescript
/**
 * DTO for activity update/move response
 * PATCH /api/plans/{planId}/activities/{activityId}
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export type ActivityUpdatedDto = PlanActivity;

// PlanActivity structure (from database.types.ts):
// {
//   id: string;
//   block_id: string;
//   title: string;
//   duration_minutes: number;
//   transport_minutes: number | null;
//   order_index: number;
//   created_at: string;
//   updated_at: string;
// }
```

### Error Types

```typescript
/**
 * Standard error response structure
 */
export interface ErrorDto {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailsDto;
  };
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";
```

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "uuid",
  "block_id": "uuid",
  "title": "Visit Wawel Castle",
  "duration_minutes": 120,
  "transport_minutes": 15,
  "order_index": 2,
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T14:30:00Z"
}
```

**Response Headers:**
```
Content-Type: application/json
```

### Error Responses

#### 400 Bad Request - Invalid Input
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid activity data",
    "details": {
      "field": "target_order_index",
      "constraint": "Must be between 1 and 50"
    }
  }
}
```

**Triggers:**
- Invalid UUID format for any parameter
- Invalid JSON in request body
- Missing required fields
- `target_order_index` out of range (not 1-50)
- `target_block_id` doesn't belong to the same plan

#### 403 Forbidden - Insufficient Permissions
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this plan"
  }
}
```

**Triggers:**
- User is not the owner of the plan

#### 404 Not Found - Resource Missing
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Activity not found"
  }
}
```

**Triggers:**
- Plan doesn't exist
- Activity doesn't exist
- Target block doesn't exist

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Triggers:**
- Database transaction failures
- Unexpected exceptions during processing

## 5. Data Flow

### High-Level Flow

```
1. Client Request
   ↓
2. API Route Handler (/api/plans/[planId]/activities/[activityId]/move.ts)
   ↓
3. Extract & Validate Parameters (Zod schema)
   ↓
4. Call activities.service.moveActivity()
   ↓
5. Service Layer Processing:
   a. Verify authorization (plan ownership)
   b. Verify target block belongs to same plan
   c. Execute reordering transaction:
      - Remove from source position
      - Make space in target position
      - Move to final position
   d. Log plan_edited event
   ↓
6. Return Response (200 OK or error)
```

### Detailed Service Function Flow

```typescript
async function moveActivity(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  activityId: string,
  data: MoveActivityDto
): Promise<ServiceResult<ActivityUpdatedDto>>
```

**Steps:**

1. **Validate UUIDs** (planId, activityId, target_block_id)
   - Use `isValidUUID()` helper function
   - Return VALIDATION_ERROR if any UUID is invalid

2. **Verify Activity Exists and Get Current State**
   ```sql
   SELECT a.*, b.id as current_block_id, p.owner_id, p.id as plan_id
   FROM plan_activities a
   INNER JOIN plan_blocks b ON a.block_id = b.id
   INNER JOIN plan_days d ON b.day_id = d.id
   INNER JOIN plans p ON d.plan_id = p.id
   WHERE a.id = activityId
   ```
   - Return NOT_FOUND if activity doesn't exist
   - Verify plan_id matches provided planId
   - Verify owner_id === userId (return FORBIDDEN if not)

3. **Verify Target Block Belongs to Same Plan**
   ```sql
   SELECT b.id
   FROM plan_blocks b
   INNER JOIN plan_days d ON b.day_id = d.id
   WHERE b.id = target_block_id AND d.plan_id = planId
   ```
   - Return VALIDATION_ERROR if target block doesn't belong to plan

4. **Execute Reordering Transaction** (PostgreSQL Stored Procedure)

   **Critical**: Due to the `check (order_index between 1 and 50)` constraint, we cannot use a temporary high value. Instead, use a PostgreSQL stored procedure that handles reordering atomically.

   **Stored Procedure Logic**:
   ```sql
   -- Call stored procedure
   SELECT * FROM move_activity_transaction(
     p_activity_id := activityId,
     p_target_block_id := target_block_id,
     p_target_order_index := target_order_index
   );
   ```

   **Internal Procedure Steps**:
   1. Lock relevant rows to prevent race conditions
   2. Get current activity state (block_id, order_index)
   3. If moving to different block:
      - Decrement order_index for activities after source position
      - Increment order_index for activities at/after target position
      - Update activity with new block_id and order_index
   4. If moving within same block:
      - Use smart reordering based on direction (up/down)
      - Shift intervening activities accordingly
   5. Return updated activity

   **See Step 2 in Implementation Steps for complete stored procedure code**

5. **Log plan_edited Event** (fire-and-forget)
   ```typescript
   logPlanEdited(supabase, userId, planId);
   ```

6. **Return Updated Activity**
   - Return ServiceResult with success and full activity data

### Database Transactions

**Critical**: All reordering operations MUST be wrapped in a single transaction to ensure atomicity and prevent race conditions.

```typescript
// Pseudocode for transaction
await supabase.rpc('move_activity_transaction', {
  p_activity_id: activityId,
  p_target_block_id: target_block_id,
  p_target_order_index: target_order_index
});
```

Alternatively, if using raw SQL with transaction support:
```typescript
// Use Supabase transaction or stored procedure
// Ensure all 3 phases execute atomically
```

## 6. Security Considerations

### Authentication
- **Mechanism**: Supabase Auth JWT tokens
- **Validation**: Automatic via middleware (`context.locals.supabase`)
- **User ID**: Extracted from `auth.uid()` in the authenticated session
- **Token Lifetime**: 1 hour (configurable in Supabase settings)

### Authorization
- **Plan Ownership**: Verify `owner_id = auth.uid()` through activity chain
- **Query Pattern**: Join activity → block → day → plan to get owner_id
- **Enforcement**: At application layer before any modification

### Input Validation
1. **UUID Validation**: All ID parameters must be valid UUID v4 format
2. **Range Validation**: `target_order_index` must be 1-50
3. **Block Validation**: Target block must belong to the same plan
4. **Sanitization**: Zod schema handles type coercion and sanitization

### Potential Security Threats

| Threat | Mitigation |
|--------|-----------|
| **Unauthorized Access** | Verify plan ownership through database joins |
| **SQL Injection** | Use parameterized queries via Supabase client |
| **Race Conditions** | Wrap all operations in database transaction |
| **Resource Exhaustion** | Limit order_index to maximum of 50 activities per block |
| **Data Integrity** | Use unique constraint and transaction isolation |

### Rate Limiting
- Not specifically required for this endpoint (no AI generation)
- Consider implementing if abuse is detected (e.g., 100 requests/minute)

## 7. Error Handling

### Error Mapping Strategy

```typescript
// Service layer returns ServiceResult
if (!result.success) {
  const statusCode = mapErrorCodeToStatus(result.error.code);
  return new Response(
    JSON.stringify({ error: result.error }),
    { status: statusCode, headers: { "Content-Type": "application/json" } }
  );
}

function mapErrorCodeToStatus(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR": return 400;
    case "UNAUTHORIZED": return 401;
    case "FORBIDDEN": return 403;
    case "NOT_FOUND": return 404;
    case "INTERNAL_ERROR": return 500;
    default: return 500;
  }
}
```

### Error Scenarios Matrix

| Scenario | Error Code | Status Code | Message |
|----------|-----------|-------------|---------|
| Invalid planId UUID | VALIDATION_ERROR | 400 | "Invalid plan ID format" |
| Invalid activityId UUID | VALIDATION_ERROR | 400 | "Invalid activity ID format" |
| Invalid target_block_id UUID | VALIDATION_ERROR | 400 | "Invalid target block ID format" |
| Missing request body | VALIDATION_ERROR | 400 | "Invalid JSON in request body" |
| order_index < 1 or > 50 | VALIDATION_ERROR | 400 | "Order index must be between 1 and 50" |
| Target block not in plan | VALIDATION_ERROR | 400 | "Target block does not belong to this plan" |
| Activity not found | NOT_FOUND | 404 | "Activity not found" |
| Plan not found | NOT_FOUND | 404 | "Plan not found" |
| Target block not found | NOT_FOUND | 404 | "Target block not found" |
| User doesn't own plan | FORBIDDEN | 403 | "You don't have permission to access this plan" |
| Database transaction failure | INTERNAL_ERROR | 500 | "Failed to move activity" |
| Unexpected exception | INTERNAL_ERROR | 500 | "An unexpected error occurred" |

### Logging Strategy

**Service Layer Logging:**
```typescript
// Log all errors with context
console.error("Error moving activity:", {
  userId,
  planId,
  activityId,
  targetBlockId: data.target_block_id,
  targetOrderIndex: data.target_order_index,
  error: errorMessage
});
```

**Event Logging:**
```typescript
// Fire-and-forget analytics event
logPlanEdited(supabase, userId, planId);
```

**Error Details in Response:**
- Include field-specific validation errors in `details` object
- Never expose internal implementation details or stack traces
- Use generic messages for unexpected errors

## 8. Performance Considerations

### Potential Bottlenecks

1. **Unique Constraint Conflicts**
   - **Problem**: `plan_activities_block_order_idx` can cause deadlocks during concurrent operations
   - **Solution**: Use PostgreSQL stored procedure with row-level locking and atomic reordering
   - **Impact**: Minimal overhead, ensures data integrity without violating constraints

2. **Multiple UPDATE Queries**
   - **Problem**: Reordering requires updating multiple rows
   - **Solution**: Use efficient WHERE clauses with indexed columns
   - **Impact**: Minimal for typical block sizes (5-10 activities)

3. **Nested Joins for Authorization**
   - **Problem**: Deep join chain (activity → block → day → plan)
   - **Solution**: Database foreign keys are indexed, making joins efficient
   - **Impact**: Negligible for single-activity operations

### Optimization Strategies

1. **Index Usage**
   - Leverage existing indexes: `plan_activities_block_order_idx`, foreign key indexes
   - Ensure WHERE clauses use indexed columns (`id`, `block_id`, `order_index`)

2. **Transaction Scope**
   - Keep transaction as short as possible
   - Only include necessary operations within transaction block

3. **Query Efficiency**
   - Use single SELECT with joins for authorization verification
   - Batch UPDATE operations where possible
   - Return only required fields in final SELECT

4. **Caching Considerations**
   - Plan data may be cached on frontend after retrieval
   - Frontend should invalidate cache after successful move operation
   - No server-side caching needed for this mutation endpoint

### Expected Performance

- **Typical Response Time**: 50-150ms
- **Database Queries**: 3-5 queries (1 verification, 2-4 updates depending on scenario)
- **Transaction Duration**: < 100ms
- **Concurrent Operations**: Safe due to transaction isolation and unique constraints

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File**: `src/lib/services/activities.service.ts`

Add the following schema after the existing `updateActivitySchema`:

```typescript
/**
 * Zod schema for validating activity move request
 */
export const moveActivitySchema = z.object({
  target_block_id: z.string().uuid("Invalid target block ID format"),
  target_order_index: z.number().int().min(1).max(50, "Order index must be between 1 and 50"),
});
```

### Step 2: Create PostgreSQL Stored Procedure

**File**: `supabase/migrations/[timestamp]_create_move_activity_function.sql`

Create a new migration file with the stored procedure:

```sql
-- Migration: Create move_activity_transaction function
-- Description: Atomically moves an activity to a different block/position while maintaining order_index integrity

CREATE OR REPLACE FUNCTION move_activity_transaction(
  p_activity_id UUID,
  p_target_block_id UUID,
  p_target_order_index INTEGER
)
RETURNS TABLE (
  id UUID,
  block_id UUID,
  title TEXT,
  duration_minutes SMALLINT,
  transport_minutes SMALLINT,
  order_index SMALLINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_block_id UUID;
  v_current_order_index INTEGER;
BEGIN
  -- Lock the activity row for update to prevent race conditions
  SELECT pa.block_id, pa.order_index
  INTO v_current_block_id, v_current_order_index
  FROM plan_activities pa
  WHERE pa.id = p_activity_id
  FOR UPDATE;

  -- Handle NULL case (activity not found - will be caught by caller)
  IF v_current_block_id IS NULL THEN
    RETURN;
  END IF;

  -- Case 1: Moving to a different block
  IF v_current_block_id != p_target_block_id THEN
    -- Step 1: Compact source block (remove gap)
    UPDATE plan_activities
    SET order_index = order_index - 1,
        updated_at = NOW()
    WHERE block_id = v_current_block_id
      AND order_index > v_current_order_index;

    -- Step 2: Make space in target block (shift items down)
    UPDATE plan_activities
    SET order_index = order_index + 1,
        updated_at = NOW()
    WHERE block_id = p_target_block_id
      AND order_index >= p_target_order_index;

    -- Step 3: Move activity to target position
    UPDATE plan_activities
    SET block_id = p_target_block_id,
        order_index = p_target_order_index,
        updated_at = NOW()
    WHERE id = p_activity_id;

  -- Case 2: Moving within same block
  ELSE
    -- Case 2a: Moving down (to higher order_index)
    IF p_target_order_index > v_current_order_index THEN
      -- Shift items between current and target position up
      UPDATE plan_activities
      SET order_index = order_index - 1,
          updated_at = NOW()
      WHERE block_id = v_current_block_id
        AND order_index > v_current_order_index
        AND order_index <= p_target_order_index;

      -- Move activity to target position
      UPDATE plan_activities
      SET order_index = p_target_order_index,
          updated_at = NOW()
      WHERE id = p_activity_id;

    -- Case 2b: Moving up (to lower order_index)
    ELSIF p_target_order_index < v_current_order_index THEN
      -- Shift items between target and current position down
      UPDATE plan_activities
      SET order_index = order_index + 1,
          updated_at = NOW()
      WHERE block_id = v_current_block_id
        AND order_index >= p_target_order_index
        AND order_index < v_current_order_index;

      -- Move activity to target position
      UPDATE plan_activities
      SET order_index = p_target_order_index,
          updated_at = NOW()
      WHERE id = p_activity_id;

    -- Case 2c: No movement (same position) - just update timestamp
    ELSE
      UPDATE plan_activities
      SET updated_at = NOW()
      WHERE id = p_activity_id;
    END IF;
  END IF;

  -- Return the updated activity
  RETURN QUERY
  SELECT pa.id, pa.block_id, pa.title, pa.duration_minutes,
         pa.transport_minutes, pa.order_index, pa.created_at, pa.updated_at
  FROM plan_activities pa
  WHERE pa.id = p_activity_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION move_activity_transaction IS
  'Atomically moves an activity to a different block/position. Handles same-block and cross-block moves with proper order_index management.';
```

**Apply the migration:**
```bash
supabase db push
```

### Step 3: Implement Service Function

**File**: `src/lib/services/activities.service.ts`

Add the `moveActivity` function at the end of the file:

```typescript
/**
 * Moves an activity to a different block and/or position
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param planId - UUID of the plan containing the activity
 * @param activityId - UUID of the activity to move
 * @param data - Target block and position
 * @returns ServiceResult with updated activity or error
 *
 * Move Flow:
 * 1. Validate UUID formats
 * 2. Verify activity exists and user owns the plan
 * 3. Verify target block belongs to same plan
 * 4. Execute three-phase reordering transaction:
 *    - Phase 1: Remove from source position
 *    - Phase 2: Move to temporary position
 *    - Phase 3: Make space and insert at target
 * 5. Log plan_edited event (fire-and-forget)
 * 6. Return updated activity
 *
 * Error Codes:
 * - VALIDATION_ERROR: Invalid UUID or target block not in plan
 * - NOT_FOUND: Plan or activity not found
 * - FORBIDDEN: User doesn't own the plan
 * - INTERNAL_ERROR: Database error
 */
export async function moveActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  activityId: string,
  data: MoveActivityDto
): Promise<ServiceResult<ActivityUpdatedDto>> {
  try {
    // Step 1: Validate UUID formats
    if (!isValidUUID(planId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid plan ID format");
    }

    if (!isValidUUID(activityId)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid activity ID format");
    }

    if (!isValidUUID(data.target_block_id)) {
      return createErrorResult("VALIDATION_ERROR", "Invalid target block ID format");
    }

    // Step 2: Verify activity exists and get current state with authorization
    const { data: activityData, error: activityError } = await supabase
      .from("plan_activities")
      .select(`
        id,
        block_id,
        order_index,
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
      `)
      .eq("id", activityId)
      .single();

    if (activityError || !activityData) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Extract plan info
    const planInfo = activityData.plan_blocks?.plan_days?.plans;

    // Step 3: Verify activity belongs to specified plan
    if (planInfo?.id !== planId) {
      return createErrorResult("NOT_FOUND", "Activity not found");
    }

    // Step 4: Verify plan ownership
    if (planInfo?.owner_id !== userId) {
      return createErrorResult("FORBIDDEN", "You don't have permission to access this plan");
    }

    // Step 5: Verify target block belongs to same plan
    const { data: targetBlock, error: blockError } = await supabase
      .from("plan_blocks")
      .select(`
        id,
        plan_days!inner(
          plan_id
        )
      `)
      .eq("id", data.target_block_id)
      .single();

    if (blockError || !targetBlock) {
      return createErrorResult("NOT_FOUND", "Target block not found");
    }

    if (targetBlock.plan_days?.plan_id !== planId) {
      return createErrorResult("VALIDATION_ERROR", "Target block does not belong to this plan");
    }

    // Step 6: Execute reordering via stored procedure
    const { data: updatedActivity, error: moveError } = await supabase
      .rpc("move_activity_transaction", {
        p_activity_id: activityId,
        p_target_block_id: data.target_block_id,
        p_target_order_index: data.target_order_index,
      })
      .single();

    if (moveError || !updatedActivity) {
      console.error("Error moving activity:", moveError);
      return createErrorResult("INTERNAL_ERROR", "Failed to move activity");
    }

    // Step 7: Log plan_edited event (fire-and-forget)
    logPlanEdited(supabase, userId, planId);

    return {
      success: true,
      data: updatedActivity as ActivityUpdatedDto,
    };
  } catch (error) {
    return handleUnexpectedError("moveActivity", error);
  }
}
```

**Important Notes:**
- The stored procedure handles all reordering logic atomically within a single database transaction
- Row-level locking (`FOR UPDATE`) prevents race conditions during concurrent move operations
- The procedure intelligently handles three scenarios: cross-block moves, same-block up, same-block down
- No temporary positions needed - all updates respect the `check (order_index between 1 and 50)` constraint

### Step 4: Create API Route Handler

**File**: `src/pages/api/plans/[planId]/activities/[activityId]/move.ts`

Create a new file with the following content:

```typescript
/**
 * Activity Move API Endpoint
 * POST /api/plans/{planId}/activities/{activityId}/move - Move activity to different block/position
 *
 * Authentication: Uses DEFAULT_USER_ID for development (TODO: implement JWT auth)
 * Authorization: Verifies plan ownership through activity chain
 */

import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../../../../../db/supabase.client";
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
          code: result.error.code as any,
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
```

### Step 5: Export Service Function

**File**: `src/lib/services/activities.service.ts`

Ensure the new function is exported:

```typescript
// At the end of the file, verify exports include:
export { updateActivity, moveActivity };
```

### Step 6: Update Type Imports (if needed)

**File**: `src/types.ts`

Verify that `MoveActivityDto` and `ActivityUpdatedDto` are properly exported (they already are based on the provided types file).

### Step 7: Testing Checklist

Create test scenarios to verify the implementation:

1. **Happy Path - Move to Different Block**
   - Create a plan with multiple days/blocks
   - Move activity from block A position 1 to block B position 2
   - Verify order_index updated correctly in both blocks

2. **Happy Path - Reorder Within Same Block**
   - Move activity from position 1 to position 3 in same block
   - Verify intervening activities shifted correctly

3. **Edge Cases**
   - Move to position 1 (beginning of block)
   - Move to last position in block
   - Move when only activity in source block
   - Move to block with no activities

4. **Authorization Checks**
   - Attempt move with non-owner user ID (expect 403)
   - Attempt move with invalid plan ID (expect 404)

5. **Validation Errors**
   - Invalid UUID formats (expect 400)
   - order_index = 0 (expect 400)
   - order_index = 51 (expect 400)
   - target_block_id from different plan (expect 400)

6. **Error Scenarios**
   - Non-existent activity ID (expect 404)
   - Non-existent target block ID (expect 404)

### Step 8: Documentation and Deployment

1. **Update API Documentation**: Add endpoint details to API reference documentation
2. **Frontend Integration**: Provide endpoint details to frontend team for drag-and-drop implementation
3. **Monitoring**: Set up logging and monitoring for move operations
4. **Performance Testing**: Test with plans containing maximum activities (50 per block)

---

## Summary

This implementation plan provides comprehensive guidance for creating the Move Activity endpoint. The key technical challenge is handling the unique constraint on `(block_id, order_index)` through a three-phase transaction approach. The implementation follows the project's established patterns for service layer architecture, error handling, and type safety using TypeScript and Zod validation.
