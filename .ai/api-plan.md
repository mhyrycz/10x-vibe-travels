# REST API Plan - VibeTravels

## 1. Resources

| Resource | Database Table(s) | Description |
|----------|------------------|-------------|
| Authentication | auth.users (Supabase) | User authentication and session management |
| User Preferences | user_preferences | Travel preference profiles for users |
| User Account | auth.users, user_roles | User account information and role management |
| Plans | plans, plan_days, plan_blocks, plan_activities | Travel itineraries with hierarchical structure |
| Activities | plan_activities | Individual activities within plan blocks |
| Events | events | Analytics event tracking |
| Admin | user_roles, events (read-only) | Administrative operations and statistics |

## 2. Endpoints

### 2.2 User Preferences

#### Create User Preferences (Onboarding)
- **Method**: `POST`
- **Path**: `/api/users/me/preferences`
- **Description**: Create initial travel preferences during onboarding
- **Authentication**: Required (Bearer token)
- **Request Body**:
```json
{
  "people_count": 2,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "balanced",
  "budget": "moderate"
}
```
- **Response** (201 Created):
```json
{
  "user_id": "uuid",
  "people_count": 2,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "balanced",
  "budget": "moderate",
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T10:00:00Z"
}
```
- **Validation**:
  - people_count: integer between 1 and 20
  - trip_type: enum ['leisure', 'business']
  - age: integer between 13 and 120
  - country: string, length between 2 and 120 characters
  - comfort: enum ['relax', 'balanced', 'intense']
  - budget: enum ['budget', 'moderate', 'luxury']
  - All fields required
- **Business Logic**:
  - Logs `preferences_completed` event
  - Only allows creation if preferences don't already exist
- **Errors**:
  - 400: Validation failure (invalid field values)
  - 409: Preferences already exist (use PATCH to update)

#### Get User Preferences
- **Method**: `GET`
- **Path**: `/api/users/me/preferences`
- **Description**: Retrieve current user's travel preferences
- **Authentication**: Required (Bearer token)
- **Response** (200 OK):
```json
{
  "user_id": "uuid",
  "people_count": 2,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "balanced",
  "budget": "moderate",
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T10:00:00Z"
}
```
- **Errors**:
  - 404: Preferences not found (user hasn't completed onboarding)

#### Update User Preferences
- **Method**: `PATCH`
- **Path**: `/api/users/me/preferences`
- **Description**: Update one or more preference fields
- **Authentication**: Required (Bearer token)
- **Request Body** (all fields optional):
```json
{
  "people_count": 3,
  "comfort": "intense"
}
```
- **Response** (200 OK):
```json
{
  "user_id": "uuid",
  "people_count": 3,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "intense",
  "budget": "moderate",
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T11:00:00Z"
}
```
- **Validation**: Same as Create endpoint for provided fields
- **Errors**:
  - 400: Validation failure
  - 404: Preferences not found

### 2.3 User Account

#### Get Current User
- **Method**: `GET`
- **Path**: `/api/users/me`
- **Description**: Get current authenticated user information
- **Authentication**: Required (Bearer token)
- **Response** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2025-12-08T10:00:00Z"
}
```
- **Errors**:
  - 401: Unauthorized

#### Delete User Account
- **Method**: `DELETE`
- **Path**: `/api/users/me`
- **Description**: Permanently delete user account and all associated data
- **Authentication**: Required (Bearer token)
- **Response** (204 No Content)
- **Business Logic**:
  - Cascading deletes via database foreign keys remove:
    - user_preferences
    - plans (and nested plan_days, plan_blocks, plan_activities)
    - user_roles
  - Events are retained with user_id for analytics
- **Errors**:
  - 401: Unauthorized

### 2.4 Plans

#### Create Plan (AI Generation)
- **Method**: `POST`
- **Path**: `/api/plans`
- **Description**: Create a new travel plan with AI-generated itinerary
- **Authentication**: Required (Bearer token)
- **Rate Limit**: 10 requests per hour per user
- **Request Body**:
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
- **Response** (201 Created):
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
              "order_index": 1
            }
          ]
        },
        {
          "id": "uuid",
          "block_type": "afternoon",
          "activities": []
        },
        {
          "id": "uuid",
          "block_type": "evening",
          "activities": []
        }
      ]
    }
  ]
}
```
- **Validation**:
  - destination_text: string, length between 1 and 160
  - date_start: date, not in the past
  - date_end: date, >= date_start, max 30 days from date_start
  - note_text: string, max length 20000
  - people_count: integer between 1 and 20
  - trip_type: enum ['leisure', 'business']
  - comfort: enum ['relax', 'balanced', 'intense']
  - budget: enum ['budget', 'moderate', 'luxury']
  - transport_modes: array of enum ['car', 'walk', 'public'], nullable
