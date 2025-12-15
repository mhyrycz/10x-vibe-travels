# API Endpoint Implementation Plan: Get Plan Details

## 1. Endpoint Overview

This document outlines the implementation plan for the `GET /api/plans/{planId}` endpoint. This endpoint retrieves a complete travel plan with full nested structure (days → blocks → activities) and calculates warnings for overpacked schedules. This is used for plan detail views and editing interfaces.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/plans/{planId}`
- **Path Parameters**:
  - `planId` (required, UUID) - The unique identifier of the plan to retrieve
- **Query Parameters**: None
- **Request Body**: None

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Response**: `PlanDto` - Complete plan with nested structure
- **Error Response**: `ErrorDto`

Types already defined in `src/types.ts`:

```typescript
export type PlanDto = Plan & {
  days: DayDto[];
};

export type DayDto = Omit<PlanDay, "plan_id" | "created_at" | "updated_at"> & {
  blocks: BlockDto[];
};

export type BlockDto = Omit<PlanBlock, "day_id" | "created_at"> & {
  activities: ActivityDto[];
  total_duration_minutes: number;
  warning: string | null;
};

export type ActivityDto = Omit<PlanActivity, "block_id">;
```

## 4. Response Details

- **Success (200 OK)**: Returns complete plan with full nested hierarchy and computed warnings
  ```json
  {
    "id": "uuid",
    "owner_id": "uuid",
    "name": "Kraków, Poland, 2025-06-15 – 2025-06-20",
    "destination_text": "Kraków, Poland",
    "date_start": "2025-06-15",
    "date_end": "2025-06-20",
    "people_count": 2,
    "trip_type": "leisure",
    "comfort": "balanced",
    "budget": "moderate",
    "transport_modes": ["walk", "public"],
    "note_text": "Visit Wawel Castle...",
    "created_at": "2025-12-08T10:00:00Z",
    "updated_at": "2025-12-08T10:00:00Z",
    "days": [
      {
        "id": "uuid",
        "day_index": 1,
        "day_date": "2025-06-15",
        "blocks": [
          {
            "id": "uuid",
            "block_type": "morning",
            "total_duration_minutes": 135,
            "warning": null,
            "activities": [
              {
                "id": "uuid",
                "title": "Visit Wawel Castle",
                "duration_minutes": 120,
                "transport_minutes": 15,
                "order_index": 1,
                "created_at": "...",
                "updated_at": "..."
              }
            ]
          }
        ]
      }
    ]
  }
  ```
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code

## 5. Data Flow

### Request Processing Flow:

1. **Request Reception**: Astro server endpoint at `src/pages/api/plans/[planId].ts` receives GET request
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token
3. **Path Parameter Extraction**: Extract `planId` from URL path
4. **Path Parameter Validation**: Validate `planId` is a valid UUID format
5. **Service Layer Call**: Call `getPlanDetails()` service function with planId and userId
6. **Authorization Check**: Service verifies plan exists and belongs to authenticated user
7. **Fetch Nested Data**:
   - Fetch plan record
   - Fetch all plan_days for this plan (ordered by day_index)
   - For each day, fetch all plan_blocks (morning, afternoon, evening)
   - For each block, fetch all plan_activities (ordered by order_index)
8. **Calculate Metrics & Warnings**:
   - For each block, calculate `total_duration_minutes` (sum of activity durations + transport times)
   - Generate warnings for overpacked blocks:
     - Morning: > 240 minutes (4 hours)
     - Afternoon: > 300 minutes (5 hours)
     - Evening: > 240 minutes (4 hours)
9. **Assemble Nested Structure**: Build PlanDto with nested days, blocks, and activities
10. **Return Response**: Send 200 OK with complete plan data

## 6. Security Considerations

### Authentication & Authorization

- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development)
- **Authorization**: Verify `owner_id = authenticated user ID` before returning data
- **IDOR Prevention**: Return 403 Forbidden if user doesn't own the plan
- **404 vs 403**: Return 404 if plan doesn't exist, 403 if exists but user doesn't own it (prevents information disclosure)

### Input Validation

- **UUID Validation**: Validate planId is proper UUID format before database query
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL
- **No Sensitive Data Leakage**: Only return plan if ownership verified

## 7. Performance Considerations

### Optimizations

- **Indexed Queries**: All queries use primary keys or foreign keys (highly indexed)
- **Batch Queries**: Could optimize by using fewer queries with joins instead of N+1 queries
- **Selective Loading**: Only fetch necessary data for each level
- **In-Memory Computation**: Calculate warnings and totals in application layer (fast)

### Potential Bottlenecks

- **Multiple Database Queries**: Current approach may require 10+ queries for a 5-day plan:
  - 1 for plan
  - 1 for all days
  - 5 for blocks (one per day)
  - 5+ for activities (one per block with activities)
- **Solution**: Use Supabase nested select or implement query batching

### Scalability

- Plan structure is bounded (max 30 days, 3 blocks/day, reasonable activity count)
- Even worst case (30 days × 3 blocks × 10 activities) = ~900 activity records is manageable
- Response size typically 50-200KB (acceptable for JSON API)

## 8. Implementation Steps

### Step 1: Reuse Existing Service Function

**File**: `src/lib/services/plans.service.ts`
The `fetchCompletePlan()` helper function already exists in the plans service from the POST endpoint implementation. It:

- Fetches plan record
- Fetches all nested days, blocks, and activities
- Calculates block metrics and warnings using `calculateBlockMetrics()`
- Assembles complete PlanDto structure

We need to:

- Make `fetchCompletePlan()` public (currently private)
- Add authorization check wrapper:
  - `getPlanDetails(supabase, userId, planId)` function
  - Fetch plan first to check ownership
  - Return 403 error if owner_id !== userId
  - Return 404 error if plan not found
  - Call existing `fetchCompletePlan()` if authorized
  - Return ServiceResult<PlanDto>

### Step 2: Create Dynamic Route File

**File**: `src/pages/api/plans/[planId].ts`

- Create new file with dynamic route parameter `[planId]`
- Add `export const prerender = false` for SSR
- Implement `GET: APIRoute` handler:
  - Extract Supabase client from `locals.supabase`
  - Use DEFAULT_USER_ID for development
  - Extract `planId` from `params` (Astro provides this)
  - Validate planId format (basic UUID regex or try-catch)
  - Call `getPlanDetails()` service function
  - Handle service errors:
    - FORBIDDEN (wrong owner) → 403
    - NOT_FOUND (plan doesn't exist) → 404
    - INTERNAL_ERROR → 500
  - On success, return 200 with PlanDto

### Step 3: Testing Considerations

- **Unit Tests**:
  - Test warning calculation for different block durations
  - Test ownership authorization logic
  - Test UUID validation
- **Integration Tests**:
  - Test retrieving valid plan (owned by user) → 200
  - Test retrieving plan owned by different user → 403
  - Test retrieving non-existent plan → 404
  - Test with invalid UUID format → 400
  - Verify nested structure is complete (days, blocks, activities)
  - Verify warnings appear when blocks exceed thresholds
- **Manual Testing**:
  - Create plan via POST, then retrieve via GET
  - Verify all nested data matches
  - Test with plan having multiple days
  - Verify warnings display correctly in response

## 9. Warning Calculation Logic

### Block-Level Warnings

Calculate total duration for each block:

```typescript
total_duration_minutes = sum(activities.duration_minutes + activities.transport_minutes);
```

Generate warnings based on block type:

```typescript
if (block_type === "morning" && total > 240) {
  warning = "This morning block is quite packed (X hours). Consider spacing activities.";
}
if (block_type === "afternoon" && total > 300) {
  warning = "This afternoon block is quite packed (X hours). Consider spacing activities.";
}
if (block_type === "evening" && total > 240) {
  warning = "This evening block is quite packed (X hours). Consider spacing activities.";
}
```

### Future Enhancements

- Day-level warnings (total > 720 minutes / 12 hours)
- Trip-level warnings (consecutive intensive days)
- Customized thresholds based on comfort level (relax vs intense)

## 10. Notes

- The `calculateBlockMetrics()` function already exists in plans.service.ts and handles warning generation
- This endpoint returns ALL plan data including the original note_text (needed for editing)
- No rate limiting needed (read operation)
- Response caching could be added in future (ETag, Last-Modified headers)
- Consider adding `If-None-Match` / ETag support for efficient reloading
- The nested query pattern is already implemented in `fetchCompletePlan()` - we just need to expose it with authorization
