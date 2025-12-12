# API Endpoint Implementation Plan: Create Plan with AI Generation

## 1. Endpoint Overview
This document outlines the implementation plan for the `POST /api/plans` endpoint. This is the core feature of the VibeTravels application, responsible for creating a new travel plan with an AI-generated itinerary. The endpoint orchestrates multiple operations: user validation, rate limiting, AI service communication, hierarchical database insertions, and analytics logging.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/plans`
- **Parameters**: None (user ID derived from authentication context)
- **Request Body**: A JSON object containing all plan parameters and user preferences.
  ```json
  {
    "destination_text": "Kraków, Poland",
    "date_start": "2025-06-15",
    "date_end": "2025-06-20",
    "note_text": "Visit Wawel Castle, explore Old Town, try local cuisine...",
    "people_count": 2,
    "trip_type": "leisure",
    "comfort": "balanced",
    "budget": "moderate",
    "transport_modes": ["walk", "public"]
  }
  ```

**Required Fields:**
- `destination_text` - string, 1-160 characters
- `date_start` - ISO date string, not in the past
- `date_end` - ISO date string, >= date_start, max 30 days span
- `note_text` - string, max 20000 characters
- `people_count` - integer, 1-20
- `trip_type` - enum: "leisure" | "business"
- `comfort` - enum: "relax" | "balanced" | "intense"
- `budget` - enum: "budget" | "moderate" | "luxury"

**Optional Fields:**
- `transport_modes` - array of enum: "car" | "walk" | "public", nullable (null or empty array lets AI decide)

## 3. Used Types
The implementation will use the following TypeScript types defined in `src/types.ts`:
- **Request Validation**: `CreatePlanDto`
- **Response**: `PlanDto` (Plan with nested DayDto, BlockDto, ActivityDto)
- **Error Response**: `ErrorDto`
- **Event Logging**: `CreateEventDto`

Additional types needed:
- `ActivityDto` - Activity without block_id
- `BlockDto` - Block with activities array, total_duration_minutes, warning
- `DayDto` - Day with blocks array

## 4. Response Details
- **Success (201 Created)**: Returns the complete plan with full nested structure (days -> blocks -> activities).
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
            ],
            "total_duration_minutes": 135,
            "warning": null
          }
        ]
      }
    ]
  }
  ```
- **Error**: Returns a standardized `ErrorDto` object with appropriate status code.

## 5. Data Flow

### Phase 1: Request Validation & User Checks
1. **Request Reception**: Astro server endpoint at `src/pages/api/plans.ts` receives POST request.
2. **Authentication**: For development, uses `DEFAULT_USER_ID`. In production, validates JWT Bearer token from Astro middleware.
3. **Input Validation**: Zod schema validates all fields including:
   - String length constraints
   - Date validations (not in past, date_end >= date_start)
   - Date range constraint (max 30 days)
   - Enum validations
   - Integer ranges
4. **Plan Limit Check**: Query database to count user's existing plans. If count >= 10, return 403 Forbidden.

### Phase 2: Rate Limiting
5. **Rate Limit Check**: Implement in-memory or Redis-based rate limiter checking if user has exceeded 10 requests per hour for this endpoint. Return 429 if exceeded.

### Phase 3: AI Service Integration
6. **Generate Plan Name**: Create automatic plan name in format: `"{destination_text}, {date_start} – {date_end}"`.
7. **Call AI Service**: 
   - **Development Mode**: Use mock response generator with realistic sample itineraries (controlled by `USE_MOCK_AI` environment variable)
   - **Production Mode**: Send request to AI service (via OpenRouter.ai) with all parameters:
     - Destination, dates, user note
     - People count, trip type, comfort level, budget
     - Transport modes preference
8. **Parse AI Response**: Extract structured itinerary data (days -> blocks -> activities) from AI response.
9. **Handle AI Errors**: Catch timeout errors (503), service unavailable (500), or malformed responses.

### Phase 4: Database Transaction
10. **Begin Transaction**: Use Supabase transaction or multiple sequential inserts with error rollback.
11. **Insert Plan Record**: Create main plan record with generated name and all metadata.
12. **Insert Plan Days**: For each day in date range, create plan_day records with sequential day_index and day_date.
13. **Insert Plan Blocks**: For each day, create 3 blocks (morning, afternoon, evening) using unique constraint on (day_id, block_type).
14. **Insert Plan Activities**: For each activity from AI response, insert into appropriate block with order_index.

### Phase 5: Response & Logging
15. **Fetch Complete Plan**: Query database with nested joins to retrieve the full plan structure.
16. **Log Event**: Fire-and-forget logging of `plan_generated` event with context (destination_text, transport_modes, trip_length_days).
17. **Return Response**: Send 201 Created with complete `PlanDto`.

## 6. Security Considerations

### Authentication & Authorization
- **Authentication**: JWT Bearer token validation (TODO: currently using DEFAULT_USER_ID for development).
- **Authorization**: User can only create plans for themselves (owner_id = authenticated user ID).
- **No IDOR Vulnerability**: User ID comes from secure server-side session, not from request body.

