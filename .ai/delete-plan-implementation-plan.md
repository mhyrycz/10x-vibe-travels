# API Endpoint Implementation Plan: Delete Plan

## 1. Endpoint Overview
This document outlines the implementation plan for the `DELETE /api/plans/{planId}` endpoint. This endpoint permanently deletes a travel plan and all associated nested data (days, blocks, activities) through database cascading. The operation is irreversible and requires ownership verification.

## 2. Request Details
- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/plans/{planId}`
- **Path Parameters**:
  - `planId` (required, UUID) - The unique identifier of the plan to delete
- **Query Parameters**: None
- **Request Body**: None (DELETE requests have no body)

## 3. Used Types
The implementation will use the following TypeScript types defined in `src/types.ts`:
- **Response**: None (204 No Content has no response body)
- **Error Response**: `ErrorDto`

No response DTO needed - successful deletion returns 204 No Content with empty body.

## 4. Response Details
- **Success (204 No Content)**: Empty response body, plan and nested data deleted
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code
  \`\`\`json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Plan not found"
    }
  }
  \`\`\`

## 5. Data Flow

### Request Processing Flow:
1. **Request Reception**: Astro server endpoint at `src/pages/api/plans/[planId].ts` receives DELETE request
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token
3. **Path Parameter Extraction**: Extract `planId` from URL path
4. **Path Parameter Validation**: Validate `planId` is a valid UUID format
5. **Service Layer Call**: Call `deletePlan()` service function with planId and userId
6. **Authorization Check**: Service verifies plan exists and belongs to authenticated user
7. **Capture Context**: Fetch plan metadata BEFORE deletion (needed for event logging)
8. **Database Delete**:
   - Execute DELETE query on plans table
   - PostgreSQL automatically cascades deletion to:
     - plan_days (via foreign key on delete cascade)
     - plan_blocks (via foreign key on delete cascade through days)
     - plan_activities (via foreign key on delete cascade through blocks)
9. **Event Logging**: Log `plan_deleted` event with captured context (fire-and-forget)
   - Event retains plan_id and destination_text even after plan deletion
10. **Return Response**: Send 204 No Content (empty body)

## 6. Security Considerations

### Authentication & Authorization
- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development)
- **Authorization**: Verify `owner_id = authenticated user ID` before allowing deletion
- **IDOR Prevention**: Return 403 Forbidden if user doesn't own the plan
- **404 vs 403**: Return 404 if plan doesn't exist, 403 if exists but user doesn't own it

### Input Validation
- **UUID Validation**: Validate planId is proper UUID format before database query
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL
- **No Body Validation**: DELETE has no request body

### Deletion Safety
- **Irreversible Operation**: No confirmation at API level (frontend responsibility)
- **Cascading Deletes**: Database handles nested data deletion automatically
- **Event Preservation**: Events table retains analytics even after plan deletion (plan_id column nullable)
- **No Soft Delete**: Permanent deletion (consider implementing soft delete in future)

## 7. Error Handling

### Error Scenarios and Status Codes

**400 Bad Request**:
- Invalid UUID format for planId
- Malformed request

**403 Forbidden**:
- User doesn't own the plan (owner_id !== userId)
- Authenticated but attempting to delete another user's plan

**404 Not Found**:
- Plan with provided planId doesn't exist in database
- Plan was already deleted

**500 Internal Server Error**:
- Database connection error
- Unexpected error during delete operation
- Cascading delete failure (should not happen with proper foreign keys)
- Event logging error (logged but doesn't fail request)

### Error Response Format
All errors follow the standard `ErrorDto` structure:
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
\`\`\`

## 8. Performance Considerations

### Optimizations
- **Single Transaction**: Entire deletion happens in one database transaction
- **Cascading Deletes**: PostgreSQL handles nested deletions efficiently
- **Indexed Queries**: Uses primary key (id) and foreign keys (optimal performance)
- **Async Event Logging**: Event logging doesn't block response (fire-and-forget)
- **No Response Body**: 204 No Content eliminates serialization overhead

### Potential Bottlenecks
- **Large Plans**: Plans with many days (30) and activities could have 900+ records to delete
  - Cascading deletes still fast (<100ms typically)
  - Locks acquired during deletion might briefly block reads
- **Concurrent Operations**: Row-level locking prevents race conditions
- **Event Logging**: Minimal impact due to fire-and-forget pattern

### Scalability
- PostgreSQL handles cascading deletes efficiently even for large hierarchies
- Deletes scale well with proper indexing
- No N+1 query issues (single DELETE with cascades)
- Foreign key indexes ensure fast cascade lookups

### Database Impact
- **Locks**: Row-level locks during deletion (minimal contention)
- **Indexes**: Foreign key indexes make cascading fast
- **Constraints**: Ensures referential integrity during cascades
- **Vacuum**: PostgreSQL autovacuum reclaims space over time

## 9. Implementation Steps

### Step 1: Extend Plans Service (plans.service.ts)

**Implement `deletePlan()` service function:**
\`\`\`typescript
export async function deletePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string
): Promise<ServiceResult<null>>
\`\`\`

**Function logic:**
- Validate planId UUID format (reuse existing `isValidUUID()`)
- Fetch plan to check existence and ownership
  - SELECT id, owner_id, destination_text FROM plans WHERE id = planId
- Return NOT_FOUND if plan doesn't exist
- Return FORBIDDEN if owner_id !== userId
- **Capture plan context** (destination_text, etc.) BEFORE deletion
- Execute DELETE query: DELETE FROM plans WHERE id = planId
- Log plan_deleted event with captured context (fire-and-forget)
- Return ServiceResult with success = true, data = null

**Error handling:**
- Wrap in try-catch for unexpected errors
- Log errors but don't expose internal details
- Return INTERNAL_ERROR for database failures

### Step 2: Add DELETE Handler to Dynamic Route

**File**: `src/pages/api/plans/[planId].ts` (extend existing file with GET and PATCH handlers)

**Implement DELETE handler:**
- Extract Supabase client from `locals.supabase`
- Use DEFAULT_USER_ID for development
- Extract `planId` from `params`
- No body parsing needed (DELETE has no body)
- Call `deletePlan()` service function
- Map service errors to HTTP status codes:
  - VALIDATION_ERROR → 400
  - FORBIDDEN → 403
  - NOT_FOUND → 404
  - INTERNAL_ERROR → 500
- Return 204 No Content on success (no body)

**Example handler structure:**
\`\`\`typescript
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const userId = DEFAULT_USER_ID;
    const planId = params.planId;

    // Call service
    const result = await deletePlan(supabase, userId, planId!);

    // Handle errors
    if (!result.success) {
      // Map error codes to status codes
      // Return error response
    }

    // Success
    return new Response(null, { status: 204 });
  } catch (error) {
    // Handle unexpected errors
  }
};
\`\`\`

### Step 3: Add Event Logging

**File**: `src/lib/services/events.service.ts`

**Add `logPlanDeleted()` function:**
- Event type: `plan_deleted`
- Context: user_id, plan_id, destination_text
- Note: plan_id remains valid in events table even after plan deletion
- Fire-and-forget pattern (log errors but don't throw)

**Function signature:**
\`\`\`typescript
export async function logPlanDeleted(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  destinationText: string
): Promise<void>
\`\`\`

### Step 4: Testing Considerations

**Unit Tests**:
- Test UUID validation (invalid format → 400)
- Test authorization logic (wrong owner → 403)
- Test not found logic (non-existent plan → 404)
- Test successful deletion returns 204

**Integration Tests**:
- Create plan via POST → Delete via DELETE → 204
- Verify plan no longer exists (GET returns 404)
- Verify nested data deleted:
  - Query plan_days for deleted plan_id → empty result
  - Query plan_blocks for deleted day_id → empty result
  - Query plan_activities for deleted block_id → empty result
- Verify events table retains plan_deleted event
- Test deleting non-existent plan → 404
- Test deleting plan owned by different user → 403
- Test invalid UUID → 400

**Edge Cases**:
- Delete plan with maximum nested data (30 days, 90 blocks, 900 activities)
- Concurrent deletion attempts (verify proper locking)
- Delete plan with no activities (empty blocks)

**Manual Testing**:
- Create plan via POST
- List plans via GET (verify plan exists)
- Delete plan via DELETE
- List plans via GET (verify plan gone)
- Try to get deleted plan via GET /api/plans/{planId} → 404
- Verify event logged in events table

## 10. Notes

### Important Implementation Details
- **Irreversible**: Deletion is permanent (no soft delete)
- **Cascading**: Database automatically deletes nested records
- **Event Persistence**: plan_deleted events retained for analytics
- **No Confirmation**: API doesn't require confirmation (frontend responsibility)
- **204 Response**: Success returns empty body (standard for DELETE)

### Database Cascading Behavior
PostgreSQL foreign key constraints with `ON DELETE CASCADE`:
\`\`\`sql
-- plan_days references plans(id)
-- plan_blocks references plan_days(id)
-- plan_activities references plan_blocks(id)
-- events.plan_id references plans(id) ON DELETE SET NULL
\`\`\`

When plan is deleted:
1. PostgreSQL deletes all plan_days with plan_id = deleted_plan.id
2. For each deleted plan_day, deletes all plan_blocks
3. For each deleted plan_block, deletes all plan_activities
4. Sets events.plan_id to NULL (preserves analytics)

### Future Enhancements
- **Soft Delete**: Add `deleted_at` column, filter in queries
- **Restore Functionality**: Allow undoing deletion within time window
- **Bulk Delete**: Delete multiple plans in one request
- **Confirmation Token**: Require confirmation for large plans
- **Archive**: Move to archive table instead of deleting
- **Notification**: Notify user of successful deletion (email, webhook)

### Security Best Practices
- Always verify ownership before deletion
- Log all deletion attempts (successful and failed)
- Consider implementing deletion rate limiting
- Audit trail in events table for compliance
- Frontend should implement confirmation dialog

### Performance Monitoring
Monitor these metrics for deletion operations:
- Average deletion time by plan size
- Number of rows affected per deletion
- Failed deletion attempts (errors)
- Concurrent deletion conflicts
