# API Endpoint Implementation Plan: Regenerate Plan

## 1. Endpoint Overview

This document outlines the implementation plan for the `POST /api/plans/{planId}/regenerate` endpoint. This endpoint regenerates a travel plan's itinerary using AI while preserving the plan's identity and allowing parameter updates. Unlike creating a new plan, this endpoint updates an existing plan by deleting all nested data (days, blocks, activities) and regenerating them with fresh AI content.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/plans/{planId}/regenerate`
- **Path Parameters**:
  - `planId` (required, UUID) - The unique identifier of the plan to regenerate
- **Query Parameters**: None
- **Request Body** (all fields optional):
  ```json
  {
    "date_start": "2024-06-15",
    "date_end": "2024-06-22",
    "note_text": "Updated travel notes and preferences",
    "comfort": "luxury",
    "transport_modes": ["plane", "car", "train"]
  }
  ```

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Request Body**: `RegeneratePlanDto`
- **Success Response**: `PlanDto` (complete plan with nested structure)
- **Error Response**: `ErrorDto`

```typescript
export type RegeneratePlanDto = Partial<
  Pick<TablesUpdate<"plans">, "date_start" | "date_end" | "note_text" | "comfort" | "transport_modes">
>;
```

## 4. Response Details

- **Success (200 OK)**: Returns complete regenerated plan with nested structure (`PlanDto`)
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Plan regeneration limit reached. Maximum 10 regenerations per hour."
    }
  }
  ```

## 5. Data Flow

### Request Processing Flow:

1. **Request Reception**: Astro server endpoint at `src/pages/api/plans/[planId]/regenerate.ts` receives POST request
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token
3. **Path Parameter Extraction**: Extract `planId` from URL path
4. **Path Parameter Validation**: Validate `planId` is a valid UUID format
5. **Request Body Parsing**: Parse JSON body (allow empty body for regeneration with existing params)
6. **Input Validation**: Validate request body against `RegeneratePlanDto` schema using Zod
7. **Service Layer Call**: Call `regeneratePlan()` service function with planId, userId, and update parameters
8. **Rate Limiting Check**: Verify user hasn't exceeded 10 regenerations per hour (shared bucket with plan creation)
9. **Authorization Check**: Verify plan exists and belongs to authenticated user
10. **Parameter Merging**: Merge provided updates with existing plan parameters
11. **AI Generation**: Call AI service to generate new itinerary with merged parameters
12. **Database Transaction**:
    - Update plan table with new parameters and regeneration timestamp
    - Delete all existing nested data (days, blocks, activities)
    - Insert newly generated days, blocks, and activities
13. **Event Logging**: Log `plan_regenerated` event (fire-and-forget)
14. **Fetch Complete Plan**: Retrieve updated plan with full nested structure
15. **Return Response**: Send 200 OK with complete `PlanDto`

## 6. Security Considerations

### Authentication & Authorization

- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development)
- **Authorization**: Verify `owner_id = authenticated user ID` before allowing regeneration
- **IDOR Prevention**: Return 403 Forbidden if user doesn't own the plan
- **404 vs 403**: Return 404 if plan doesn't exist, 403 if exists but user doesn't own it

### Rate Limiting

- **Shared Bucket**: Regeneration shares the 10/hour rate limit with plan creation
- **Rationale**: Both operations consume expensive AI resources
- **Enforcement**: Check rate limit before AI generation
- **Response**: Return 429 Too Many Requests with RATE_LIMIT_EXCEEDED error code

### Input Validation

- **UUID Validation**: Validate planId is proper UUID format before database query
- **Zod Schema**: Validate request body structure and field types
- **Date Validation**: Ensure date_start is not in the past, date_end > date_start
- **Optional Fields**: All body fields are optional (can regenerate with existing params)
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL

### Data Integrity

