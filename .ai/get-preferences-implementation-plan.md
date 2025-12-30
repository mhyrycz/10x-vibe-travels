# API Endpoint Implementation Plan: Get User Preferences

## 1. Endpoint Overview

This document outlines the implementation plan for the `GET /api/users/me/preferences` endpoint. Its primary purpose is to retrieve the travel preferences for the currently authenticated user. This endpoint is typically called after user login to check if onboarding has been completed, or to display user preferences in the UI.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL Structure**: `/api/users/me/preferences`
- **Parameters**: None (user ID is derived from authentication context)
- **Request Body**: None (GET request)

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Response**: `UserPreferencesDto`
- **Error Response**: `ErrorDto`

## 4. Response Details

- **Success (200 OK)**: Returns the complete `user_preferences` object for the authenticated user.
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
- **Error**: Returns a standardized `ErrorDto` object with an appropriate status code (e.g., 404, 500).

## 5. Data Flow

1. **Request Reception**: The Astro server endpoint at `src/pages/api/users/me/preferences.ts` receives a `GET` request.
2. **Authentication**: For development, the endpoint uses `DEFAULT_USER_ID` from `supabase.client.ts`. In production, Astro middleware would verify the JWT Bearer token and attach the authenticated user's session to `context.locals`.
3. **Service Logic**: The handler calls the `getUserPreferences` function in the `UserPreferencesService` (`src/lib/services/userPreferences.service.ts`), passing the Supabase client instance and user ID.
4. **Database Query**: The service function queries the `user_preferences` table for a record matching the user ID.
5. **Response Generation**:
   - If preferences are found, the service returns the record, which is sent back to the client with a 200 OK status.
   - If no preferences are found, the service returns a "not found" error, leading to a 404 Not Found response.

## 6. Security Considerations

- **Authentication**: The endpoint is protected by authentication. For development, it uses `DEFAULT_USER_ID`. In production, it will validate the Supabase JWT token.
- **Authorization**: The business logic ensures a user can only retrieve their own preferences. The `user_id` is taken from the secure server-side session, not from request parameters.
- **No Input Validation Required**: Since this is a GET request with no parameters or body, input validation is minimal (only verifying authentication).
- **Data Exposure**: The endpoint returns all preference fields. Ensure no sensitive data is included in the `user_preferences` table that shouldn't be exposed to the client.

## 7. Performance Considerations

- **Database Indexing**: The `user_preferences` table uses `user_id` as its primary key, which is inherently indexed. This ensures the lookup query is highly performant (O(1) complexity).
- **Payload Size**: The response payload is small and consists of simple key-value pairs, leading to minimal network latency.
- **Caching Opportunity**: Consider implementing client-side caching of user preferences (e.g., in React state or local storage) since preferences don't change frequently.
- **Connection Pooling**: The Supabase client manages database connection pooling, ensuring efficient use of database resources.

## 8. Implementation Steps

1. **Add Service Function**: In the existing `src/lib/services/userPreferences.service.ts` file, implement a `getUserPreferences` function:
   - The function will accept a `SupabaseClient` instance and a `userId` string.
   - Query `user_preferences` table with `.select()` filtered by `.eq('user_id', userId)` and `.single()`.
   - If the query returns data, return a success result with the preferences.
   - If the query returns a "PGRST116" error (no rows found), return an error indicating preferences not found.
   - Handle any database errors and return appropriate error results.

2. **Add GET Handler to Endpoint**: In the existing `src/pages/api/users/me/preferences.ts` file, implement the `GET` handler:
   - Define `export const GET: APIRoute = async ({ locals }) => { ... }`.
   - Extract the Supabase client from `locals.supabase`.
   - Use `DEFAULT_USER_ID` for development (same as POST handler).
   - Call the `getUserPreferences` service function with the user ID.
   - Based on the service's return value, send the appropriate HTTP response (200 on success, 404 or 500 on failure).

3. **Error Handling**: Ensure proper error responses:
   - 404 Not Found: When user preferences don't exist (user hasn't completed onboarding).
   - 500 Internal Server Error: When unexpected database errors occur.

4. **Testing Considerations**:
   - Test with a user ID that has preferences (should return 200 with data).
   - Test with a user ID that doesn't have preferences (should return 404).
   - Test with an invalid user ID format (should return 500 or handle gracefully).
   - Verify the response structure matches `UserPreferencesDto`.

## 9. Notes

- This endpoint is idempotent and safe (read-only operation).
- No event logging is required for this endpoint as it's a simple data retrieval operation.
- The endpoint can be called multiple times without side effects.
- Consider rate limiting if there are concerns about excessive polling, though for a user preference lookup this is typically not necessary.