### Input Validation
- **Zod Schema Validation**: All inputs validated with strict type, range, and length constraints.
- **Date Security**: Ensure date_start is not in the past to prevent historical spam.
- **Date Range Limit**: Max 30 days prevents excessive AI computation and database load.
- **Text Length Limits**: Prevent DOS attacks via extremely long text inputs.
- **SQL Injection**: Supabase SDK uses parameterized queries, no raw SQL.

### Rate Limiting
- **Per-User Rate Limit**: 10 requests/hour prevents abuse of expensive AI service.
- **Plan Count Limit**: 10 plans per user prevents storage abuse.

### AI Service Security
- **API Key Management**: OpenRouter.ai API key stored in environment variables, never exposed to client.
- **Input Sanitization**: Sanitize user-provided text before sending to AI to prevent prompt injection.
- **Response Validation**: Validate AI response structure before inserting into database.
- **Timeout Protection**: Set reasonable timeout (30-60 seconds) to prevent hanging requests.

## 7. Performance Considerations

### Bottlenecks
1. **AI Generation**: 10-30 seconds for AI to generate itinerary (main bottleneck).
2. **Database Insertions**: Multiple sequential inserts for hierarchical structure.
3. **Rate Limiting**: Need fast in-memory or Redis-based rate limiter.

### Optimizations
- **AI Service**: Use streaming responses if supported by OpenRouter.ai to provide progress feedback.
- **Database**: Use batch inserts where possible (e.g., insert all days in one query).
- **Indexing**: Ensure `plans.owner_id` has index for fast plan count queries.
- **Caching**: Cache user's plan count for short duration (1-5 minutes) to reduce repeated queries.
- **Async Event Logging**: Fire-and-forget pattern for event logging to not block response.

### Scalability
- **AI Service**: OpenRouter.ai handles scaling, but monitor costs and set budget limits.
- **Database**: PostgreSQL can handle thousands of concurrent inserts, Supabase manages scaling.
- **Rate Limiter**: Use Redis for distributed rate limiting if deploying multiple instances.

## 8. Implementation Steps

### Step 1: Create AI Service Module
**File**: `src/lib/services/ai.service.ts`
- Define TypeScript interfaces for AI request/response structure
- Implement `generateMockItinerary()` function for development:
  - Accept CreatePlanDto parameters
  - Generate realistic mock itinerary data based on trip length
  - Create activities for morning, afternoon, evening blocks for each day
  - Include sample activities like "Explore city center", "Visit museum", "Local restaurant dinner"
  - Vary duration_minutes (60-180) and transport_minutes (5-30) realistically
  - Return structured data matching expected format
- Implement `generatePlanItinerary()` function:
  - Check `import.meta.env.USE_MOCK_AI` flag (default: true for development)
  - If mock mode: call `generateMockItinerary()` and return immediately
  - If production mode: proceed with OpenRouter.ai integration:
    - Accept CreatePlanDto parameters
    - Build prompt for OpenRouter.ai API
    - Make HTTP request with timeout (30-60s)
    - Parse and validate AI response structure
    - Return structured data (array of days with blocks and activities)
    - Handle errors (timeout, service unavailable, malformed response)
- Use environment variables:
  - `import.meta.env.USE_MOCK_AI` - boolean, default true (enables mock for development)
  - `import.meta.env.OPENROUTER_API_KEY` - required for production mode

### Step 2: Create Plans Service Module
**File**: `src/lib/services/plans.service.ts`
- Define Zod schema `createPlanSchema` with all validations:
  - String length constraints
  - Custom date validations (not in past, date range)
  - Enum validations
  - Integer ranges
- Implement helper functions:
  - `generatePlanName(destination: string, dateStart: string, dateEnd: string): string`
  - `calculateTripLengthDays(dateStart: string, dateEnd: string): number`
  - `getUserPlanCount(supabase, userId): Promise<number>`
- Implement main `createPlan()` function:
  - Accept SupabaseClient, userId, and validated CreatePlanDto
  - Check plan count limit (return FORBIDDEN error if >= 10)
  - Generate plan name
  - Call AI service to generate itinerary
  - Insert plan record and get plan ID
  - Insert all plan_days records (use batch insert if possible)
  - For each day, insert 3 plan_blocks (morning, afternoon, evening)
  - Insert all plan_activities with proper block_id and order_index
  - Fetch and return complete PlanDto with nested structure
  - Log `plan_generated` event using `logPlanGenerated()` from events.service.ts
  - Return ServiceResult<PlanDto>

### Step 3: Implement Rate Limiting
**File**: `src/lib/services/rateLimiter.service.ts`
- Implement in-memory rate limiter for development:
  - Use Map<userId, { count: number, resetTime: number }>
  - `checkRateLimit(userId, limit, windowMs): Promise<{ allowed: boolean, remaining: number }>`
  - Clean up expired entries periodically
- TODO: Replace with Redis-based rate limiter for production

