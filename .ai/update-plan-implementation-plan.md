# API Endpoint Implementation Plan: Update Plan Metadata

## 1. Endpoint Overview

This document outlines the implementation plan for the `PATCH /api/plans/{planId}` endpoint. This endpoint allows users to update plan metadata fields (name, budget, note_text, people_count) without regenerating the itinerary. It provides a lightweight alternative to full plan regeneration for simple metadata changes.

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/plans/{planId}`
- **Path Parameters**:
  - `planId` (required, UUID) - The unique identifier of the plan to update
- **Query Parameters**: None
- **Request Body** (all fields optional):

```json
{
  "name": "Updated Plan Name",
  "budget": "luxury",
  "note_text": "Updated travel notes...",
  "people_count": 3
}
```

**Field Validation:**

- `name`: String, length between 1 and 140 characters
- `budget`: Enum ['budget', 'moderate', 'luxury']
- `note_text`: String, maximum length 20000 characters
- `people_count`: Integer between 1 and 20
- At least one field must be provided (empty body = 400 error)

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Request**: `UpdatePlanDto` - Partial update object
- **Response**: `PlanUpdatedDto` - Updated fields with updated_at timestamp
- **Error Response**: `ErrorDto`

Types already defined in `src/types.ts`:

```typescript
export type UpdatePlanDto = Partial<Pick<TablesUpdate<"plans">, "name" | "budget" | "note_text" | "people_count">>;

export type PlanUpdatedDto = Pick<Plan, "id" | "name" | "budget" | "note_text" | "people_count" | "updated_at">;
```

## 4. Response Details

- **Success (200 OK)**: Returns updated plan metadata with timestamp
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Plan Name",
    "budget": "luxury",
    "note_text": "Updated travel notes...",
    "people_count": 3,
    "updated_at": "2025-12-15T12:00:00Z"
  }
  ```
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code

## 5. Data Flow

### Request Processing Flow:

1. **Request Reception**: Astro server endpoint at `src/pages/api/plans/[planId].ts` receives PATCH request
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token
3. **Path Parameter Extraction**: Extract `planId` from URL path
4. **Path Parameter Validation**: Validate `planId` is a valid UUID format
5. **Request Body Parsing**: Parse JSON body
6. **Request Body Validation**:
   - Check at least one field is provided (not empty object)
   - Validate each provided field with Zod schema
   - Return 400 if validation fails
7. **Service Layer Call**: Call `updatePlan()` service function with planId, userId, and validated data
8. **Authorization Check**: Service verifies plan exists and belongs to authenticated user
9. **Database Update**:
   - Update plan record with provided fields
   - Database automatically updates `updated_at` timestamp via trigger
10. **Event Logging**: Log `plan_edited` event asynchronously (fire-and-forget)
11. **Fetch Updated Data**: Query plan to get updated values and timestamp
12. **Return Response**: Send 200 OK with `PlanUpdatedDto`

## 6. Security Considerations

### Authentication & Authorization

- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development)
- **Authorization**: Verify `owner_id = authenticated user ID` before allowing update
- **IDOR Prevention**: Return 403 Forbidden if user doesn't own the plan
- **404 vs 403**: Return 404 if plan doesn't exist, 403 if exists but user doesn't own it

### Input Validation

- **UUID Validation**: Validate planId is proper UUID format before database query
- **Field Whitelisting**: Only allow updating specific fields (name, budget, note_text, people_count)
- **Mass Assignment Protection**: Cannot update owner_id, dates, destination, or nested structures
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL
- **Empty Body Check**: Require at least one field to prevent no-op requests

### Data Validation

- **Name Length**: 1-140 characters (enforced by Zod and database constraint)
- **Note Length**: Maximum 20000 characters (enforced by Zod and database constraint)
- **People Count**: 1-20 range (enforced by Zod and database constraint)
- **Budget Enum**: Must be one of ['budget', 'moderate', 'luxury']

## 7. Error Handling

### Error Scenarios and Status Codes

**400 Bad Request**:

- Invalid UUID format for planId
- Empty request body (no fields provided)
- Validation failure for provided fields:
  - name too short (< 1) or too long (> 140)
  - note_text too long (> 20000)
  - people_count out of range (< 1 or > 20)
  - budget not in enum values

**403 Forbidden**:

- User doesn't own the plan (owner_id !== userId)
- Authenticated but attempting to modify another user's plan

**404 Not Found**:

- Plan with provided planId doesn't exist in database

