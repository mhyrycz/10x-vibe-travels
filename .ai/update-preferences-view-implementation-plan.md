# View Implementation Plan: Edit User Preferences

## 1. Overview

The Edit User Preferences view allows authenticated users to modify their travel preferences after completing the initial onboarding. This view fetches current preferences from the API, displays them in an editable form, and saves updates via a PATCH request. The view reuses all field components from the onboarding flow to maintain consistency and reduce code duplication.

**Primary Purpose:**

- Display current user preferences in an editable form
- Allow users to modify one or more preference fields
- Validate changes according to the same rules as onboarding
- Save updates and provide immediate feedback
- Handle error cases (not found, validation errors, network issues)

## 2. View Routing

**Primary Route:** `/profile/preferences`

**Alternative Route:** `/settings/preferences` (if settings section exists)

**Access Control:**

- Requires authentication (uses DEFAULT_USER_ID in development)
- Accessible from user profile/settings navigation
- Redirect to `/onboarding/preferences` if preferences don't exist (404 response)

**Navigation Access Points:**

The Edit Preferences page should be accessible from multiple locations in the application:

1. **Main Navigation Menu** (Recommended)
   - Add a user menu/dropdown in the top navigation bar
   - Trigger: User icon or avatar button in header
   - Menu items:
     - "My Plans" → `/`
     - "Profile" (with nested items)
       - "Preferences" → `/profile/preferences`
       - "Settings" → `/profile/settings`
     - "Logout" → logout action
   - Location: Persistent across all pages in main layout
   - Icon: User circle or Settings icon

2. **Plans List Page** (`/` or `/plans`)
   - Add settings/gear icon button in page header
   - Alternative: Include in user menu dropdown
   - Visible on plans list view
   - Quick access without leaving main workflow

3. **Direct Link in Onboarding**
   - After completing onboarding, show message:
     - "You can update these preferences anytime from your profile settings"
     - Optional: Link directly to `/profile/preferences`

**Recommended Implementation for MVP:**

- Add simple user menu dropdown in main Layout header
- Include "Edit Preferences" as first menu item
- Ensures consistent access from any page in the application

## 3. Component Structure

```
/profile/preferences (Astro page)
├── EditPreferencesView.tsx (QueryClient wrapper)
    └── EditPreferencesContainer.tsx (Main component)
        ├── PageHeader.tsx
        ├── LoadingState (conditional - while fetching)
        ├── ErrorState (conditional - on fetch error)
        └── EditPreferencesForm.tsx (when data loaded)
            ├── Form (Shadcn/ui wrapper)
            ├── PeopleCountField.tsx (reused from onboarding)
            ├── TripTypeField.tsx (reused from onboarding)
            ├── AgeField.tsx (reused from onboarding)
            ├── CountryField.tsx (reused from onboarding)
            ├── ComfortField.tsx (reused from onboarding)
            ├── BudgetField.tsx (reused from onboarding)
            └── FormActions.tsx
                ├── Button (Cancel)
                └── Button (Save - primary)
```

## 4. Component Details

### 4.1 EditPreferencesView (Top-level Component)

**Description:**
Top-level wrapper component that provides QueryClient context for React Query. Similar to PreferencesOnboardingView, this component sets up the query infrastructure.

**Main Elements:**

- `QueryClientProvider` wrapper
- `EditPreferencesContainer` child component

**Handled Events:** None

**Validation:** None

**Types Required:**

- None (wrapper only)

**Props:** None

**Implementation Notes:**

- Create single QueryClient instance
- Configure: `refetchOnWindowFocus: false`, `retry: 1`
- Wrap entire view in provider

---

### 4.2 EditPreferencesContainer (Main Logic Component)

**Description:**
Main container component that orchestrates data fetching, loading states, error handling, and rendering the edit form. Handles the complete lifecycle of preference editing.

**Main Elements:**

- Container div with responsive padding
- Conditional rendering:
  - Loading skeleton (while fetching)
  - Error state with retry button (on error)
  - Edit form (when data loaded)

**Handled Events:**

- Mount: Trigger preferences fetch
- Retry: Re-fetch preferences on error

**Validation:** None (delegates to form)

**Types Required:**

- `UserPreferencesDto` (API response)
- `ErrorDto` (error responses)

**Props:** None

**Implementation Notes:**

- Use `useUserPreferences()` hook for data fetching
- Show loading skeleton matching form structure
- Handle 404 error specially (redirect to onboarding)
- Pass fetched data to EditPreferencesForm

---

### 4.3 PageHeader

**Description:**
Simple header component displaying the page title and description. Provides context for the edit operation.

**Main Elements:**

- `<header>` semantic HTML tag
- `<h1>` with title "Edit Your Travel Preferences"
- `<p>` with description text

**Handled Events:** None

**Validation:** None

**Types Required:** None

**Props:** None

**Example Content:**