- **Transaction Safety**: All database operations wrapped in transaction (rollback on failure)
- **Cascading Deletes**: Nested data deletion handled by database foreign keys
- **Atomic Updates**: Plan parameters and nested data updated atomically
- **Rollback on AI Failure**: If AI generation fails, transaction rolls back (plan unchanged)

## 7. Error Handling

### Error Scenarios and Status Codes

**400 Bad Request**:

- Invalid UUID format for planId
- Invalid JSON in request body
- Validation errors (date_start in past, date_end before date_start, etc.)
- Invalid enum values (comfort, transport_modes)

**403 Forbidden**:

- User doesn't own the plan (owner_id !== userId)
- Authenticated but attempting to regenerate another user's plan

**404 Not Found**:

- Plan with provided planId doesn't exist in database
- Plan was deleted

**429 Too Many Requests**:

- Rate limit exceeded (>10 regenerations/creations per hour)
- Error code: RATE_LIMIT_EXCEEDED

**500 Internal Server Error**:

- Database connection error
- Transaction failure (rollback executed)
- AI service error (generation failed)
- Unexpected error during nested data insertion

**503 Service Unavailable**:

- AI service temporarily unavailable
- External API timeout

### Error Response Format

All errors follow the standard `ErrorDto` structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "date_start",
      "constraint": "must_be_future"
    }
  }
}
```

## 8. Performance Considerations

### Optimizations

- **Single Transaction**: All database operations in one transaction (atomicity + performance)
- **Cascading Deletes**: PostgreSQL handles nested deletions efficiently
- **Batch Inserts**: Days, blocks, and activities inserted in batches
- **Indexed Queries**: Uses primary keys and foreign keys (optimal performance)
- **Async Event Logging**: Event logging doesn't block response (fire-and-forget)
- **AI Caching**: Consider caching AI responses for identical inputs (future enhancement)

### Potential Bottlenecks

- **AI Generation Time**: AI service call is the slowest operation (2-8 seconds typical)
  - Users should see loading indicator in UI
  - Consider websocket/SSE for progress updates (future enhancement)
- **Large Plans**: Plans with 30 days and 900+ activities take longer to insert
  - Still acceptable (<2 seconds for inserts)
- **Rate Limiting Checks**: Redis/database query adds minimal latency (<10ms)
- **Transaction Locks**: Row-level locks during update (minimal contention)

### Scalability

- AI service is the scaling bottleneck (consider queueing for high load)
- Database operations scale well with proper indexing
- Rate limiting prevents resource exhaustion
- Consider implementing async regeneration with job queue (future enhancement)

### Database Impact

- **Locks**: Row-level locks during transaction (minimal contention)
- **Indexes**: Foreign key indexes ensure fast cascade lookups
- **Transaction Log**: Large regenerations increase WAL size (normal for Postgres)
- **Vacuum**: Autovacuum handles space reclamation from deleted nested data

## 9. Implementation Steps

### Step 1: Create Regenerate Endpoint Route

**Create new file**: `src/pages/api/plans/[planId]/regenerate.ts`

**Implement POST handler:**

- Export `prerender = false` for SSR
- Extract Supabase client from `locals.supabase`
- Use DEFAULT_USER_ID for development
- Extract `planId` from `params`
- Parse request body (allow empty body)
- Validate body with Zod schema
- Call `regeneratePlan()` service function
- Map service errors to HTTP status codes
- Return 200 OK with complete PlanDto on success

**Example handler structure:**

```typescript
export const prerender = false;