**500 Internal Server Error**:

- Database connection error
- Unexpected error during update operation
- Database constraint violation (shouldn't happen with proper validation)

### Error Response Format

All errors follow the standard `ErrorDto` structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "issues": []
    }
  }
}
```

## 8. Performance Considerations

### Optimizations

- **Single-Row Update**: Updates only one plan record (very fast)
- **Selective Fields**: Updates only provided fields, not entire row
- **Indexed Query**: Uses primary key (id) for update (optimal performance)
- **Async Event Logging**: Event logging doesn't block response (fire-and-forget)
- **Minimal Data Return**: Returns only updated fields + id + timestamp

### Potential Bottlenecks

- **Database Trigger**: `updated_at` trigger adds minimal overhead
- **Authorization Check**: Requires one additional SELECT before UPDATE
  - Could be optimized by combining SELECT and UPDATE in transaction
- **Event Logging**: Minimal impact due to fire-and-forget pattern

### Scalability

- Single-row updates scale well (no joins or complex queries)
- PostgreSQL handles concurrent updates efficiently with row-level locking
- Event logging is asynchronous (doesn't impact response time)

## 9. Implementation Steps

### Step 1: Extend Plans Service (plans.service.ts)

**Add Zod validation schema:**

```typescript
export const updatePlanSchema = z
  .object({
    name: z.string().min(1).max(140).optional(),
    budget: z.enum(["budget", "moderate", "luxury"]).optional(),
    note_text: z.string().max(20000).optional(),
    people_count: z.number().int().min(1).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
```

**Implement `updatePlan()` service function:**

- Accept: `SupabaseClient`, `userId`, `planId`, `data: UpdatePlanDto`
- Validate planId UUID format (reuse existing `isValidUUID()`)
- Fetch plan to check existence and ownership
- Return NOT_FOUND if plan doesn't exist
- Return FORBIDDEN if owner_id !== userId
- Update plan with provided fields
- Log plan_edited event (fire-and-forget)
- Fetch updated plan data
- Return ServiceResult<PlanUpdatedDto>

### Step 2: Add PATCH Handler to Dynamic Route

**File**: `src/pages/api/plans/[planId].ts` (extend existing file with GET handler)

**Implement PATCH handler:**

- Extract Supabase client from `locals.supabase`
- Use DEFAULT_USER_ID for development
- Extract `planId` from `params`
- Parse request body
- Validate with `updatePlanSchema`
- Call `updatePlan()` service function
- Map service errors to HTTP status codes:
  - VALIDATION_ERROR → 400
  - FORBIDDEN → 403
  - NOT_FOUND → 404
  - INTERNAL_ERROR → 500
- Return 200 OK with `PlanUpdatedDto` on success

### Step 3: Add Event Logging Helper (if not exists)

**File**: `src/lib/services/events.service.ts`

**Add or verify `logPlanEdited()` function exists:**

- Event type: `plan_edited`
- Context: user_id, plan_id
- Fire-and-forget pattern (log errors but don't block)

### Step 4: Testing Considerations

**Unit Tests**:

- Test Zod schema validation for each field
- Test empty body rejection
- Test field length/range constraints
- Test enum validation for budget

**Integration Tests**:

- Test updating single field (name only) → 200
- Test updating multiple fields → 200
- Test with empty body → 400
- Test with invalid budget enum → 400
- Test with name too long → 400
- Test with people_count out of range → 400
- Test updating non-existent plan → 404
- Test updating plan owned by different user → 403
- Verify updated_at timestamp changes
- Verify plan_edited event logged

**Manual Testing**:

- Create plan via POST /api/plans
- Update plan name via PATCH
- Verify name changed and updated_at updated
- Update multiple fields at once
- Verify partial updates work (only provided fields change)

## 10. Notes

### Important Implementation Details

- This endpoint does NOT modify dates, destination, or itinerary structure
- For date changes, use POST /api/plans/{planId}/regenerate instead
- The `updated_at` field is automatically set by database trigger
- Event logging uses fire-and-forget pattern (don't wait for completion)

### Future Enhancements

- Add optimistic locking with version/etag header
- Batch update multiple plans (if needed)
- Add webhook notifications for plan updates
- Track field-level change history in events

### Database Behavior

- `updated_at` trigger automatically sets timestamp on UPDATE
- Database constraints act as backup validation
- Cascading relationships not affected (only plan record updates)
- No impact on nested days/blocks/activities