- **Business Logic**:
  - Check user's current plan count < 10
  - Generate plan name: "{destination_text}, {date_start} – {date_end}"
  - Call AI service with all parameters
  - Create plan hierarchy: plan -> plan_days -> plan_blocks -> plan_activities
  - Log `plan_generated` event with context (destination_text, transport_modes, trip_length_days)
- **Errors**:
  - 400: Validation failure (invalid dates, date range > 30 days, etc.)
  - 403: User has reached 10-plan limit
  - 429: Rate limit exceeded
  - 500: AI service unavailable
  - 503: AI generation timeout

#### List Plans
- **Method**: `GET`
- **Path**: `/api/plans`
- **Description**: List all plans for current user
- **Authentication**: Required (Bearer token)
- **Query Parameters**:
  - `limit` (optional, default: 10, max: 100): Number of results per page
  - `offset` (optional, default: 0): Pagination offset
  - `sort` (optional, default: '-created_at'): Sort field (prefix '-' for descending)
- **Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
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
- **Business Logic**:
  - Filter by owner_id = auth.uid()
  - Default sort by created_at descending (newest first)
- **Errors**:
  - 400: Invalid query parameters

#### Get Plan Details
- **Method**: `GET`
- **Path**: `/api/plans/{planId}`
- **Description**: Retrieve complete plan with nested structure and warnings
- **Authentication**: Required (Bearer token)
- **Path Parameters**:
  - `planId`: UUID of the plan
- **Response** (200 OK):
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
              "created_at": "2025-12-08T10:00:00Z",
              "updated_at": "2025-12-08T10:00:00Z"
            }
          ]
        },
        {
          "id": "uuid",
          "block_type": "afternoon",
          "total_duration_minutes": 480,
          "warning": "This block may be too intensive (8 hours)",
          "activities": []
        }
      ]
    }
  ]
}
```
- **Business Logic**:
  - Verify owner_id = auth.uid() for authorization
  - Calculate warnings for blocks/days where total time (activities + transport) exceeds thresholds:
    - Morning block: > 4 hours (240 min)
    - Afternoon block: > 5 hours (300 min)
    - Evening block: > 4 hours (240 min)
    - Full day: > 12 hours (720 min)
- **Errors**:
  - 403: User does not own this plan
  - 404: Plan not found

#### Update Plan
- **Method**: `PATCH`
- **Path**: `/api/plans/{planId}`
- **Description**: Update plan metadata (name, budget, preferences, note)
- **Authentication**: Required (Bearer token)
- **Path Parameters**:
  - `planId`: UUID of the plan
- **Request Body** (all fields optional):
```json
{
  "name": "Updated Plan Name",
  "budget": "luxury",
  "note_text": "Updated notes...",
  "people_count": 3
}
```
- **Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Updated Plan Name",
  "budget": "luxury",
  "note_text": "Updated notes...",
  "people_count": 3,
  "updated_at": "2025-12-08T12:00:00Z"
}
```
- **Validation**:
  - name: string, length between 1 and 140
  - note_text: string, max length 20000
  - people_count: integer between 1 and 20
  - budget: enum ['budget', 'moderate', 'luxury']
- **Business Logic**:
  - Verify owner_id = auth.uid()
  - Log `plan_edited` event
- **Errors**:
  - 400: Validation failure
  - 403: User does not own this plan
  - 404: Plan not found

#### Regenerate Plan
- **Method**: `POST`
- **Path**: `/api/plans/{planId}/regenerate`
- **Description**: Regenerate plan itinerary using AI with updated parameters
- **Authentication**: Required (Bearer token)
- **Rate Limit**: 10 requests per hour per user
- **Path Parameters**:
  - `planId`: UUID of the plan