```
Title: "Edit Your Travel Preferences"
Description: "Update your default travel settings. These preferences will be used when creating new travel plans."
```

---

### 4.4 LoadingState

**Description:**
Displays loading skeleton while preferences are being fetched from the API. Matches the structure of the edit form to prevent layout shift.

**Main Elements:**

- Card container
- 6 skeleton blocks (matching form fields)
- Skeleton for action buttons

**Handled Events:** None

**Validation:** None

**Types Required:** None

**Props:** None

**Implementation Notes:**

- Use Shadcn/ui Skeleton component
- Match heights and spacing of actual form
- Animate with pulse effect

---

### 4.5 ErrorState

**Description:**
Displays error message when preferences cannot be fetched. Includes contextual messaging and recovery options.

**Main Elements:**

- Alert component (destructive variant)
- Error icon
- Error message text
- Retry button (for network errors)
- "Complete Onboarding" button (for 404 errors)

**Handled Events:**

- Retry button click: Re-trigger fetch
- Complete Onboarding button click: Navigate to `/onboarding/preferences`

**Validation:** None

**Types Required:**

- `ErrorDto` (to extract error message)

**Props:**

```typescript
interface ErrorStateProps {
  error: Error & { status?: number; code?: string };
  onRetry: () => void;
}
```

**Error Message Mapping:**

- 404: "Preferences not found. Please complete your profile setup first."
- 401: "Your session has expired. Please log in again."
- Network error: "Unable to load preferences. Please check your connection."
- Default: "An error occurred while loading your preferences."

---

### 4.6 EditPreferencesForm

**Description:**
Main form component that displays all editable preference fields and handles form submission. Pre-fills form with current preferences and submits only changed fields to the API.

**Main Elements:**

- `Form` wrapper (react-hook-form provider)
- `<form>` element with submit handler
- 6 field components (reused from onboarding)
- FormActions component

**Handled Events:**

- Form submit: Validate and save changes
- Field changes: Track dirty state
- Form blur: Validate individual fields

**Validation:**
All validation rules match onboarding (enforced by shared Zod schema):

- **people_count:**
  - Required: Yes
  - Type: integer
  - Range: 1-20
  - Error messages: "At least 1 traveler required", "Maximum 20 travelers allowed"
- **trip_type:**
  - Required: Yes
  - Type: enum
  - Values: "leisure" | "business"
  - Error: "Please select a trip type"
- **age:**
  - Required: Yes
  - Type: integer
  - Range: 13-120
  - Error messages: "Minimum age is 13 years", "Maximum age is 120 years"
- **country:**
  - Required: Yes
  - Type: string
  - Length: 2-120 characters (trimmed)
  - Error messages: "Country name must be at least 2 characters", "Country name must not exceed 120 characters"
- **comfort:**
  - Required: Yes
  - Type: enum
  - Values: "relax" | "balanced" | "intense"
  - Error: "Please select a comfort level"
- **budget:**
  - Required: Yes
  - Type: enum
  - Values: "budget" | "moderate" | "luxury"
  - Error: "Please select a budget level"

**Types Required:**

```typescript
import { PreferencesFormValues } from "@/components/onboarding/validation";
import { UserPreferencesDto, UpdateUserPreferencesDto } from "@/types";

interface EditPreferencesFormProps {
  initialData: UserPreferencesDto;
}
```

**Props:**

- `initialData: UserPreferencesDto` - Current preferences to pre-fill form

**Implementation Notes:**

- Use react-hook-form with zodResolver
- Pre-fill defaultValues with initialData
- Validation mode: "onBlur"
- Track form.formState.dirtyFields to determine changed fields
- Build UpdateUserPreferencesDto with only dirty fields
- Call mutation.mutate() with partial update object

---

### 4.7 Field Components (Reused)

All six field components are reused directly from the onboarding implementation:

**PeopleCountField**

- Number input with +/- buttons
- Range: 1-20
- Location: `@/components/onboarding/PeopleCountField`

**TripTypeField**

- Radio group with 2 options (leisure, business)
- Location: `@/components/onboarding/TripTypeField`

**AgeField**

- Number input
- Range: 13-120
- Location: `@/components/onboarding/AgeField`

**CountryField**

- Text input
- Length: 2-120 characters
- Location: `@/components/onboarding/CountryField`

**ComfortField**

- Radio group with 3 options (relax, balanced, intense)
- Location: `@/components/onboarding/ComfortField`

**BudgetField**

- Radio group with 3 options (budget, moderate, luxury)
- Location: `@/components/onboarding/BudgetField`

**Handled Events:** Each field handles input changes via react-hook-form

**Validation:** Each field validates via FormMessage (connected to Zod schema)

**Types:** All use `useFormContext<PreferencesFormValues>()`

**Props:** None (use FormContext)

---

### 4.8 FormActions

**Description:**
Action buttons for saving changes or canceling the edit operation. Manages button states during submission.

**Main Elements:**