export const POST: APIRoute = async ({ request, params, locals }) => {
  try {
    const supabase = locals.supabase;
    const userId = DEFAULT_USER_ID;
    const planId = params.planId;

    // Parse and validate body
    const body = await request.json().catch(() => ({}));
    const validation = regeneratePlanSchema.safeParse(body);

    if (!validation.success) {
      // Return 400 with validation errors
    }

    // Call service
    const result = await regeneratePlan(supabase, userId, planId!, validation.data);

    // Handle errors and return response
  } catch (error) {
    // Handle unexpected errors
  }
};
```

### Step 2: Add Zod Validation Schema

**File**: `src/lib/services/plans.service.ts`

**Create `regeneratePlanSchema`:**

```typescript
export const regeneratePlanSchema = z
  .object({
    date_start: z
      .string()
      .refine(
        (date) => {
          const startDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return startDate >= today;
        },
        { message: "Start date cannot be in the past" }
      )
      .optional(),
    date_end: z.string().optional(),
    note_text: z.string().max(20000).optional(),
    comfort: z.enum(["budget", "moderate", "luxury"]).optional(),
    transport_modes: z.array(z.enum(["plane", "car", "train", "bus", "ferry", "walk"])).optional(),
  })
  .refine(
    (data) => {
      if (data.date_start && data.date_end) {
        return new Date(data.date_end) > new Date(data.date_start);
      }
      return true;
    },
    { message: "End date must be after start date" }
  );
```

### Step 3: Implement Service Function

**File**: `src/lib/services/plans.service.ts`

**Implement `regeneratePlan()` function:**

```typescript
export async function regeneratePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  updates: RegeneratePlanDto
): Promise<ServiceResult<PlanDto>>;
```

**Function logic:**

1. **Validate UUID**: Check planId format
2. **Check Rate Limit**: Verify user hasn't exceeded 10/hour (reuse existing rate limiter)
3. **Verify Ownership**: Fetch plan and check owner_id === userId
4. **Merge Parameters**: Combine provided updates with existing plan parameters
5. **Generate AI Itinerary**: Call `generatePlanItinerary()` with merged parameters
6. **Database Transaction**:
   - Update plan table (new params, regenerated_at timestamp)
   - Delete nested data (cascades automatically)
   - Insert new days
   - Insert new blocks
   - Insert new activities
7. **Log Event**: Call `logPlanRegenerated()` (fire-and-forget)
8. **Fetch Complete**: Retrieve full plan with nested structure
9. **Return Success**: Return ServiceResult with PlanDto

**Error handling:**

- Wrap in try-catch for unexpected errors
- Return appropriate error codes
- Ensure transaction rollback on failure

### Step 4: Add Event Logging

**File**: `src/lib/services/events.service.ts`

**Add `logPlanRegenerated()` function:**

```typescript
export async function logPlanRegenerated(
  supabase: SupabaseClient<Database>,
  userId: string,
  planId: string,
  destinationText: string,
  transportModes: string[],
  tripLengthDays: number
): Promise<void>;
```

- Event type: `plan_regenerated`
- Context: user_id, plan_id, destination_text, transport_modes, trip_length_days
- Fire-and-forget pattern

### Step 5: Update Rate Limiter (if needed)

**File**: `src/lib/services/plans.service.ts`

**Ensure rate limiter counts regenerations:**

- Rate limit key should be based on user_id only (not plan_id)
- Share the same 10/hour bucket with plan creation
- Consider separate limits in future (e.g., 10 creates + 5 regenerates)

### Step 6: Testing Considerations

**Unit Tests**:

- Test parameter merging logic (provided updates override existing)
- Test validation (dates, enums, required fields)
- Test rate limiting (shared bucket with creation)
- Test authorization (ownership check)

**Integration Tests**:

- Create plan → Regenerate with no params → 200 (same params, new itinerary)
- Create plan → Regenerate with updated dates → 200 (new dates + new itinerary)
- Regenerate non-existent plan → 404
- Regenerate plan owned by different user → 403
- Exceed rate limit → 429
- Invalid UUID → 400
- Invalid dates (past, end before start) → 400
- Verify old nested data deleted, new data inserted
- Verify event logged with plan_regenerated type

**Edge Cases**:

- Empty request body (regenerate with existing params)
- Partial updates (only date_start, only comfort, etc.)
- Concurrent regeneration attempts (transaction isolation)
- AI service failure (rollback transaction)
- Maximum plan size (30 days, 900 activities)

**Manual Testing**:

- Create plan via POST
- Get plan via GET (note itinerary details)
- Regenerate with same params → different itinerary
- Regenerate with updated dates → new date range + new itinerary
- Verify plan_id unchanged (same plan entity)
- Verify regenerated_at timestamp updated
- Verify events table has plan_regenerated event

## 10. Notes

### Important Implementation Details

- **Plan Identity Preserved**: Same plan_id, only nested data changes
- **Parameter Persistence**: **Updates ARE persisted to the plan record** (date_start, date_end, comfort, transport_modes, note_text). This was clarified during planning - the regenerated plan uses the merged parameters going forward, not just for this regeneration.
- **Optional Updates**: All request body fields are optional (can regenerate without changes)
- **Rate Limit Sharing**: Regeneration shares 10/hour bucket with plan creation
- **Atomic Operation**: All updates happen in single transaction (rollback on failure)
- **AI Variability**: Same inputs produce different itineraries (AI creativity)

### Key Differences from POST /api/plans

| Aspect              | POST /api/plans (Create)     | POST /api/plans/{planId}/regenerate |
| ------------------- | ---------------------------- | ----------------------------------- |
| Creates new plan    | ✅ Yes (new plan_id)         | ❌ No (same plan_id)                |
| Requires all params | ✅ Yes (all fields required) | ❌ No (all fields optional)         |
| Deletes nested data | ❌ N/A (no existing data)    | ✅ Yes (cascading delete)           |
| Updates plan record | ❌ N/A (creates new)         | ✅ Yes (updates existing)           |
| Authorization check | ❌ N/A (owner is creator)    | ✅ Yes (must own plan)              |
| Rate limit          | ✅ 10/hour                   | ✅ 10/hour (shared bucket)          |

### Parameter Merging Behavior

When regenerating a plan, the service merges provided updates with existing parameters:

```typescript
// Example: Existing plan has these parameters
{
  date_start: "2024-06-01",
  date_end: "2024-06-07",
  comfort: "moderate",
  transport_modes: ["plane", "car"],
  note_text: "Beach vacation"
}

