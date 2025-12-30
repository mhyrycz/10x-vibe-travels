# API Endpoint Implementation Plan: List Plans

## 1. Endpoint Overview

This document outlines the implementation plan for the `GET /api/plans` endpoint. This endpoint provides a paginated list of travel plans owned by the authenticated user, supporting filtering and sorting for efficient data retrieval and display in list views.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/plans`
- **Parameters**: None (user ID derived from authentication context)
- **Query Parameters**:
  - `limit` (optional, number, default: 10, max: 100) - Number of results per page
  - `offset` (optional, number, default: 0, min: 0) - Pagination offset for skipping results
  - `sort` (optional, string, default: '-created_at') - Sort field with optional '-' prefix for descending order

**Query Parameter Validation:**

- `limit`: Must be integer between 1-100
- `offset`: Must be non-negative integer
- `sort`: Must be valid field name with optional '-' prefix for descending (e.g., '-created_at', 'name', '-date_start')

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Response**: `PaginatedPlansDto` which wraps:
  - `data: PlanListItemDto[]` - Array of plan summaries
  - `pagination: PaginationDto` - Pagination metadata
- **Error Response**: `ErrorDto`

Types already defined in `src/types.ts`:

```typescript
export type PlanListItemDto = Pick<Plan, "id" | "name" | "destination_text" | "date_start" | "date_end" | "created_at">;

export interface PaginationDto {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}

export type PaginatedPlansDto = PaginatedResponseDto<PlanListItemDto>;
```

## 4. Response Details

- **Success (200 OK)**: Returns paginated list of plan summaries
  ```json
  {
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Kraków, Poland, 2025-06-15 – 2025-06-20",
        "destination_text": "Kraków, Poland",
        "date_start": "2025-06-15",
        "date_end": "2025-06-20",
        "created_at": "2025-12-08T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0
    }
  }
  ```
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code

## 5. Data Flow

### Request Processing Flow:

1. **Request Reception**: Astro server endpoint at `src/pages/api/plans.ts` receives GET request
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token
3. **Query Parameter Extraction**: Extract and validate `limit`, `offset`, `sort` from URL query string
4. **Query Parameter Validation**:
   - Validate `limit` is between 1-100
   - Validate `offset` is >= 0
   - Validate `sort` field is allowed (created_at, date_start, date_end, name)
   - Return 400 if validation fails
5. **Service Layer Call**: Call `listPlans()` service function with userId and validated query parameters
6. **Database Query**:
   - Filter plans by `owner_id = userId`
   - Apply sorting based on `sort` parameter
   - Apply pagination with `limit` and `offset`
   - Get total count for pagination metadata
7. **Response Assembly**: Build `PaginatedPlansDto` response with data and pagination info
8. **Return Response**: Send 200 OK with JSON response

## 6. Security Considerations

### Authentication & Authorization

- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development)
- **Authorization**: Query automatically filters by `owner_id = authenticated user ID`
- **No IDOR Vulnerability**: Users can only see their own plans
- **Data Isolation**: Database query includes WHERE clause filtering by user ID

### Input Validation

- **Query Parameter Validation**: Strict validation of limit, offset, and sort parameters
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL
- **Sort Field Whitelist**: Only allow sorting by specific fields to prevent SQL injection through sort parameter
- **Limit Boundaries**: Enforce max 100 results to prevent excessive data transfer

### No Sensitive Data Exposure

- Returns summary data only (no note_text, transport_modes, or detailed preferences)
- Perfect for list views without exposing unnecessary information

## 7. Performance Considerations

### Optimizations

- **Index Usage**: Query leverages `plans_owner_created_idx` index for fast filtering and sorting
- **Pagination**: Limit results to prevent loading large datasets
- **Select Specific Columns**: Only query needed fields (id, name, destination_text, dates, created_at)
- **Count Optimization**: Use efficient count query with same filters

### Potential Bottlenecks

- Users with many plans (approaching 10-plan limit) should still perform well due to indexing
- Total count query runs on every request - acceptable since user has max 10 plans

### Scalability

- With 10-plan-per-user limit, even without pagination this endpoint scales well
- PostgreSQL/Supabase handles indexed queries efficiently
- No expensive joins or nested data - simple flat query

## 8. Implementation Steps

### Step 1: Create Plans Service Helper Function (extend existing service)

**File**: `src/lib/services/plans.service.ts`

- Add query parameter validation helpers:
  - `validateListQueryParams(params)` - Returns validated or default values
  - Validate limit (1-100, default 10)
  - Validate offset (>=0, default 0)
  - Validate sort field (whitelist: created_at, date_start, date_end, name)
  - Handle '-' prefix for descending sort
- Implement `listPlans()` function:
  - Accept SupabaseClient, userId, and query parameters (limit, offset, sort)
  - Build Supabase query with filters:
    - `.from('plans')`
    - `.select('id, name, destination_text, date_start, date_end, created_at')`
    - `.eq('owner_id', userId)`
    - Apply sort with `.order(sortField, { ascending })`
    - Apply pagination with `.range(offset, offset + limit - 1)`
  - Execute count query separately: `.select('*', { count: 'exact', head: true }).eq('owner_id', userId)`
  - Return ServiceResult<PaginatedPlansDto> with data and pagination metadata

### Step 2: Add GET Handler to Endpoint

**File**: `src/pages/api/plans.ts` (extend existing file with POST)

- Implement `GET: APIRoute` handler:
  - Extract Supabase client from `locals.supabase`
  - Use DEFAULT_USER_ID for development
  - Extract query parameters from URL: `new URL(request.url).searchParams`
  - Parse and validate query parameters (limit, offset, sort)
  - If validation fails, return 400 with error details
  - Call `listPlans()` service function
  - Handle service errors (return 500)
  - On success, return 200 with PaginatedPlansDto

### Step 3: Testing Considerations

- **Unit Tests**:
  - Test query parameter validation (invalid limit, negative offset, invalid sort field)
  - Test sort field whitelist
  - Test pagination logic
- **Integration Tests**:
  - Test with no plans (empty result)
  - Test with multiple plans (verify sorting)
  - Test pagination (limit=2, offset=0, then offset=2)
  - Test default values when no query params provided
  - Verify only user's own plans are returned
- **Manual Testing**:
  - Test with Postman: `GET /api/plans?limit=5&sort=-date_start`
  - Verify pagination metadata is correct
  - Verify sorting works (ascending/descending)

## 9. Notes

- This is a simple, read-only endpoint with no complex business logic
- Performance is excellent due to indexing and user's 10-plan limit
- Query parameters provide flexibility for different UI views (recent plans, upcoming trips, etc.)
- Returns minimal data for efficient list rendering
- No rate limiting needed (read operation)