- Container div with flex layout
- Cancel button (secondary)
- Save button (primary)

**Handled Events:**

- Cancel click: Reset form or navigate back
- Save click: Triggers form submission

**Validation:**

- Save button disabled when:
  - Form is submitting (isPending)
  - Form is invalid (hasErrors)
  - Form is not dirty (no changes)

**Types Required:**

```typescript
interface FormActionsProps {
  isLoading: boolean;
  isDirty: boolean;
  isValid: boolean;
  onCancel: () => void;
}
```

**Props:**

- `isLoading: boolean` - Mutation pending state
- `isDirty: boolean` - Form has changes
- `isValid: boolean` - Form passes validation
- `onCancel: () => void` - Cancel handler

**Implementation Notes:**

- Cancel button: type="button", variant="outline"
- Save button: type="submit", variant="default", shows Loader2 icon when loading
- Responsive: full-width on mobile, auto-width on desktop
- Save button text: "Save Changes" (normal) / "Saving..." (loading)

## 5. Types

### 5.1 Existing Types (from types.ts)

**UserPreferencesDto** (API Response)

```typescript
{
  user_id: string; // UUID
  people_count: number; // 1-20
  trip_type: "leisure" | "business";
  age: number; // 13-120
  country: string; // 2-120 chars
  comfort: "relax" | "balanced" | "intense";
  budget: "budget" | "moderate" | "luxury";
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
```

**UpdateUserPreferencesDto** (API Request)

```typescript
Partial<{
  people_count: number;
  trip_type: "leisure" | "business";
  age: number;
  country: string;
  comfort: "relax" | "balanced" | "intense";
  budget: "budget" | "moderate" | "luxury";
}>;
```

**ErrorDto** (Error Response)

```typescript
{
  error: {
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "INTERNAL_ERROR";
    message: string;
    details?: {
      field?: string;
      constraint?: string;
    };
  };
}
```

### 5.2 Form Types (from onboarding validation.ts)

**PreferencesFormValues** (Form State)

```typescript
// Inferred from Zod schema
{
  people_count: number;
  trip_type: "leisure" | "business";
  age: number;
  country: string;
  comfort: "relax" | "balanced" | "intense";
  budget: "budget" | "moderate" | "luxury";
}
```

### 5.3 Component-Specific Types

**EditPreferencesFormProps**

```typescript
interface EditPreferencesFormProps {
  initialData: UserPreferencesDto;
}
```

**ErrorStateProps**

```typescript
interface ErrorStateProps {
  error: Error & {
    status?: number;
    code?: string;
  };
  onRetry: () => void;
}
```

**FormActionsProps**

```typescript
interface FormActionsProps {
  isLoading: boolean;
  isDirty: boolean;
  isValid: boolean;
  onCancel: () => void;
}
```

### 5.4 Hook Return Types

**useUserPreferences() Return**

```typescript
{
  data: UserPreferencesDto | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error & { status?: number; code?: string; } | null;
  refetch: () => void;
}
```

**useUpdateUserPreferences() Return**

```typescript
{
  mutate: (data: UpdateUserPreferencesDto) => void;
  isPending: boolean;
  isError: boolean;
  error: Error & { status?: number; code?: string; } | null;
}
```

## 6. State Management

### 6.1 Global State

No global state required. All state is managed through:

- React Query cache (for fetched preferences)
- Form state (react-hook-form)
- Component local state (minimal)

### 6.2 Data Fetching (useUserPreferences)

**Custom Hook:** `useUserPreferences()`

**Location:** `@/components/profile/hooks/useUserPreferences.ts`

**Purpose:** Fetch current user preferences from API

**Implementation:**

```typescript
export function useUserPreferences() {
  return useQuery({
    queryKey: ["user", "preferences"],
    queryFn: async () => {
      const response = await fetch("/api/users/me/preferences");

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & {
          status: number;
          code: string;
        };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<UserPreferencesDto>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
```

### 6.3 Data Mutation (useUpdateUserPreferences)

**Custom Hook:** `useUpdateUserPreferences()`

**Location:** `@/components/profile/hooks/useUpdateUserPreferences.ts`

**Purpose:** Update user preferences via PATCH request

**Implementation:**

```typescript
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserPreferencesDto) => {
      const response = await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & {
          status: number;
          code: string;
        };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<UserPreferencesDto>;
    },
    onSuccess: (updatedPreferences) => {
      // Update cache with new data
      queryClient.setQueryData(["user", "preferences"], updatedPreferences);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["user", "preferences"] });

      // Show success toast
      toast.success("Preferences updated successfully!", {
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error & { status?: number; code?: string }) => {
      // Show error toast
      toast.error("Failed to update preferences", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    },
    retry: false,
    networkMode: "always",
  });
}
```

### 6.4 Form State (react-hook-form)

**Managed by:** `useForm` hook from react-hook-form

**Configuration:**