// User requests regeneration with partial updates
{
  date_end: "2024-06-10",
  comfort: "luxury"
}

// Merged parameters used for AI generation AND persisted to plan
{
  date_start: "2024-06-01",        // unchanged
  date_end: "2024-06-10",          // updated (persisted)
  comfort: "luxury",                // updated (persisted)
  transport_modes: ["plane", "car"], // unchanged
  note_text: "Beach vacation"      // unchanged
}
```

**IMPORTANT**: The merged parameters are **persisted to the plan record**, not just used for this regeneration. Subsequent GET requests will return the updated parameters.

### Future Enhancements

- **Async Regeneration**: Use job queue for long-running regenerations
- **Progress Updates**: Websocket/SSE for real-time generation status
- **Regeneration History**: Store previous versions for comparison/rollback
- **Partial Regeneration**: Regenerate specific days or blocks only
- **AI Prompt Customization**: Allow users to guide AI with custom instructions
- **Separate Rate Limits**: Different limits for creation vs regeneration
- **Cost Tracking**: Monitor AI usage per user for billing/limits
- **Caching Strategy**: Cache AI responses for identical inputs (24h TTL)

### Security Best Practices

- Always verify ownership before regeneration
- Rate limit aggressively (AI is expensive)
- Log all regeneration attempts (successful and failed)
- Monitor for abuse patterns (rapid regenerations)
- Consider implementing cooldown period between regenerations
- Validate all date inputs to prevent time-based attacks

### Performance Monitoring

Monitor these metrics for regeneration operations:

- Average regeneration time (AI + database operations)
- AI service success/failure rate
- Rate limit hit rate
- Transaction rollback frequency
- Average plan size (days/blocks/activities)
- User regeneration patterns (how often per plan)
