# API Endpoint Implementation Plan: Update User Preferences

## 1. Endpoint Overview

This document outlines the implementation plan for the `PATCH /api/users/me/preferences` endpoint. Its primary purpose is to allow an authenticated user to update one or more of their travel preferences. This is a partial update operation where only the provided fields will be modified, and all other fields will remain unchanged.

## 2. Request Details

- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/users/me/preferences`
- **Parameters**: None (user ID is derived from authentication context)
- **Request Body**: A JSON object containing one or more preference fields to update. All fields are optional.
  ```json
  {
    "people_count": 3,
    "trip_type": "business",
    "age": 35,
    "country": "Germany",
    "comfort": "intense",
    "budget": "luxury"
  }
  ```

## 3. Used Types

The implementation will use the following TypeScript types defined in `src/types.ts`:

- **Request Validation**: `UpdateUserPreferencesDto` (Partial of CreateUserPreferencesDto)
- **Response**: `UserPreferencesDto`
- **Error Response**: `ErrorDto`

## 4. Response Details

- **Success (200 OK)**: Returns the complete updated `user_preferences` object.
  ```json
  {
    "user_id": "uuid-of-current-user",
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
- **Error**: Returns a standardized `ErrorDto` object with an appropriate status code (e.g., 400, 404, 500).

## 5. Data Flow

1. **Request Reception**: The Astro server endpoint at `src/pages/api/users/me/preferences.ts` receives a `PATCH` request.
2. **Authentication**: For development, the endpoint uses `DEFAULT_USER_ID` from `supabase.client.ts`. In production, Astro middleware would verify the JWT Bearer token.
3. **Input Validation**: The endpoint handler uses a Zod schema to parse and validate the request body. Since all fields are optional, the schema validates only the fields that are present.
4. **Service Logic**: The handler calls the `updateUserPreferences` function in the `UserPreferencesService`, passing the validated partial data and the Supabase client instance.
5. **Existence Check**: The service function first verifies that user preferences exist. If not, it returns a 404 error.
6. **Database Update**: If preferences exist, the service function updates only the provided fields in the `user_preferences` table.
7. **Response Generation**: The service returns the complete updated `user_preferences` record, which is sent back to the client with a 200 OK status.

## 6. Security Considerations

- **Authentication**: The endpoint is protected by authentication. For development, it uses `DEFAULT_USER_ID`. In production, it will validate the Supabase JWT token.
- **Authorization**: The business logic ensures a user can only update their own preferences. The `user_id` is taken from the secure server-side session, not from the request body.
- **Input Validation**: Zod validation on the server prevents malformed data by enforcing strict types, ranges, and lengths for any provided fields.
- **Partial Updates**: Only explicitly provided fields are updated, preventing accidental data loss or unintended modifications.
- **No Privilege Escalation**: Users cannot modify `user_id`, `created_at`, or other system-managed fields.

## 7. Performance Considerations

- **Database Indexing**: The `user_preferences` table uses `user_id` as its primary key, ensuring fast lookups and updates.
- **Atomic Updates**: The database update is performed as a single atomic operation using Supabase's `.update()` method.
- **Updated Timestamp**: The `updated_at` trigger automatically updates the timestamp, ensuring consistency without application logic.
- **Payload Size**: Both request and response payloads are small, leading to minimal network latency.

## 8. Implementation Steps

1. **Create Zod Schema for Partial Updates**: In `src/lib/services/userPreferences.service.ts`, define a Zod schema for validating partial updates:
   - Use the existing `createUserPreferencesSchema` and make it partial using `.partial()`.
   - This schema will validate only the fields present in the request body.
   - Each field that is present must still meet its validation constraints.

2. **Implement `updateUserPreferences` Service Function**: In the same service file, add the function:
   - Accept a `SupabaseClient` instance, `userId` string, and `data` (UpdateUserPreferencesDto).
   - First, query to verify preferences exist for this user (same pattern as GET).
   - If preferences don't exist, return a NOT_FOUND error.
   - Use Supabase's `.update()` method to update only the provided fields.
   - Return the complete updated record on success or an error object on failure.

3. **Add PATCH Handler to Endpoint**: In `src/pages/api/users/me/preferences.ts`, implement the `PATCH` handler:
   - Define `export const PATCH: APIRoute = async ({ request, locals }) => { ... }`.
   - Extract the Supabase client from `locals.supabase`.
   - Use `DEFAULT_USER_ID` for development (consistent with POST and GET).
   - Parse the JSON body from the request.
   - Use the partial Zod schema's `.safeParse()` method to validate the body.
   - If validation fails, return a 400 error with validation details.
   - Call the `updateUserPreferences` service function with the validated data.
   - Based on the service's return value, send the appropriate HTTP response (200 on success, 404 or 500 on failure).

4. **Error Handling**: Ensure proper error responses:
   - 400 Bad Request: When validation fails for any provided field.
   - 404 Not Found: When user preferences don't exist.
   - 500 Internal Server Error: When unexpected database errors occur.

5. **Testing Considerations**:
   - Test with valid partial updates (one field, multiple fields).
   - Test with invalid field values (e.g., `age: 5`, `people_count: 25`).
   - Test with a user who doesn't have preferences (should return 404).
   - Test with empty request body `{}` (should succeed with no changes).
   - Verify `updated_at` timestamp changes after update.
   - Verify only provided fields are updated (other fields remain unchanged).

## 9. Notes

- This endpoint is idempotent when called with the same data (repeated PATCH with same values produces same result).
- No event logging is required for preference updates (only for initial completion during onboarding).
- An empty request body `{}` is valid and will result in a 200 OK with no field changes (only `updated_at` will change).
- The `updated_at` field is automatically managed by the database trigger, not by the application code.