```typescript
const form = useForm<PreferencesFormValues>({
  resolver: zodResolver(preferencesFormSchema),
  defaultValues: {
    people_count: initialData.people_count,
    trip_type: initialData.trip_type,
    age: initialData.age,
    country: initialData.country,
    comfort: initialData.comfort,
    budget: initialData.budget,
  },
  mode: "onBlur",
});
```

**State Tracked:**

- Field values (all 6 preferences)
- Validation errors (per field)
- Dirty state (form.formState.isDirty)
- Dirty fields (form.formState.dirtyFields)
- Submission state (form.formState.isSubmitting)

## 7. API Integration

### 7.1 Fetch Preferences

**Endpoint:** `GET /api/users/me/preferences`

**When:** Component mount (EditPreferencesContainer)

**Request:**

- Method: GET
- Headers: None (authentication handled by middleware)
- Body: None

**Response Type:** `UserPreferencesDto`

**Success Response (200):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
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

**Error Responses:**

- **404 Not Found:** Preferences don't exist
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "User preferences not found. Please complete onboarding."
    }
  }
  ```
- **401 Unauthorized:** Session expired
- **500 Internal Server Error:** Server error

**Error Handling:**

- 404: Show message + redirect to onboarding
- 401: Show message + redirect to login
- Other: Show retry option

---

### 7.2 Update Preferences

**Endpoint:** `PATCH /api/users/me/preferences`

**When:** Form submission (Save button clicked)

**Request:**

- Method: PATCH
- Headers: `Content-Type: application/json`
- Body Type: `UpdateUserPreferencesDto` (only changed fields)

**Request Body Example:**

```json
{
  "people_count": 4,
  "comfort": "intense"
}
```

**Response Type:** `UserPreferencesDto`

**Success Response (200):**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "people_count": 4,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "intense",
  "budget": "moderate",
  "created_at": "2025-12-08T10:00:00Z",
  "updated_at": "2025-12-08T15:30:00Z"
}
```

**Error Responses:**

- **400 Bad Request:** Validation error
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Age must be at least 13 years",
      "details": {
        "field": "age",
        "constraint": "min"
      }
    }
  }
  ```
- **404 Not Found:** Preferences don't exist
- **401 Unauthorized:** Session expired
- **500 Internal Server Error:** Server error

**Error Handling:**

- 400: Parse field error, show under specific field
- 404: Redirect to onboarding
- 401: Redirect to login
- Other: Show generic error toast

---

### 7.3 Building Update Request

**Logic to Extract Changed Fields:**

```typescript
const onSubmit = (formValues: PreferencesFormValues) => {
  // Get dirty fields from react-hook-form
  const dirtyFields = form.formState.dirtyFields;

  // Build update object with only changed fields
  const updateData: UpdateUserPreferencesDto = {};

  if (dirtyFields.people_count) updateData.people_count = formValues.people_count;
  if (dirtyFields.trip_type) updateData.trip_type = formValues.trip_type;
  if (dirtyFields.age) updateData.age = formValues.age;
  if (dirtyFields.country) updateData.country = formValues.country;
  if (dirtyFields.comfort) updateData.comfort = formValues.comfort;
  if (dirtyFields.budget) updateData.budget = formValues.budget;

  // Submit only changed fields
  mutation.mutate(updateData);
};
```

## 8. User Interactions

### 8.1 Page Load Sequence

**Steps:**

1. User navigates to `/profile/preferences`
2. EditPreferencesContainer mounts
3. useUserPreferences() hook triggers GET request
4. LoadingState displays (skeleton)
5. On success:
   - Data cached in React Query
   - EditPreferencesForm renders with pre-filled values
6. On error:
   - ErrorState displays
   - Appropriate message based on error code
   - Retry or navigation option shown

**Loading UI:**

- Skeleton matching form layout
- Pulse animation
- "Loading preferences..." text

**Error UI (404):**

- Alert with warning icon
- Message: "Preferences not found. Please complete your profile setup first."
- Button: "Complete Profile" → `/onboarding/preferences`

**Error UI (Network):**

- Alert with error icon
- Message: "Unable to load preferences. Please check your connection."
- Button: "Retry"

---

### 8.2 Editing Fields

**Interaction Flow:**

1. Form displays with current values
2. User clicks/taps into field
3. User modifies value
4. On blur: Field validation runs
5. If invalid:
   - Red border on field
   - Error message below field
   - Save button remains enabled (allows multiple edits)
6. If valid:
   - Normal border
   - No error message
   - Form isDirty becomes true

**Visual Feedback:**

- Changed fields: Show subtle indicator (e.g., asterisk or badge)
- Validation errors: Red border + error text
- Focus state: Blue ring
- Disabled state: Grayed out during submission

---

### 8.3 Saving Changes

**Interaction Flow:**

1. User clicks "Save Changes" button
2. Form validation runs on all fields
3. If form invalid:
   - Show errors under invalid fields
   - Scroll to first error
   - Button remains enabled (allow corrections)
   - No API call
4. If form valid:
   - Save button shows loading state (Loader2 icon)
   - Save button disabled
   - All fields disabled
   - PATCH request sent with only changed fields
5. On success:
   - Toast: "Preferences updated successfully!"
   - Query cache updated
   - Form resets to non-dirty state
   - Fields re-enabled
   - Save button returns to normal state
6. On error:
   - Toast: Error message from API
   - Fields re-enabled
   - Save button returns to normal state
   - Form remains dirty (user can retry)

**Button States:**

- Normal: "Save Changes" (enabled when form dirty and valid)
- Loading: "Saving..." with spinner (during API call)
- Disabled: Grayed out (when not dirty or invalid or loading)

---

### 8.4 Canceling Changes

**Interaction Flow:**

1. User clicks "Cancel" button
2. If form not dirty:
   - Navigate back immediately (to profile or previous page)
3. If form dirty:
   - Show confirmation dialog
   - Message: "You have unsaved changes. Are you sure you want to cancel?"
   - Buttons: "Stay", "Discard Changes"
4. If "Discard Changes":
   - Reset form to initial values
   - Navigate back
5. If "Stay":
   - Close dialog
   - Return to form

**Alternative:** Simple reset without navigation (depends on UX preference)

---

### 8.5 Keyboard Interactions

**Supported:**

- Tab: Navigate between fields
- Shift+Tab: Navigate backwards
- Enter: Submit form (when not in textarea)
- Escape: Cancel edit (if dialog, close dialog)
- Arrow keys: Navigate radio groups
- Space: Toggle radio button

**Accessibility:**

- All interactive elements keyboard accessible
- Focus visible states
- Screen reader announcements for validation errors
- ARIA labels on all inputs

## 9. Conditions and Validation

### 9.1 Pre-submission Validation

**Conditions Checked Before API Call:**

1. **Form Validity**
   - All fields pass Zod schema validation
   - No validation errors present
   - Check: `form.formState.isValid`

2. **Form Dirty State**
   - At least one field has been modified
   - Prevents unnecessary API calls
   - Check: `form.formState.isDirty`

3. **Not Currently Submitting**
   - Prevent duplicate submissions
   - Check: `!mutation.isPending`

**Save Button Disabled When:**

```typescript
const isSaveDisabled =
  !form.formState.isDirty || // No changes made
  !form.formState.isValid || // Form has errors
  mutation.isPending; // Already submitting
