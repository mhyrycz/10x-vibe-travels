# API Endpoint Implementation Plan: Create User Preferences

## 1. Endpoint Overview

This document outlines the implementation plan for the `POST /api/users/me/preferences` endpoint. Its primary purpose is to allow an authenticated user to create their initial travel preferences as part of the onboarding process. The endpoint validates the incoming data, checks for pre-existing preferences to prevent duplicates, creates a new record in the `user_preferences` table, and logs a `preferences_completed` event for analytics.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Structure**: `/api/users/me/preferences`
- **Parameters**: None (all data is in the request body).
- **Request Body**: A JSON object containing the user's travel preferences. All fields are required.
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

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Request Validation**: `CreateUserPreferencesDto`
- **Successful Response**: `UserPreferencesDto`
- **Error Response**: `ErrorDto`
- **Event Logging**: `CreateEventDto`

## 4. Response Details

- **Success (201 Created)**: Returns the complete `user_preferences` object that was just created.
  ```json
  {
    "user_id": "uuid-of-current-user",
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
- **Error**: Returns a standardized `ErrorDto` object with an appropriate status code (e.g., 400, 401, 409, 500).

## 5. Data Flow

1.  **Request Reception**: The Astro server endpoint at `src/pages/api/users/me/preferences.ts` receives a `POST` request.
2.  **Authentication**: Astro middleware verifies the JWT Bearer token. If invalid or missing, it returns a 401 Unauthorized error. The authenticated user's session and Supabase client instance are attached to `context.locals`.
3.  **Input Validation**: The endpoint handler uses a Zod schema to parse and validate the request body against the `CreateUserPreferencesDto` structure and rules. If validation fails, it returns a 400 Bad Request error.
4.  **Service Logic**: The handler calls the `createUserPreferences` function in the `UserPreferencesService` (`src/lib/services/userPreferences.service.ts`), passing the validated data and the Supabase client instance.
5.  **Conflict Check**: The service function first queries the `user_preferences` table to check if a record for the current `user_id` already exists. If so, it returns a failure result, leading to a 409 Conflict error.
6.  **Database Insertion**: If no conflict is found, the service function inserts a new row into the `user_preferences` table with the provided data and the current user's ID.
7.  **Event Logging**: Upon successful insertion, the service function calls the `EventService` to log a `preferences_completed` event. This is a "fire-and-forget" operation; its failure should not fail the main request.
8.  **Response Generation**: The service returns the newly created `user_preferences` record to the endpoint handler, which then sends it back to the client with a 201 Created status.

## 6. Security Considerations

- **Authentication**: The endpoint is protected by Astro middleware that validates the Supabase JWT. All operations are scoped to the authenticated user's ID (`auth.uid()`) from the token.
- **Authorization**: The business logic ensures a user can only create preferences for their own account. The `user_id` is taken from the secure server-side session, not from the request body.
- **Input Validation**: Zod validation on the server prevents malformed data, SQL injection, and Cross-Site Scripting (XSS) by enforcing strict types, ranges, and lengths.
- **Duplicate Submission**: The conflict check (step 5 in Data Flow) prevents users from creating multiple preference profiles, which could lead to inconsistent application state.
- **Error-Driven Enumeration**: The 409 Conflict response could theoretically be used to check if a user has completed onboarding. This is considered an acceptable trade-off for providing clear API feedback.

## 7. Performance Considerations

- **Database Indexing**: The `user_preferences` table uses `user_id` as its primary key, which is inherently indexed. This ensures the conflict check query is highly performant.
- **Payload Size**: The request and response payloads are small and consist of simple key-value pairs, leading to minimal network latency.
- **Asynchronous Logging**: Event logging is performed asynchronously and should not block the response to the user, maintaining low latency for the primary operation.
- **Connection Pooling**: The Supabase client manages database connection pooling, ensuring efficient use of database resources.

## 8. Implementation Steps

1.  **Create Service File**: Create a new file `src/lib/services/userPreferences.service.ts` to house the business logic.
2.  **Define Zod Schema**: In the same service file, define a Zod schema that validates the request body according to the API specification and `CreateUserPreferencesDto` type.
3.  **Implement `createUserPreferences` Service Function**:
    - The function will accept the request body DTO and a `SupabaseClient` instance.
    - Query `user_preferences` to check for an existing record for the current user.
    - If a record exists, return an error indicating a conflict.
    - If no record exists, use the Supabase client to `insert()` the new preferences record into the `user_preferences` table.
    - If the insert is successful, call the `EventService` to log the `preferences_completed` event.
    - Return the newly created record on success or an error object on failure.
4.  **Create API Endpoint File**: Create the Astro server endpoint file at `src/pages/api/users/me/preferences.ts`.
5.  **Implement Endpoint Handler (`POST`)**:
    - Define an `export const POST: APIRoute = async ({ request, context }) => { ... }`.
    - Extract the Supabase client and user session from `context.locals`.
    - Parse the JSON body from the `request`.
    - Use the Zod schema's `.safeParse()` method to validate the body. If it fails, return a 400 error with validation details.
    - Call the `createUserPreferences` service function with the validated data.
    - Based on the service's return value, send the appropriate HTTP response (201 on success, 409 or 500 on failure).
6.  **Create Event Service (if needed)**: Ensure an `EventService` exists in `src/lib/services/` with a function to log events to the `events` table. This function should accept a `CreateEventDto` payload.