- **Request Body** (all fields optional, uses existing values if not provided):
```json
{
  "date_start": "2025-06-16",
  "date_end": "2025-06-21",
  "note_text": "Updated travel notes...",
  "comfort": "intense",
  "transport_modes": ["car", "walk"] 
}
```
- **Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Kraków, Poland, 2025-06-16 – 2025-06-21",
  "date_start": "2025-06-16",
  "date_end": "2025-06-21",
  "comfort": "intense",
  "transport_modes": ["car", "walk"],
  "updated_at": "2025-12-08T13:00:00Z",
  "days": []
}
```
- **Validation**:
  - date_start: date, not in the past
  - date_end: date, >= date_start, max 30 days from date_start
  - note_text: string, max length 20000
  - comfort: enum ['relax', 'balanced', 'intense']
  - transport_modes: array of enum ['car', 'walk', 'public']
- **Business Logic**:
  - Verify owner_id = auth.uid()
  - Update plan name if dates changed
  - Call AI service with merged parameters (existing + updates)
  - Delete existing plan_days, plan_blocks, plan_activities (cascade)
  - Create new itinerary structure
  - Log `plan_regenerated` event
- **Errors**:
  - 400: Validation failure (date range > 30 days)
  - 403: User does not own this plan
  - 404: Plan not found
  - 429: Rate limit exceeded
  - 500: AI service unavailable

#### Delete Plan
- **Method**: `DELETE`
- **Path**: `/api/plans/{planId}`
- **Description**: Permanently delete a plan
- **Authentication**: Required (Bearer token)
- **Path Parameters**:
  - `planId`: UUID of the plan
- **Response** (204 No Content)
- **Business Logic**:
  - Verify owner_id = auth.uid()
  - Cascading deletes via database remove plan_days, plan_blocks, plan_activities
  - Log `plan_deleted` event
- **Errors**:
  - 403: User does not own this plan
  - 404: Plan not found

### 2.5 Activities

#### Update Activity
- **Method**: `PATCH`
- **Path**: `/api/plans/{planId}/activities/{activityId}`
- **Description**: Update activity details (title, duration, transport time)
- **Authentication**: Required (Bearer token)
- **Path Parameters**:
  - `planId`: UUID of the plan
  - `activityId`: UUID of the activity
- **Request Body** (all fields optional):
```json
{
  "title": "Updated Activity Title",
  "duration_minutes": 90,
  "transport_minutes": 20
}
```
- **Response** (200 OK):
```json
{
  "id": "uuid",
  "block_id": "uuid",
  "title": "Updated Activity Title",
  "duration_minutes": 90,
  "transport_minutes": 20,
  "order_index": 1,
  "updated_at": "2025-12-08T14:00:00Z"
}
```
- **Validation**:
  - title: string, length between 1 and 200
  - duration_minutes: integer between 5 and 720
  - transport_minutes: integer between 0 and 600 (nullable)
- **Business Logic**:
  - Verify plan owner_id = auth.uid()
  - Log `plan_edited` event (on parent plan)
- **Errors**:
  - 400: Validation failure
  - 403: User does not own this plan
  - 404: Plan or activity not found

#### Move Activity
- **Method**: `POST`
- **Path**: `/api/plans/{planId}/activities/{activityId}/move`
- **Description**: Move activity to a different block and/or position
- **Authentication**: Required (Bearer token)
- **Path Parameters**:
  - `planId`: UUID of the plan
  - `activityId`: UUID of the activity
- **Request Body**:
```json
{
  "target_block_id": "uuid",
  "target_order_index": 2
}
```
- **Response** (200 OK):
```json
{
  "id": "uuid",
  "block_id": "uuid",
  "title": "Visit Wawel Castle",
  "duration_minutes": 120,
  "transport_minutes": 15,
  "order_index": 2,
  "updated_at": "2025-12-08T14:30:00Z"
}
```
- **Validation**:
  - target_block_id: must belong to same plan
  - target_order_index: integer between 1 and 50
- **Business Logic**:
  - Verify plan owner_id = auth.uid()
  - Reorder activities in source block (decrement order_index for items after moved activity)
  - Insert activity at target position (increment order_index for items at/after target position)
  - Update activity block_id and order_index
  - Log `plan_edited` event
- **Errors**:
  - 400: Invalid target block or order index
  - 403: User does not own this plan
  - 404: Plan, activity, or target block not found

### 2.6 Admin

#### Get Statistics
- **Method**: `GET`
- **Path**: `/api/admin/stats`
- **Description**: Retrieve platform-wide statistics
- **Authentication**: Required (Bearer token with admin role)
- **Response** (200 OK):
```json
{
  "total_users": 1523,
  "total_plans": 8472,
  "generated_at": "2025-12-08T15:00:00Z"
}
```
- **Business Logic**:
  - Verify user has role = 'admin' in user_roles table
  - Count users from auth.users
  - Count plans from plans table
- **Errors**:
  - 403: User is not an admin

#### List Users (Admin)
- **Method**: `GET`
- **Path**: `/api/admin/users`
- **Description**: List all users with basic information
- **Authentication**: Required (Bearer token with admin role)
- **Query Parameters**:
  - `limit` (optional, default: 50, max: 100)
  - `offset` (optional, default: 0)
  - `search` (optional): Search by email
- **Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "created_at": "2025-12-08T10:00:00Z",
      "has_preferences": true,
      "plan_count": 3
    }
  ],
  "pagination": {
    "total": 1523,
    "limit": 50,
    "offset": 0
  }
}
```
- **Business Logic**:
  - Verify user has role = 'admin'
  - Join auth.users with user_roles and aggregate plan counts