```

---

### 9.2 Field-Level Validation

Each field validates independently on blur. Validation rules:

**people_count (PeopleCountField):**

- Validates on: blur, value change
- Rules:
  - Must be integer
  - Min: 1, Error: "At least 1 traveler is required"
  - Max: 20, Error: "Maximum 20 travelers allowed"
- UI: +/- buttons auto-enforce range
- Components affected: Input, decrement button (disabled at 1), increment button (disabled at 20)

**trip_type (TripTypeField):**

- Validates on: selection
- Rules:
  - Must be enum value: "leisure" | "business"
  - Error: "Please select a trip type"
- UI: Radio group (exactly one selected)
- Components affected: RadioGroupItem (leisure), RadioGroupItem (business)

**age (AgeField):**

- Validates on: blur
- Rules:
  - Must be integer
  - Min: 13, Error: "Minimum age is 13 years"
  - Max: 120, Error: "Maximum age is 120 years"
- UI: Number input with min/max attributes
- Components affected: Input field

**country (CountryField):**

- Validates on: blur
- Rules:
  - Trimmed automatically
  - Min length: 2, Error: "Country name must be at least 2 characters"
  - Max length: 120, Error: "Country name must not exceed 120 characters"
- UI: Text input
- Components affected: Input field

**comfort (ComfortField):**

- Validates on: selection
- Rules:
  - Must be enum value: "relax" | "balanced" | "intense"
  - Error: "Please select a comfort level"
- UI: Radio group (exactly one selected)
- Components affected: RadioGroupItem (relax), RadioGroupItem (balanced), RadioGroupItem (intense)

**budget (BudgetField):**

- Validates on: selection
- Rules:
  - Must be enum value: "budget" | "moderate" | "luxury"
  - Error: "Please select a budget level"
- UI: Radio group (exactly one selected)
- Components affected: RadioGroupItem (budget), RadioGroupItem (moderate), RadioGroupItem (luxury)

---

### 9.3 Server-Side Validation

**API validates same rules on PATCH request.**

**Handling 400 Validation Error:**

1. Parse `error.details.field` to identify which field
2. Use `form.setError()` to mark field as invalid
3. Display error message under specific field
4. Show generic toast: "Please fix validation errors"

**Example:**

```typescript
if (error.status === 400 && error.details?.field) {
  form.setError(error.details.field as keyof PreferencesFormValues, {
    type: "server",
    message: error.message,
  });
}
```

---

### 9.4 UI State Conditions

**Loading State (Initial Load):**

- Condition: `isLoading === true`
- UI: LoadingState component (skeleton)
- Components affected: Entire view

**Error State (Fetch Failed):**

- Condition: `isError === true`
- UI: ErrorState component with message and retry
- Components affected: Entire view

**Form State (Data Loaded):**

- Condition: `data !== undefined && !isError`
- UI: EditPreferencesForm with all fields
- Components affected: All form components

**Submitting State:**

- Condition: `mutation.isPending === true`
- UI Effects:
  - Save button: Disabled, shows spinner
  - Cancel button: Disabled
  - All form fields: Disabled
- Components affected: FormActions, all input fields

**Form Dirty State:**

- Condition: `form.formState.isDirty === true`
- UI Effects:
  - Save button: Enabled (if valid)
  - Visual indicator: Optional badge/asterisk on changed fields
- Components affected: Save button, optionally field labels

## 10. Error Handling

### 10.1 Fetch Errors (GET Request)

**Error: 404 Not Found**

- **Meaning:** User hasn't completed onboarding
- **UI Response:**
  - Show alert: "Preferences not found. Please complete your profile setup first."
  - Button: "Complete Profile" → redirect to `/onboarding/preferences`
  - Icon: Warning icon
- **Recovery:** Redirect to onboarding flow

**Error: 401 Unauthorized**

- **Meaning:** Session expired or invalid token
- **UI Response:**
  - Toast: "Your session has expired. Please log in again."
  - After 2 seconds: Redirect to `/login`
- **Recovery:** User must re-authenticate

**Error: 500 Internal Server Error**

- **Meaning:** Server-side issue
- **UI Response:**
  - Show alert: "Unable to load preferences. Please try again later."
  - Button: "Retry" → trigger refetch
  - Icon: Error icon
- **Recovery:** Retry, if persists suggest checking status page

**Error: Network Error (Timeout, No Connection)**

- **Meaning:** Client can't reach server
- **UI Response:**
  - Show alert: "Unable to load preferences. Please check your connection."
  - Button: "Retry" → trigger refetch
  - Icon: Warning icon
- **Recovery:** Check connection, retry

---

### 10.2 Update Errors (PATCH Request)

**Error: 400 Validation Error**

- **Meaning:** One or more fields failed validation
- **UI Response:**
  - Parse `error.details.field` to identify invalid field
  - Show error message under specific field (red border + text)
  - Toast: "Please fix validation errors"
  - Keep form dirty (allow corrections)
- **Recovery:** User corrects invalid fields and retries

**Example Field Errors:**

- age < 13: "Minimum age is 13 years"
- people_count > 20: "Maximum 20 travelers allowed"
- country too short: "Country name must be at least 2 characters"

**Error: 404 Not Found**

- **Meaning:** Preferences were deleted between fetch and update
- **UI Response:**
  - Toast: "Preferences not found. Redirecting to profile setup..."
  - After 2 seconds: Redirect to `/onboarding/preferences`
- **Recovery:** User completes onboarding again

**Error: 401 Unauthorized**

- **Meaning:** Session expired during edit
- **UI Response:**
  - Toast: "Your session has expired. Please log in again."
  - After 2 seconds: Redirect to `/login`
- **Recovery:** User must re-authenticate (form data lost)

**Error: 409 Conflict (unlikely)**

- **Meaning:** Concurrent update conflict
- **UI Response:**
  - Toast: "Preferences were updated elsewhere. Reloading..."
  - Trigger refetch to get latest data
  - Form resets with new data
- **Recovery:** User sees latest data, can make changes again

**Error: 500 Internal Server Error**

- **Meaning:** Server couldn't process update
- **UI Response:**
  - Toast: "Failed to save preferences. Please try again."
  - Keep form dirty (allow retry)
  - Button returns to normal state
- **Recovery:** User can retry immediately

**Error: Network Error**

- **Meaning:** Request didn't reach server
- **UI Response:**
  - Toast: "Connection error. Please check your network and try again."
  - Keep form dirty (preserve changes)
  - Button returns to normal state
- **Recovery:** Fix connection, retry

---

### 10.3 Edge Cases

**Edge Case: User Has No Preferences (404 on Load)**

- **Scenario:** User navigated directly to edit page without completing onboarding
- **Handling:**
  - ErrorState with specific message
  - "Complete Profile" button → `/onboarding/preferences`
  - Don't show form at all

**Edge Case: All Fields Same (No Changes)**

- **Scenario:** User submits without changing anything
- **Handling:**
  - Save button disabled when `!form.formState.isDirty`
  - No API call possible
  - Optional: Show tooltip "No changes to save"

**Edge Case: Session Expires During Edit**

- **Scenario:** User spends long time editing, session times out
- **Handling:**
  - 401 error on submit
  - Toast: "Session expired"
  - Redirect to login
  - User loses unsaved changes (acceptable for MVP)

**Edge Case: Validation Passes Client but Fails Server**

- **Scenario:** Mismatch between client/server validation (shouldn't happen)
- **Handling:**
  - Show server error message
  - Mark field as invalid
  - Log discrepancy for debugging

**Edge Case: Network Failure Mid-Submit**

- **Scenario:** Request times out or connection drops during PATCH
- **Handling:**
  - Show network error toast
  - Form remains dirty
  - User can retry
  - No data corruption (PATCH is idempotent)

---

### 10.4 Error Message Mapping

**User-Friendly Messages:**

| Error Code        | Message                                                            | Action                 |
| ----------------- | ------------------------------------------------------------------ | ---------------------- |
| VALIDATION_ERROR  | "Please fix validation errors"                                     | Show under fields      |
| NOT_FOUND (GET)   | "Preferences not found. Please complete your profile setup first." | Redirect to onboarding |
| NOT_FOUND (PATCH) | "Preferences not found. Redirecting to profile setup..."           | Redirect to onboarding |
| UNAUTHORIZED      | "Your session has expired. Please log in again."                   | Redirect to login      |
| INTERNAL_ERROR    | "An error occurred. Please try again later."                       | Allow retry            |
| Network error     | "Connection error. Please check your network and try again."       | Allow retry            |

## 11. Implementation Steps

### Step 1: Create Directory Structure

```
src/components/profile/
├── EditPreferencesView.tsx
├── EditPreferencesContainer.tsx
├── EditPreferencesForm.tsx
├── PageHeader.tsx
├── LoadingState.tsx
├── ErrorState.tsx
├── FormActions.tsx
└── hooks/
    ├── useUserPreferences.ts
    └── useUpdateUserPreferences.ts