### Step 4: Create POST /api/plans Endpoint
**File**: `src/pages/api/plans.ts`
- Add `export const prerender = false` for SSR
- Implement `POST: APIRoute` handler:
  - Extract Supabase client from `locals.supabase`
  - Use DEFAULT_USER_ID for development
  - Check rate limit (10 requests/hour) - return 429 if exceeded
  - Parse request body JSON
  - Validate with `createPlanSchema.safeParse()`
  - If validation fails, return 400 with validation errors
  - Call `createPlan()` service function
  - Handle service errors:
    - FORBIDDEN (plan limit) -> 403
    - AI_SERVICE_UNAVAILABLE -> 500
    - AI_TIMEOUT -> 503
    - INTERNAL_ERROR -> 500
  - On success, return 201 with complete PlanDto
- Add comprehensive error handling and logging

### Step 5: Add Event Logging Helper
**File**: `src/lib/services/events.service.ts` (update existing)
- Add `logPlanGenerated()` function:
  - Accept userId, planId, destination_text, transport_modes, trip_length_days
  - Insert event with event_type = 'plan_generated'
  - Fire-and-forget (catch and log errors, don't throw)

### Step 6: Testing Considerations
- **Unit Tests**:
  - Test Zod schema validation with valid/invalid inputs
  - Test date validation logic (past dates, invalid ranges)
  - Test plan name generation
  - Mock AI service for testing plan creation flow
- **Integration Tests**:
  - Test complete POST flow with valid data
  - Test plan count limit (create 10 plans, 11th should fail)
  - Test rate limiting (11 requests in 1 hour should fail)
  - Test invalid inputs (past dates, date range > 30 days, etc.)
  - Test AI service timeout/unavailable scenarios
- **Manual Testing**:
  - Test with Postman/Insomnia with various destinations
  - Verify nested structure in response
  - Verify events are logged correctly
  - Check database for proper foreign key relationships

### Step 7: Environment Configuration
**File**: `.env`
- Add required environment variables:
  ```
  # AI Service Configuration
  USE_MOCK_AI=true  # Set to false in production to use real AI service
  OPENROUTER_API_KEY=your_api_key_here  # Required when USE_MOCK_AI=false
  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
  ```
- **Development**: `USE_MOCK_AI=true` - Fast mock responses, no API costs, no API key needed
- **Production**: `USE_MOCK_AI=false` - Real AI-generated itineraries, requires valid OPENROUTER_API_KEY

## 9. AI Service Integration Details

### OpenRouter.ai API Structure
- **Endpoint**: `POST https://openrouter.ai/api/v1/chat/completions`
- **Headers**:
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [
      {
        "role": "system",
        "content": "You are a travel planning assistant..."
      },
      {
        "role": "user",
        "content": "Create a detailed itinerary for..."
      }
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }
  ```

### Prompt Engineering
- Include all plan parameters in prompt (destination, dates, preferences)
- Request structured JSON response with specific schema
- Example prompt structure:
  ```
  Create a detailed {trip_length_days}-day travel itinerary for {destination_text}.
  
  Trip Details:
  - Dates: {date_start} to {date_end}
  - Travelers: {people_count} people
  - Trip Type: {trip_type}
  - Comfort Level: {comfort}
  - Budget: {budget}
  - Preferred Transport: {transport_modes}
  
  User Notes: {note_text}
  
  Return a JSON array of days, where each day has morning, afternoon, and evening blocks...
  ```

### Response Parsing
- Expected AI response structure:
  ```json
  {
    "days": [
      {
        "day_index": 1,
        "morning": [
          { "title": "Activity", "duration_minutes": 120, "transport_minutes": 15 }
        ],
        "afternoon": [...],
        "evening": [...]
      }
    ]
  }
  ```
- Transform AI response into database insert format

## 10. Error Codes & Status Mapping

| Error Scenario | Error Code | HTTP Status | Message |
|----------------|------------|-------------|---------|
| Validation failure | VALIDATION_ERROR | 400 | "Invalid plan data" |
| Date in past | VALIDATION_ERROR | 400 | "Start date cannot be in the past" |
| Date range > 30 days | VALIDATION_ERROR | 400 | "Trip duration cannot exceed 30 days" |
| Plan limit reached | FORBIDDEN | 403 | "Plan limit reached (maximum 10 plans)" |
| Rate limit exceeded | RATE_LIMIT_EXCEEDED | 429 | "Too many requests. Try again in X minutes" |
| AI service error | INTERNAL_ERROR | 500 | "Failed to generate itinerary" |
| AI timeout | SERVICE_UNAVAILABLE | 503 | "Itinerary generation timed out. Please try again" |
| Database error | INTERNAL_ERROR | 500 | "Failed to create plan" |

## 11. Notes
- This is the most complex endpoint in the application, involving AI integration, rate limiting, and hierarchical database insertions.
- Consider implementing optimistic UI updates on frontend (show loading state with progress indicators).
- Monitor AI service costs closely and set budget alerts in OpenRouter.ai dashboard.
- In future iterations, consider caching common destinations or implementing "inspiration" pre-generated plans.
- The endpoint is idempotent-safe (POST can be retried) as long as AI service provides consistent responses for same inputs.
- Consider adding webhook or background job for long-running AI generations if response time > 30 seconds.