- **Errors**:
  - 403: User is not an admin

#### List All Plans (Admin)
- **Method**: `GET`
- **Path**: `/api/admin/plans`
- **Description**: List all plans across all users
- **Authentication**: Required (Bearer token with admin role)
- **Query Parameters**:
  - `limit` (optional, default: 50, max: 100)
  - `offset` (optional, default: 0)
  - `user_id` (optional): Filter by specific user
- **Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kraków, Poland, 2025-06-15 – 2025-06-20",
      "destination_text": "Kraków, Poland",
      "owner_id": "uuid",
      "owner_email": "user@example.com",
      "created_at": "2025-12-08T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 8472,
    "limit": 50,
    "offset": 0
  }
}
```
- **Business Logic**:
  - Verify user has role = 'admin'
  - Join plans with auth.users to get owner email
- **Errors**:
  - 403: User is not an admin

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Implementation**: Supabase Auth with JWT (JSON Web Tokens)

**Flow**:
1. User registers or logs in via Supabase Auth endpoints
2. Supabase returns access_token (JWT) and refresh_token
3. Client includes access_token in Authorization header: `Authorization: Bearer {access_token}`
4. API validates JWT signature and expiration using Supabase Auth service
5. Authenticated user ID extracted from JWT via `auth.uid()` helper

**Token Lifecycle**:
- Access tokens expire after 1 hour (configurable in Supabase)
- Refresh tokens used to obtain new access tokens without re-authentication
- Tokens automatically invalidated on logout

**Protected Endpoints**:
All endpoints except the following require valid Bearer token:
- `POST /api/auth/register`
- `POST /api/auth/login`

### 3.2 Authorization Rules

#### Owner-Based Access (Plans and Activities)
- Users can only access plans where `owner_id = auth.uid()`
- Enforced at application layer before database queries
- Applies to: GET, PATCH, DELETE on `/api/plans/{planId}` and nested resources

#### Role-Based Access (Admin)
- Admin endpoints require `role = 'admin'` in user_roles table
- Check performed via database query: `SELECT role FROM user_roles WHERE user_id = auth.uid()`
- Applies to: all `/api/admin/*` endpoints

#### Resource Limits
- 10-plan limit per user enforced in `POST /api/plans`
- Check via: `SELECT COUNT(*) FROM plans WHERE owner_id = auth.uid()`

### 3.3 Rate Limiting

**AI-Powered Endpoints**:
- `POST /api/plans`: 10 requests per hour per user
- `POST /api/plans/{planId}/regenerate`: 10 requests per hour per user

**Implementation**:
- Track requests in Redis/memory cache keyed by user_id + endpoint
- Return 429 Too Many Requests when limit exceeded
- Include rate limit headers in responses:
  ```
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1733670000
  ```

## 4. Validation and Business Logic

### 4.1 Input Validation Rules

#### User Preferences
| Field | Validation |
|-------|-----------|
| people_count | Required, integer, 1 ≤ value ≤ 20 |
| trip_type | Required, enum: ['leisure', 'business'] |
| age | Required, integer, 13 ≤ value ≤ 120 |
| country | Required, string, 2 ≤ length ≤ 120 |
| comfort | Required, enum: ['relax', 'balanced', 'intense'] |
| budget | Required, enum: ['budget', 'moderate', 'luxury'] |

#### Plans
| Field | Validation |
|-------|-----------|
| name | Required, string, 1 ≤ length ≤ 140 |
| destination_text | Required, string, 1 ≤ length ≤ 160 |
| date_start | Required, date, not in past |
| date_end | Required, date, ≥ date_start, ≤ date_start + 30 days |
| note_text | Required, string, length ≤ 20000 |
| people_count | Required, integer, 1 ≤ value ≤ 20 |
| trip_type | Required, enum: ['leisure', 'business'] |
| comfort | Required, enum: ['relax', 'balanced', 'intense'] |
| budget | Required, enum: ['budget', 'moderate', 'luxury'] |
| transport_modes | Optional, array of enum: ['car', 'walk', 'public'] |

#### Activities
| Field | Validation |
|-------|-----------|
| title | Required, string, 1 ≤ length ≤ 200 |
| duration_minutes | Required, integer, 5 ≤ value ≤ 720 |
| transport_minutes | Optional, integer, 0 ≤ value ≤ 600 |
| order_index | Required, integer, 1 ≤ value ≤ 50 |

### 4.2 Business Logic Implementation

#### Plan Creation
1. **Pre-validation**:
   - Check user's plan count < 10
   - Validate date range ≤ 30 days
   - Ensure dates not in past

2. **AI Integration**:
   - Prepare payload with all plan parameters
   - Call AI service endpoint (implementation detail)
   - Parse AI response into plan structure

3. **Data Persistence**:
   - Create plan record
   - Generate plan name: `"{destination_text}, {date_start} – {date_end}"`
   - Create plan_days for each date in range
   - For each day, create 3 plan_blocks (morning, afternoon, evening)
   - Create plan_activities from AI response with proper order_index

4. **Event Logging**:
   - Insert into events table:
     ```json
     {
       "user_id": "auth.uid()",
       "plan_id": "created_plan_id",
       "event_type": "plan_generated",
       "destination_text": "from request",
       "transport_modes": "from request",
       "trip_length_days": "calculated from dates"
     }
     ```

#### Plan Regeneration
1. **Parameter Merging**:
   - Fetch existing plan
   - Merge provided updates with existing values
   - If dates changed, update plan name

2. **Itinerary Replacement**:
   - Delete existing plan_days (cascade deletes blocks and activities)
   - Follow same AI integration and persistence flow as creation

3. **Event Logging**:
   - Log `plan_regenerated` event with updated context

#### Activity Movement
1. **Reordering Logic**:
   - Fetch activities in source block ordered by order_index
   - For items after moved activity: decrement order_index
   - Fetch activities in target block ordered by order_index
   - For items at/after target position: increment order_index
   - Update moved activity with new block_id and order_index

2. **Constraint Maintenance**:
   - Ensure unique (block_id, order_index) constraint satisfied
   - Handle edge cases (moving within same block)

#### Overload Warnings Calculation
Calculate total time per block/day when fetching plan details:

```
block_total = SUM(activity.duration_minutes + COALESCE(activity.transport_minutes, 0))

Warning thresholds:
- morning: > 240 minutes (4 hours)
- afternoon: > 300 minutes (5 hours)  
- evening: > 240 minutes (4 hours)
- full day: > 720 minutes (12 hours)
```

Include warning message in response if threshold exceeded.

### 4.3 Error Response Format

All error responses follow consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "constraint": "validation rule violated"
    }
  }
}
```

**Common Error Codes**:
- `VALIDATION_ERROR` (400): Input validation failed
- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Authenticated but not authorized for this resource
- `NOT_FOUND` (404): Resource does not exist
- `CONFLICT` (409): Resource conflict (e.g., duplicate, limit exceeded)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): External service (AI) unavailable

### 4.4 Event Logging

Events are logged asynchronously after successful operations:

| Event Type | Trigger | Context Fields |
|------------|---------|----------------|
| account_created | User registration | user_id |
| preferences_completed | Onboarding completion | user_id |
| plan_generated | New plan creation | user_id, plan_id, destination_text, transport_modes, trip_length_days |
| plan_regenerated | Plan regeneration | user_id, plan_id, destination_text, transport_modes, trip_length_days |
| plan_edited | Plan/activity update | user_id, plan_id |
| plan_deleted | Plan deletion | user_id, plan_id (retained even after plan deleted) |

**Implementation Note**: Event logging failures should not block primary operation (fire-and-forget pattern with error logging).

### 4.5 Database Transaction Guidelines

**Single Resource Updates**: Use single transaction
- User preferences update
- Plan metadata update
- Activity update

**Complex Operations**: Use transaction with rollback on failure
- Plan creation (plan + days + blocks + activities + event)
- Plan regeneration (delete old + create new + event)
- Activity movement (reorder source + reorder target + update)

**Non-Transactional**: Independent operations
- Event logging (fire-and-forget)
- Statistics queries (read-only, eventual consistency acceptable)