```

### Step 2: Create useUserPreferences Hook

- File: `src/components/profile/hooks/useUserPreferences.ts`
- Implement useQuery for GET /api/users/me/preferences
- Configure: queryKey, queryFn, staleTime, retry
- Error handling with status codes

### Step 3: Create useUpdateUserPreferences Hook

- File: `src/components/profile/hooks/useUpdateUserPreferences.ts`
- Implement useMutation for PATCH /api/users/me/preferences
- onSuccess: invalidate query, show toast
- onError: show error toast
- networkMode: "always", retry: false

### Step 4: Create PageHeader Component

- File: `src/components/profile/PageHeader.tsx`
- Simple semantic HTML
- Heading: "Edit Your Travel Preferences"
- Description text
- Responsive typography

### Step 5: Create LoadingState Component

- File: `src/components/profile/LoadingState.tsx`
- Use Shadcn/ui Skeleton component
- Match form field layout (6 fields)
- Card wrapper with padding

### Step 6: Create ErrorState Component

- File: `src/components/profile/ErrorState.tsx`
- Props: error, onRetry
- Alert component (destructive variant)
- Conditional buttons based on error.status
- Error icon from lucide-react

### Step 7: Create FormActions Component

- File: `src/components/profile/FormActions.tsx`
- Props: isLoading, isDirty, isValid, onCancel
- Two buttons: Cancel (outline) and Save (primary)
- Save button: disabled logic, loading state
- Responsive layout (flex)

### Step 8: Create EditPreferencesForm Component

- File: `src/components/profile/EditPreferencesForm.tsx`
- Props: initialData (UserPreferencesDto)
- useForm with zodResolver, defaultValues from initialData
- Import 6 field components from onboarding
- onSubmit: build UpdateUserPreferencesDto with dirty fields only
- Use useUpdateUserPreferences mutation
- Integrate FormActions with proper props

### Step 9: Create EditPreferencesContainer Component

- File: `src/components/profile/EditPreferencesContainer.tsx`
- Use useUserPreferences hook
- Conditional rendering:
  - if isLoading: LoadingState
  - if isError: ErrorState with refetch
  - if data: EditPreferencesForm with initialData
- Handle 404 → redirect logic
- Container layout (max-w-2xl, padding, card)

### Step 10: Create EditPreferencesView Component

- File: `src/components/profile/EditPreferencesView.tsx`
- Create QueryClient instance
- QueryClientProvider wrapper
- Render EditPreferencesContainer
- Export as default

### Step 11: Create Astro Page Route

- File: `src/pages/profile/preferences.astro`
- Import EditPreferencesView
- Render with client:load directive
- Add Layout wrapper
- Authentication check (DEFAULT_USER_ID)

### Step 12: Add Navigation Menu

- **Option A: User Menu Dropdown (Recommended for MVP)**
  - Add user menu button to main Layout header
  - Location: Top-right corner of navigation bar
  - Button: User icon (from lucide-react: User, UserCircle, or Settings)
  - Dropdown menu items:
    - "Edit Preferences" → `/profile/preferences`
    - Divider
    - "Logout" → logout handler
  - Use Shadcn/ui DropdownMenu component
  - Make persistent across all authenticated pages

- **Option B: Simple Link in Plans Header**
  - Add settings gear icon to plans page header
  - Direct link to `/profile/preferences`
  - Tooltip: "Edit travel preferences"
- **Implementation:**
  - File: `src/layouts/Layout.astro` or create `src/components/navigation/UserMenu.tsx`
  - Use Astro's client:load directive for React dropdown
  - Show menu only when authenticated
  - Test navigation from plans list page

### Step 13: Test Fetch Flow

- Navigate to page
- Verify loading state appears
- Verify data fetches and form pre-fills
- Test 404 case (delete preferences)
- Test network error (offline mode)

### Step 14: Test Edit Flow

- Change single field, verify dirty state
- Change multiple fields
- Verify validation on blur
- Test invalid values (out of range, etc.)
- Verify error messages appear correctly

### Step 15: Test Save Flow

- Submit valid changes
- Verify only changed fields sent to API
- Verify success toast appears
- Verify query cache updates
- Verify form resets to clean state

### Step 16: Test Error Scenarios

- Submit with validation errors (client-side)
- Trigger 400 from server (modify request)
- Test 404 during update (delete preferences mid-edit)
- Test 401 (expire session)
- Test network failure (throttle/offline)

### Step 17: Test Cancel Flow

- Click cancel with no changes → navigate back
- Click cancel with changes → show confirmation
- Test confirmation dialog buttons
- Verify form state on cancel

### Step 18: Accessibility Testing

- Test keyboard navigation (tab through all fields)
- Test screen reader announcements
- Verify focus visible states
- Test with keyboard only (no mouse)
- Validate ARIA attributes

### Step 19: Responsive Testing

- Test on mobile viewport (320px-768px)
- Test on tablet viewport (768px-1024px)
- Test on desktop viewport (1024px+)
- Verify touch targets (44x44px minimum)
- Test form layout on different screen sizes

### Step 20: Integration Testing

- Create preferences via onboarding
- Edit preferences
- Create new plan (verify new defaults used)
- Edit preferences again
- Verify changes persist across sessions

### Step 21: Error Recovery Testing

- Test retry button on network error
- Test "Complete Profile" button on 404
- Verify form data preserved on soft errors
- Test concurrent update scenario (unlikely but possible)

### Step 22: Polish and Refinement

- Add loading skeletons animation
- Fine-tune toast messages
- Add subtle transitions
- Verify button states clear
- Test form reset behavior
- Add any missing aria-labels

### Step 23: Documentation

- Add JSDoc comments to hooks
- Document component props
- Add inline comments for complex logic
- Update README if needed

### Step 24: Code Review

- Check for console.errors in production
- Verify no unused imports
- Check TypeScript strict mode compliance
- Review error handling completeness
- Verify consistent naming conventions

### Step 25: Performance Check

- Verify query cache working (no duplicate fetches)
- Check bundle size impact
- Test with React DevTools Profiler
- Verify no unnecessary re-renders
- Check network tab for API calls

### Step 26: Final QA Pass

- Test all user flows end-to-end
- Verify all acceptance criteria met (US-004)
- Test edge cases one more time
- Verify consistent with onboarding UX
- Get stakeholder approval

---

## Implementation Checklist

- [ ] Step 1: Create directory structure
- [ ] Step 2: Create useUserPreferences hook
- [ ] Step 3: Create useUpdateUserPreferences hook
- [ ] Step 4: Create PageHeader component
- [ ] Step 5: Create LoadingState component
- [ ] Step 6: Create ErrorState component
- [ ] Step 7: Create FormActions component
- [ ] Step 8: Create EditPreferencesForm component
- [ ] Step 9: Create EditPreferencesContainer component
- [ ] Step 10: Create EditPreferencesView component
- [ ] Step 11: Create Astro page route
- [ ] Step 12: Add navigation link
- [ ] Step 13: Test fetch flow
- [ ] Step 14: Test edit flow
- [ ] Step 15: Test save flow
- [ ] Step 16: Test error scenarios
- [ ] Step 17: Test cancel flow
- [ ] Step 18: Accessibility testing
- [ ] Step 19: Responsive testing
- [ ] Step 20: Integration testing
- [ ] Step 21: Error recovery testing
- [ ] Step 22: Polish and refinement
- [ ] Step 23: Documentation
- [ ] Step 24: Code review
- [ ] Step 25: Performance check
- [ ] Step 26: Final QA pass

---

**Estimated Implementation Time:** 8-12 hours for experienced React developer

**Key Dependencies:**

- Onboarding components (field components reused)
- Shared validation schema (preferencesFormSchema)
- API endpoint functional (/api/users/me/preferences)
- Authentication middleware working

**Success Criteria:**

- User can view current preferences
- User can edit and save changes
- Only changed fields sent to API
- Success/error feedback via toasts
- Proper error handling for all scenarios
- Accessible and responsive
- Consistent with app patterns
