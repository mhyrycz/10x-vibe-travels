# View Implementation Plan: Create New Plan Page

## 1. Overview

The Create New Plan page is the core feature of the VibeTravels application, allowing authenticated users to generate AI-powered travel itineraries. Users provide a travel note describing their trip ideas, select a destination, define date ranges, and specify travel preferences. Upon submission, the system calls an AI service to generate a detailed day-by-day itinerary with morning, afternoon, and evening blocks containing specific activities. This view must enforce business rules such as the 10-plan limit, validate date ranges, and provide clear feedback during the AI generation process.

## 2. View Routing

- **Path**: `/plans/new`
- **Authentication**: Required. Unauthenticated users should be redirected to `/login`.
- **Navigation**: Users reach this page by clicking the "Create New Plan" button from the Dashboard (My Plans page).

## 3. Component Structure

The view follows a hierarchical structure with Astro for the page container and React for interactive form components:

```
- CreatePlanPage (`/src/pages/plans/new.astro`)
  - MainLayout (`/src/layouts/Layout.astro`)
    - Header (from MainLayout)
    - CreatePlanView (React Component, client:load)
      - PageHeader
        - Breadcrumb (Home / My Plans / New Plan)
        - Heading ("Create New Travel Plan")
      - CreatePlanForm
        - DestinationSection
          - Label ("Destination")
          - Input (destination_text)
        - DateRangeSection
          - Label ("Travel Dates")
          - DatePicker (date_start)
          - DatePicker (date_end)
          - Helper Text (date range validation info)
        - TravelNoteSection
          - Label ("Travel Note")
          - Textarea (note_text)
          - Character Counter
        - PreferencesSection
          - Label ("Travel Preferences")
          - PeopleCountInput (number input)
          - TripTypeRadioGroup (leisure/business)
          - ComfortRadioGroup (relax/balanced/intense)
          - BudgetRadioGroup (budget/moderate/luxury)
        - TransportSection
          - Label ("Preferred Transport")
          - TransportCheckboxGroup (car/walk/public)
        - FormActions
          - CancelButton (link to "/")
          - SubmitButton ("Generate Plan")
      - LoadingOverlay (shown during AI generation)
        - Spinner
        - LoadingMessage ("Generating your travel plan...")
      - PlanLimitAlert (shown when user has 10 plans)
        - Alert Component
        - Message with link to dashboard
```

## 4. Component Details

### CreatePlanView
- **Component Description**: The main orchestrator component that manages the entire form state, handles API calls, and coordinates the creation flow. It fetches user preferences to pre-fill form fields and manages the plan creation lifecycle.
- **Main Elements**: A container `div` with `max-w-4xl mx-auto` wrapper containing `PageHeader`, `CreatePlanForm`, `LoadingOverlay`, and `PlanLimitAlert`.
- **Handled Interactions**: 
  - Fetches user preferences on mount
  - Fetches current plan count on mount
  - Handles form submission
  - Manages loading states during AI generation
  - Handles navigation after successful creation
- **Handled Validation**: Overall form orchestration, checks plan limit before allowing submission.
- **Types**: `CreatePlanViewModel`, `CreatePlanDto`, `PlanDto`, `UserPreferencesDto`
- **Props**: None (receives user context from AuthContext)

### PageHeader
- **Component Description**: Displays the breadcrumb navigation and page heading.
- **Main Elements**: Shadcn/ui `Breadcrumb` component showing path from Home to current page, followed by an `h1` element with page title.
- **Handled Interactions**: Breadcrumb links for navigation back to dashboard.
- **Handled Validation**: None.
- **Types**: None.
- **Props**: None.

### CreatePlanForm
- **Component Description**: The main form container managing all input fields and form state using react-hook-form with Zod validation schema.
- **Main Elements**: An HTML `<form>` element containing all form sections, wrapped in a Shadcn/ui `Card` for visual grouping.
- **Handled Interactions**:
  - `onSubmit`: Validates form data and triggers plan creation API call
  - Field change handlers for real-time validation feedback
- **Handled Validation**: All field-level validations defined in the Zod schema (see section 9).
- **Types**: `CreatePlanFormData` (client-side view model), `CreatePlanDto` (API DTO)
- **Props**:
  - `defaultValues: Partial<CreatePlanFormData>` (pre-filled from user preferences)
  - `isLoading: boolean` (disables form during submission)
  - `planCount: number` (current user plan count)
  - `planLimit: number` (maximum allowed plans, default 10)
  - `onSubmit: (data: CreatePlanDto) => Promise<void>`
  - `onCancel: () => void`

### DestinationSection
- **Component Description**: Input field for the destination with label and validation feedback.
- **Main Elements**: Shadcn/ui `Label` and `Input` components, `FormDescription` for helper text, `FormMessage` for error display.
- **Handled Interactions**: Text input with debounced validation.
- **Handled Validation**: 
  - Required field
  - Length: 1-160 characters
  - Shows error immediately on blur if empty or exceeds length
- **Types**: None (string field).
- **Props**: Receives control from parent form via react-hook-form context.

### DateRangeSection
- **Component Description**: Two date picker fields for selecting travel date range with validation rules displayed as helper text.
- **Main Elements**: Two Shadcn/ui `DatePicker` components (based on `Popover` and `Calendar`), `FormDescription` with validation rules, `FormMessage` for errors.
- **Handled Interactions**: 
  - Date selection from calendar UI
  - Manual date input
  - Cross-field validation (date_end >= date_start)
- **Handled Validation**:
  - `date_start`: Cannot be in the past (relative to current date at midnight)
  - `date_end`: Must be >= `date_start`
  - Date range: Maximum 30 days between start and end
  - Shows helper text: "Trip duration: X days (max 30 days)"
  - Shows error messages for violated constraints
- **Types**: Date values as ISO string format (YYYY-MM-DD).
- **Props**: Receives control from parent form via react-hook-form context.

### TravelNoteSection
- **Component Description**: Large textarea for users to enter freeform travel notes, ideas, links, and activity suggestions with character counter.
- **Main Elements**: Shadcn/ui `Label`, `Textarea` component with resizable height, character counter display showing "X / 20000", `FormMessage` for errors.
- **Handled Interactions**: 
  - Multi-line text input
  - Auto-resize behavior (optional)
- **Handled Validation**:
  - Maximum length: 20,000 characters
  - Shows character count updating in real-time
  - Shows warning when approaching limit (e.g., at 19,000 characters)
  - Shows error when limit exceeded
- **Types**: String field.
- **Props**: Receives control from parent form via react-hook-form context.

### PreferencesSection
- **Component Description**: Group of form fields for travel preferences, pre-filled with user profile preferences but editable for this specific plan.
- **Main Elements**: Container `div` with grid layout, containing:
  - `PeopleCountInput`: Number input field (1-20)
  - `TripTypeRadioGroup`: Radio buttons for "Leisure" / "Business"
  - `ComfortRadioGroup`: Radio buttons for "Relax" / "Balanced" / "Intense"
  - `BudgetRadioGroup`: Radio buttons for "Budget" / "Moderate" / "Luxury"
- **Handled Interactions**: Selection of radio button values, number input changes.
- **Handled Validation**:
  - `people_count`: Integer between 1 and 20, required
  - `trip_type`: Enum validation (leisure | business), required
  - `comfort`: Enum validation (relax | balanced | intense), required
  - `budget`: Enum validation (budget | moderate | luxury), required
  - All fields show error messages on invalid values
- **Types**: 
  - `people_count`: number
  - `trip_type`: TripTypeEnum
  - `comfort`: ComfortLevelEnum
  - `budget`: BudgetLevelEnum
- **Props**: 
  - `defaultValues: UserPreferencesDto` (pre-filled values)
  - Receives control from parent form via react-hook-form context

### TransportSection
- **Component Description**: Multi-select checkbox group for preferred transport modes with clear explanation of how selections influence AI decisions.
- **Main Elements**: Container with `Label`, `FormDescription` ("Select one or more transport options. AI will optimize between selected modes."), and `CheckboxGroup` with three options:
  - Car
  - Walk
  - Public Transport
- **Handled Interactions**: 
  - Multiple checkbox selections
  - Can be left unselected (null) to let AI decide
- **Handled Validation**:
  - Optional field (nullable array)
  - Valid values: "car" | "walk" | "public"
  - No minimum selection required
- **Types**: `TransportModeEnum[]` or null
- **Props**: Receives control from parent form via react-hook-form context

### FormActions
- **Component Description**: Action buttons section at the bottom of the form.
- **Main Elements**: Flex container with two Shadcn/ui `Button` components:
  - Cancel button (variant: "outline", navigates to "/")
  - Submit button (variant: "default", text: "Generate Plan")
- **Handled Interactions**:
  - Cancel: Navigate back to dashboard without saving
  - Submit: Trigger form validation and submission
- **Handled Validation**: Submit button disabled when form is invalid or loading.
- **Types**: None.
- **Props**:
  - `isLoading: boolean`
  - `isValid: boolean`
  - `onCancel: () => void`

### LoadingOverlay
- **Component Description**: Full-screen overlay displayed during AI plan generation, preventing user interaction and showing generation progress.
- **Main Elements**: Fixed positioned `div` with backdrop blur, centered content containing:
  - Shadcn/ui `Spinner` or custom loading animation
  - Heading: "Generating your travel plan..."
  - Progress message: "This may take 10-30 seconds"
  - Optional: Progress bar (indeterminate)
- **Handled Interactions**: None (blocks all interaction).
- **Handled Validation**: None.
- **Types**: None.
- **Props**:
  - `isVisible: boolean`
  - `message?: string` (optional custom loading message)

### PlanLimitAlert
- **Component Description**: Alert banner displayed at top of page when user has reached the 10-plan limit, blocking plan creation.
- **Main Elements**: Shadcn/ui `Alert` component (variant: "destructive") with:
  - Alert icon
  - Alert title: "Plan Limit Reached"
  - Alert description: "You have reached the maximum of 10 plans. Please delete an existing plan to create a new one."
  - Link button: "Go to My Plans"
- **Handled Interactions**: Link to dashboard ("/") for plan management.
- **Handled Validation**: None.
- **Types**: None.
- **Props**:
  - `isVisible: boolean` (shown when planCount >= planLimit)
  - `planCount: number`
  - `planLimit: number`

## 5. Types

### CreatePlanDto (from API - Request Type)
Already defined in `src/types.ts`. This is the exact structure sent to `POST /api/plans`:
```typescript
export type CreatePlanDto = Pick<
  TablesInsert<"plans">,
  | "destination_text"
  | "date_start"
  | "date_end"
  | "note_text"
  | "people_count"
  | "trip_type"
  | "comfort"
  | "budget"
  | "transport_modes"
>;
```

**Fields:**
- `destination_text`: string (1-160 chars)
- `date_start`: string (ISO date YYYY-MM-DD)
- `date_end`: string (ISO date YYYY-MM-DD)
- `note_text`: string (max 20000 chars)
- `people_count`: number (1-20)
- `trip_type`: "leisure" | "business"
- `comfort`: "relax" | "balanced" | "intense"
- `budget`: "budget" | "moderate" | "luxury"
- `transport_modes`: ("car" | "walk" | "public")[] | null

### PlanDto (from API - Response Type)
Already defined in `src/types.ts`. This is returned by `POST /api/plans` on success (201):
```typescript
export type PlanDto = Plan & {
  days: DayDto[];
};
```
Contains complete plan with nested days, blocks, and activities structure.

### CreatePlanFormData (Client-side View Model)
New type needed for react-hook-form state. Matches CreatePlanDto structure but may include additional UI state:
```typescript
export interface CreatePlanFormData {
  destination_text: string;
  date_start: string; // ISO date string YYYY-MM-DD
  date_end: string; // ISO date string YYYY-MM-DD
  note_text: string;
  people_count: number;
  trip_type: "leisure" | "business";
  comfort: "relax" | "balanced" | "intense";
  budget: "budget" | "moderate" | "luxury";
  transport_modes: ("car" | "walk" | "public")[] | null;
}
```

**Note**: This type is identical to `CreatePlanDto` for this view, but we define it separately to allow for future UI-specific fields (like temporary UI state, field touch tracking, etc.) without polluting the API DTO.

### CreatePlanViewModel
New type needed to represent the full view state:
```typescript
export interface CreatePlanViewModel {
  userPreferences: UserPreferencesDto | null;
  isLoadingPreferences: boolean;
  planCount: number;
  isLoadingPlanCount: boolean;
  planLimit: number; // constant: 10
  isCreatingPlan: boolean;
  canCreatePlan: boolean; // derived: planCount < planLimit
  formErrors: FieldErrors<CreatePlanFormData>; // from react-hook-form
}
```

**Field Explanations:**
- `userPreferences`: User's saved travel preferences fetched from API to pre-fill form
- `isLoadingPreferences`: Loading state for preferences fetch
- `planCount`: Current number of plans user has (for limit enforcement)
- `isLoadingPlanCount`: Loading state for plan count fetch
- `planLimit`: Maximum allowed plans (constant: 10)
- `canCreatePlan`: Derived boolean controlling whether form can be submitted
- `isCreatingPlan`: Loading state during AI generation and plan creation
- `formErrors`: Form validation errors from react-hook-form

### UserPreferencesDto (from API)
Already defined in `src/types.ts`, used to pre-fill form:
```typescript
export type UserPreferencesDto = UserPreferences;
```
Contains fields: `people_count`, `trip_type`, `age`, `country`, `comfort`, `budget`.

### ErrorDto (from API)
Already defined in `src/types.ts`, used for error handling:
```typescript
export interface ErrorDto {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailsDto;
  };
}
```

## 6. State Management

State management for this view uses a combination of React hooks and React Query:

### Local Component State (useState)
- `planCount: number` - Fetched on mount, determines if user can create new plan
- `isLoadingPlanCount: boolean` - Loading state for plan count fetch

### React Hook Form State
- Form field values managed by `useForm<CreatePlanFormData>()`
- Default values populated from `UserPreferencesDto` on mount
- Field-level errors tracked automatically
- Form validation state (`isValid`, `isDirty`) tracked by react-hook-form

### React Query State
1. **useUserPreferences()** - Custom hook to fetch user preferences
   - Query Key: `['user', 'preferences']`
   - Endpoint: `GET /api/users/me/preferences`
   - Used to pre-fill form on mount
   - Cached for efficiency

2. **useCreatePlan()** - Custom mutation hook for plan creation
   - Mutation: `POST /api/plans`
   - Request: `CreatePlanDto`
   - Response: `PlanDto`
   - On Success: 
     - Invalidate plans list query cache
     - Navigate to new plan detail page or dashboard
     - Show success toast notification
   - On Error:
     - Show error toast with specific message
     - Re-enable form for corrections

### Derived State
- `canCreatePlan = planCount < 10` - Controls form submission availability
- `formDefaultValues` - Computed from `UserPreferencesDto` when loaded
- `tripDurationDays` - Computed from date_start and date_end for display

### State Flow
1. **Component Mount**:
   - Fetch user preferences via `useUserPreferences()`
   - Fetch plan count via separate API call to `GET /api/plans?limit=1` and extract `pagination.total`
   - Show skeleton loader during data fetch

2. **Form Initialization**:
   - When preferences loaded, call `form.reset(defaultValues)` to populate fields
   - Fields become editable, form becomes interactive

3. **User Interaction**:
   - Field changes tracked by react-hook-form
   - Validation runs on blur and on submit attempt
   - Error messages displayed under invalid fields

4. **Form Submission**:
   - User clicks "Generate Plan"
   - Form validation runs (Zod schema)
   - If valid and `canCreatePlan === true`:
     - Show `LoadingOverlay`
     - Call `createPlanMutation.mutate(formData)`
     - Disable form interaction
   - If plan limit reached:
     - Show `PlanLimitAlert`
     - Prevent submission

5. **API Response**:
   - **Success**: 
     - Hide `LoadingOverlay`
     - Invalidate plans cache
     - Navigate to `/plans/[newPlanId]` or back to dashboard with success message
   - **Error**:
     - Hide `LoadingOverlay`
     - Re-enable form
     - Show error toast with API error message
     - If error is "Plan limit reached", show `PlanLimitAlert`

## 7. API Integration

### Primary Endpoint: Create Plan
- **Method**: `POST`
- **Path**: `/api/plans`
- **Request Type**: `CreatePlanDto`
- **Response Type**: `PlanDto` (success), `ErrorDto` (error)
- **Status Codes**:
  - `201 Created`: Plan successfully generated
  - `400 Bad Request`: Validation error (details in response)
  - `403 Forbidden`: Plan limit reached (10 plans)
  - `429 Too Many Requests`: Rate limit exceeded (10 requests/hour)
  - `500 Internal Server Error`: AI service error
  - `503 Service Unavailable`: AI generation timeout

### Supporting Endpoint: Get User Preferences
- **Method**: `GET`
- **Path**: `/api/users/me/preferences`
- **Request Type**: None
- **Response Type**: `UserPreferencesDto`
- **Purpose**: Pre-fill form fields with user's saved preferences

### Supporting Endpoint: Get Plans (for count)
- **Method**: `GET`
- **Path**: `/api/plans?limit=1`
- **Request Type**: None
- **Response Type**: `PaginatedPlansDto`
- **Purpose**: Extract `pagination.total` to determine current plan count

### React Query Integration

**Custom Hook: useUserPreferences()**
```typescript
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json() as Promise<UserPreferencesDto>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

**Custom Hook: useCreatePlan()**
```typescript
export function useCreatePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePlanDto) => {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json() as ErrorDto;
        throw new Error(error.error.message);
      }
      
      return response.json() as Promise<PlanDto>;
    },
    onSuccess: (newPlan) => {
      // Invalidate plans list to refetch with new plan
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      
      // Optionally set new plan in cache
      queryClient.setQueryData(['plan', newPlan.id], newPlan);
    },
    retry: false, // Don't retry plan creation (expensive AI operation)
    networkMode: "always", // Fail immediately if offline
  });
}
```

## 8. User Interactions

### 1. Page Load
- **Action**: User navigates to `/plans/new` from dashboard
- **Expected Outcome**: 
  - Page loads with skeleton form
  - Preferences fetched and form pre-filled
  - Plan count fetched to determine limit status
  - If plan limit reached, show `PlanLimitAlert` and disable form

### 2. Form Field Editing
- **Action**: User types or selects values in any form field
- **Expected Outcome**:
  - Field value updates in real-time
  - Character counters update (for textarea)
  - Date range helper text updates with trip duration
  - Validation runs on blur, errors shown if invalid
  - Submit button enabled when form becomes valid

### 3. Date Selection
- **Action**: User clicks date picker and selects start/end dates
- **Expected Outcome**:
  - Calendar popover opens
  - User can navigate months and select date
  - Selected date populates field
  - Cross-validation runs (end >= start, range <= 30 days)
  - Trip duration helper text updates
  - Errors shown immediately if constraints violated

### 4. Form Submission
- **Action**: User clicks "Generate Plan" button
- **Expected Outcome**:
  - Final validation runs on all fields
  - If invalid, scroll to first error and show messages
  - If valid and plan limit not reached:
    - `LoadingOverlay` appears with spinner
    - Form disabled to prevent double submission
    - API request sent to `POST /api/plans`
    - User waits 10-30 seconds for AI generation

### 5. Successful Plan Creation
- **Action**: API responds with 201 Created and `PlanDto`
- **Expected Outcome**:
  - `LoadingOverlay` disappears
  - Success toast notification shown: "Plan created successfully!"
  - User navigated to `/plans/[newPlanId]` (plan detail page) OR back to dashboard with new plan visible
  - Plan list cache invalidated and refetched

### 6. Plan Creation Error - Validation
- **Action**: API responds with 400 Bad Request
- **Expected Outcome**:
  - `LoadingOverlay` disappears
  - Error toast shown with specific validation message
  - Form re-enabled for corrections
  - Specific field errors highlighted if available in API response

### 7. Plan Creation Error - Plan Limit
- **Action**: API responds with 403 Forbidden (plan limit reached)
- **Expected Outcome**:
  - `LoadingOverlay` disappears
  - `PlanLimitAlert` shown at top of page
  - Error toast: "Plan limit reached. Delete an existing plan first."
  - Submit button disabled
  - Form remains filled (user can copy note text if needed)

### 8. Plan Creation Error - Rate Limit
- **Action**: API responds with 429 Too Many Requests
- **Expected Outcome**:
  - `LoadingOverlay` disappears
  - Error toast: "Too many requests. Please try again in a few minutes."
  - Form re-enabled
  - User can edit and try again later

### 9. Plan Creation Error - AI Service
- **Action**: API responds with 500 or 503 (AI service error or timeout)
- **Expected Outcome**:
  - `LoadingOverlay` disappears
  - Error toast: "Failed to generate plan. Please try again." (500) or "Plan generation timed out. Please try again." (503)
  - Form re-enabled with preserved data
  - User can retry immediately

### 10. Cancel Action
- **Action**: User clicks "Cancel" button
- **Expected Outcome**:
  - If form is dirty (has unsaved changes), show confirmation dialog: "Discard changes?"
  - If user confirms or form is clean, navigate back to dashboard ("/")
  - Form data not saved

### 11. Network Offline
- **Action**: User submits form while offline
- **Expected Outcome**:
  - `LoadingOverlay` appears briefly
  - Network error caught immediately (networkMode: "always")
  - Error toast: "No internet connection. Please check your network."
  - Form re-enabled for retry when online

## 9. Conditions and Validation

### Client-Side Validation (Zod Schema)

All validations are defined in a Zod schema that mirrors the API validation:

```typescript
export const createPlanFormSchema = z.object({
  destination_text: z.string()
    .min(1, "Destination is required")
    .max(160, "Destination must be 160 characters or less"),
  
  date_start: z.string()
    .refine((date) => {
      const startDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return startDate >= today;
    }, {
      message: "Start date cannot be in the past"
    }),
  
  date_end: z.string(),
  
  note_text: z.string()
    .max(20000, "Note must be 20,000 characters or less"),
  
  people_count: z.number()
    .int("Must be a whole number")
    .min(1, "At least 1 person required")
    .max(20, "Maximum 20 people allowed"),
  
  trip_type: z.enum(["leisure", "business"], {
    errorMap: () => ({ message: "Please select a trip type" })
  }),
  
  comfort: z.enum(["relax", "balanced", "intense"], {
    errorMap: () => ({ message: "Please select a comfort level" })
  }),
  
  budget: z.enum(["budget", "moderate", "luxury"], {
    errorMap: () => ({ message: "Please select a budget level" })
  }),
  
  transport_modes: z.array(z.enum(["car", "walk", "public"]))
    .nullable()
    .optional(),
    
}).refine((data) => {
  const startDate = new Date(data.date_start);
  const endDate = new Date(data.date_end);
  return endDate >= startDate;
}, {
  message: "End date must be equal to or after start date",
  path: ["date_end"],
}).refine((data) => {
  const startDate = new Date(data.date_start);
  const endDate = new Date(data.date_end);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff <= 30;
}, {
  message: "Trip duration cannot exceed 30 days",
  path: ["date_end"],
});
```

### Field-Level Validation Rules

**destination_text:**
- **Required**: Yes
- **Min Length**: 1 character
- **Max Length**: 160 characters
- **Validation Trigger**: On blur, on submit
- **Error Display**: Below input field, red text
- **Component Affected**: `DestinationSection`

**date_start:**
- **Required**: Yes
- **Format**: ISO date string (YYYY-MM-DD)
- **Constraint**: Cannot be in the past (compared to today at midnight)
- **Validation Trigger**: On change, on blur, on submit
- **Error Display**: Below date picker, red text
- **Component Affected**: `DateRangeSection`

**date_end:**
- **Required**: Yes
- **Format**: ISO date string (YYYY-MM-DD)
- **Constraint 1**: Must be >= date_start
- **Constraint 2**: date_end - date_start <= 30 days
- **Validation Trigger**: On change, on blur, on submit (cross-field)
- **Error Display**: Below date picker, red text
- **Helper Display**: "Trip duration: X days (max 30)" updates dynamically
- **Component Affected**: `DateRangeSection`

**note_text:**
- **Required**: No
- **Max Length**: 20,000 characters
- **Validation Trigger**: Real-time (on every keystroke for counter), on submit for error
- **Warning Display**: Character counter turns orange at 19,000 characters
- **Error Display**: Below textarea, red text when limit exceeded
- **Component Affected**: `TravelNoteSection`

**people_count:**
- **Required**: Yes
- **Type**: Integer
- **Min**: 1
- **Max**: 20
- **Default**: From user preferences
- **Validation Trigger**: On blur, on submit
- **Error Display**: Below input field, red text
- **Component Affected**: `PreferencesSection`

**trip_type:**
- **Required**: Yes
- **Valid Values**: "leisure" | "business"
- **Default**: From user preferences
- **Validation Trigger**: On change (auto-valid if selected), on submit
- **Error Display**: Below radio group, red text
- **Component Affected**: `PreferencesSection`

**comfort:**
- **Required**: Yes
- **Valid Values**: "relax" | "balanced" | "intense"
- **Default**: From user preferences
- **Validation Trigger**: On change (auto-valid if selected), on submit
- **Error Display**: Below radio group, red text
- **Component Affected**: `PreferencesSection`

**budget:**
- **Required**: Yes
- **Valid Values**: "budget" | "moderate" | "luxury"
- **Default**: From user preferences
- **Validation Trigger**: On change (auto-valid if selected), on submit
- **Error Display**: Below radio group, red text
- **Component Affected**: `PreferencesSection`

**transport_modes:**
- **Required**: No (nullable)
- **Valid Values**: Array of "car" | "walk" | "public", or null/empty array
- **Default**: null (let AI decide)
- **Validation Trigger**: On change, on submit
- **Error Display**: Below checkbox group (if any), red text
- **Component Affected**: `TransportSection`

### Business Logic Conditions

**Plan Limit Check:**
- **Condition**: `planCount >= 10`
- **Affected Components**: 
  - `CreatePlanView`: Shows `PlanLimitAlert`
  - `CreatePlanForm`: Submit button disabled
- **Enforcement**: Pre-submission check before API call, API also validates
- **Error Handling**: Show alert banner, prevent form submission, show link to dashboard

**Rate Limit Check:**
- **Condition**: More than 10 plan creation requests in 1 hour
- **Affected Components**: `CreatePlanForm`
- **Enforcement**: API-side only (no client-side tracking)
- **Error Handling**: 429 response shows error toast with retry message

**Form Valid Check:**
- **Condition**: All fields pass Zod validation
- **Affected Components**: `FormActions` submit button
- **Enforcement**: react-hook-form tracks validity
- **UI Effect**: Submit button disabled when form invalid

**Loading State Check:**
- **Condition**: `isCreatingPlan === true`
- **Affected Components**: 
  - `LoadingOverlay`: Visible
  - `CreatePlanForm`: All inputs disabled
  - `FormActions`: Buttons disabled
- **Enforcement**: Mutation loading state from React Query
- **UI Effect**: Full-screen overlay blocks interaction

## 10. Error Handling

### Client-Side Errors

**Validation Errors (before API call):**
- **Trigger**: Form submission with invalid data
- **Handling**:
  - Prevent API call
  - Display inline error messages under invalid fields
  - Scroll to first error field
  - Keep form editable for corrections
- **User Recovery**: User corrects invalid fields and resubmits

**Network Errors (no internet):**
- **Trigger**: Fetch call fails with network error
- **Handling**:
  - Catch error in mutation's onError
  - Show error toast: "No internet connection. Please check your network."
  - Re-enable form immediately
  - Log error to console
- **User Recovery**: User checks connection and retries

**Preferences Fetch Failure:**
- **Trigger**: GET /api/users/me/preferences fails
- **Handling**:
  - Show toast warning: "Could not load preferences. Using defaults."
  - Pre-fill form with hardcoded default values:
    - people_count: 2
    - trip_type: "leisure"
    - comfort: "balanced"
    - budget: "moderate"
  - Allow user to proceed with manual input
- **User Recovery**: User manually fills/edits fields and proceeds

**Plan Count Fetch Failure:**
- **Trigger**: GET /api/plans fails
- **Handling**:
  - Assume plan count is below limit (optimistic)
  - Allow form submission
  - API will enforce limit and return 403 if needed
  - Log warning to console
- **User Recovery**: Automatic, user proceeds normally

### API Errors

**400 Bad Request (Validation Error):**
- **Trigger**: API rejects request due to validation failure
- **Handling**:
  - Parse ErrorDto response
  - Show error toast with message from API
  - If field details available, highlight specific fields
  - Re-enable form for corrections
- **User Recovery**: User corrects fields based on error message and resubmits

**403 Forbidden (Plan Limit Reached):**
- **Trigger**: User has 10 plans, API rejects creation
- **Handling**:
  - Hide loading overlay
  - Show `PlanLimitAlert` banner
  - Show error toast: "Plan limit reached. Delete an existing plan first."
  - Disable submit button
  - Keep form filled (allow user to copy note text)
- **User Recovery**: User navigates to dashboard, deletes a plan, returns to create new plan

**429 Too Many Requests (Rate Limit):**
- **Trigger**: User exceeded 10 requests/hour
- **Handling**:
  - Hide loading overlay
  - Show error toast: "Too many requests. Please try again in 1 hour."
  - Re-enable form
  - Log rate limit hit for analytics
- **User Recovery**: User waits for rate limit window to reset and retries

**500 Internal Server Error (AI Service Error):**
- **Trigger**: AI service communication failure or unexpected backend error
- **Handling**:
  - Hide loading overlay
  - Show error toast: "Failed to generate plan. Please try again."
  - Re-enable form with preserved data
  - Log error details to console
  - Optionally: Track error in analytics
- **User Recovery**: User retries immediately or adjusts inputs and retries

**503 Service Unavailable (AI Timeout):**
- **Trigger**: AI generation takes longer than 30-60 second timeout
- **Handling**:
  - Hide loading overlay
  - Show error toast: "Plan generation timed out. Please try a simpler note or fewer days."
  - Re-enable form with preserved data
  - Suggest shorter trips or simpler notes
- **User Recovery**: User reduces trip length, simplifies note, and retries

### Error Display Patterns

**Inline Field Errors:**
- **Display**: Red text below invalid input field
- **Icon**: Small error icon next to field label
- **Example**: "Start date cannot be in the past"

**Toast Notifications:**
- **Display**: Top-right corner toast (using Sonner library)
- **Duration**: 5 seconds (auto-dismiss), user can dismiss manually
- **Variants**:
  - Error: Red background, X icon
  - Warning: Orange background, warning icon
  - Success: Green background, checkmark icon

**Alert Banners:**
- **Display**: Full-width banner at top of form
- **Persistent**: Stays visible until condition resolved
- **Example**: `PlanLimitAlert` for plan limit reached

**Error Logging:**
- All errors logged to console with context:
  - Error type
  - User action attempted
  - Form data (sanitized)
  - API response (if applicable)

## 11. Implementation Steps

### Step 1: Create Page Route and Layout
**File**: `src/pages/plans/new.astro`
- Create Astro page at the correct route path
- Import and use `MainLayout` from `src/layouts/Layout.astro`
- Add authentication check in frontmatter (redirect to `/login` if not authenticated)
- Add `<CreatePlanView client:load />` component
- Pass necessary props from Astro context (e.g., user session)

### Step 2: Define Types and Interfaces
**File**: `src/types.ts` (if not already present) and `src/components/create-plan/types.ts`
- Verify `CreatePlanDto` exists in `src/types.ts`
- Create `CreatePlanFormData` interface (matches `CreatePlanDto`)
- Create `CreatePlanViewModel` interface for view state
- Export all types for component use

### Step 3: Create Zod Validation Schema
**File**: `src/components/create-plan/validation.ts`
- Define `createPlanFormSchema` using Zod
- Include all field validations matching API requirements
- Add cross-field validations (date range, date comparison)
- Export schema for use in react-hook-form

### Step 4: Create Custom React Query Hooks
**File**: `src/components/create-plan/hooks/useCreatePlanMutations.ts`
- Implement `useUserPreferences()` query hook
  - Query key: `['user', 'preferences']`
  - Fetch from `GET /api/users/me/preferences`
  - Configure staleTime and cacheTime
- Implement `useCreatePlan()` mutation hook
  - Mutation function: `POST /api/plans`
  - Handle success: invalidate plans cache, navigate
  - Handle error: parse ErrorDto, show toast
  - Configure retry: false, networkMode: "always"

### Step 5: Create Main View Component
**File**: `src/components/create-plan/CreatePlanView.tsx`
- Create React component with client-side rendering
- Fetch user preferences and plan count on mount
- Manage loading states for both fetches
- Calculate `canCreatePlan` derived state
- Render `PageHeader`, `PlanLimitAlert`, `CreatePlanForm`, and `LoadingOverlay`
- Pass appropriate props to child components

### Step 6: Create PageHeader Component
**File**: `src/components/create-plan/PageHeader.tsx`
- Implement breadcrumb navigation using Shadcn/ui `Breadcrumb`
- Include links: Home ("/") > My Plans ("/") > New Plan (current)
- Add page heading: "Create New Travel Plan"
- Style with appropriate spacing and typography

### Step 7: Create PlanLimitAlert Component
**File**: `src/components/create-plan/PlanLimitAlert.tsx`
- Use Shadcn/ui `Alert` component with destructive variant
- Display when `isVisible` prop is true
- Include alert icon, title, description, and link button
- Link to dashboard ("/") with text "Go to My Plans"

### Step 8: Create CreatePlanForm Component
**File**: `src/components/create-plan/CreatePlanForm.tsx`
- Set up react-hook-form with Zod resolver
- Initialize form with `createPlanFormSchema`
- Accept `defaultValues` prop and call `form.reset()` when preferences load
- Wrap form in Shadcn/ui `Card` for visual grouping
- Implement `handleSubmit` to call `useCreatePlan` mutation
- Disable all fields when `isLoading` prop is true
- Render all form sections as child components

### Step 9: Create DestinationSection Component
**File**: `src/components/create-plan/DestinationSection.tsx`
- Use Shadcn/ui `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- Implement `Input` component for text entry
- Connect to form control via react-hook-form context
- Display inline error from form state
- Add helper text: "Where are you planning to travel?"

### Step 10: Create DateRangeSection Component
**File**: `src/components/create-plan/DateRangeSection.tsx`
- Use Shadcn/ui `DatePicker` components (two instances)
- Label them clearly: "Start Date" and "End Date"
- Connect to form control via react-hook-form context
- Calculate trip duration dynamically: `Math.ceil((date_end - date_start) / (1000*60*60*24)) + 1`
- Display helper text: "Trip duration: X days (max 30 days)"
- Display validation errors from form state
- Ensure date picker allows manual input and calendar selection

### Step 11: Create TravelNoteSection Component
**File**: `src/components/create-plan/TravelNoteSection.tsx`
- Use Shadcn/ui `FormField`, `FormLabel`, `Textarea`
- Set textarea with `rows={8}` for initial size
- Make textarea resizable (CSS: `resize: vertical`)
- Implement character counter: "X / 20,000"
  - Position counter in top-right or bottom-right corner
  - Turn orange when > 19,000 characters
  - Turn red when > 20,000 characters
- Connect to form control
- Display validation errors below textarea
- Add helper text: "Share your travel ideas, must-see places, or any specific requests. The AI will use this to create your itinerary."

### Step 12: Create PreferencesSection Component
**File**: `src/components/create-plan/PreferencesSection.tsx`
- Use grid layout: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Implement four sub-components or inline fields:
  - **PeopleCountInput**: Number input (1-20)
  - **TripTypeRadioGroup**: Radio buttons for "Leisure" / "Business"
  - **ComfortRadioGroup**: Radio buttons for "Relax" / "Balanced" / "Intense"
  - **BudgetRadioGroup**: Radio buttons for "Budget" / "Moderate" / "Luxury"
- Use Shadcn/ui `RadioGroup` and `RadioGroupItem` components
- Connect all to form control
- Display inline errors if validation fails
- Add section heading: "Travel Preferences"
- Add helper text: "These preferences are pre-filled from your profile but can be adjusted for this trip."

### Step 13: Create TransportSection Component
**File**: `src/components/create-plan/TransportSection.tsx`
- Use Shadcn/ui `Checkbox` components (three instances)
- Options: "Car", "Walk", "Public Transport"
- Connect to form control (array field)
- Add section heading: "Preferred Transport"
- Add helper text: "Select one or more options. AI will optimize between selected modes. Leave unselected to let AI decide."
- Display inline errors if validation fails

### Step 14: Create FormActions Component
**File**: `src/components/create-plan/FormActions.tsx`
- Use flex layout: `flex justify-end gap-3`
- Implement two buttons using Shadcn/ui `Button`:
  - **Cancel Button**: variant="outline", onClick navigates to "/"
  - **Submit Button**: variant="default", type="submit", text="Generate Plan"
- Disable both buttons when `isLoading` is true
- Disable submit button when form is invalid (`!isValid`)
- Show loading spinner on submit button when `isLoading` is true

### Step 15: Create LoadingOverlay Component
**File**: `src/components/create-plan/LoadingOverlay.tsx`
- Create fixed positioned overlay: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
- Center content using flexbox
- Use Shadcn/ui `Spinner` or custom loading animation
- Display heading: "Generating your travel plan..."
- Display subtext: "This may take 10-30 seconds. Please don't close this page."
- Add optional indeterminate progress bar
- Render only when `isVisible` prop is true
- Prevent click-through with `pointer-events-none` on content

### Step 16: Implement Form Submission Logic
**File**: `src/components/create-plan/CreatePlanForm.tsx`
- In `handleSubmit` function:
  - Validate form with Zod schema
  - Check `canCreatePlan` (plan limit)
  - Call `createPlanMutation.mutate(formData)`
  - Mutation hook handles loading state automatically
- In `CreatePlanView`:
  - Watch `createPlanMutation.isLoading` to show `LoadingOverlay`
  - Watch `createPlanMutation.isError` to show error toast
  - Watch `createPlanMutation.isSuccess` to navigate to new plan or dashboard

### Step 17: Implement Error Handling
**File**: `src/components/create-plan/hooks/useCreatePlanMutations.ts`
- In `useCreatePlan` mutation:
  - Add `onError` callback to parse ErrorDto
  - Check error status code:
    - 400: Show validation error toast with message
    - 403: Show plan limit toast and update state to show alert
    - 429: Show rate limit toast
    - 500: Show generic error toast
    - 503: Show timeout toast with suggestion
  - Re-enable form for all errors

### Step 18: Implement Success Handling
**File**: `src/components/create-plan/hooks/useCreatePlanMutations.ts`
- In `useCreatePlan` mutation:
  - Add `onSuccess` callback
  - Invalidate plans query cache: `queryClient.invalidateQueries({ queryKey: ['plans'] })`
  - Show success toast: "Plan created successfully!"
  - Navigate to plan detail page: `navigate(\`/plans/\${newPlan.id}\`)`
  - Optionally: Cache new plan data for instant loading

### Step 19: Add Toast Notifications
**File**: Ensure `<Toaster />` is in `src/layouts/Layout.astro`
- Import Sonner's `toast` function in mutation hooks
- Use `toast.error()` for error notifications
- Use `toast.success()` for success notifications
- Configure toast position, duration, and styling

### Step 20: Style Components with Tailwind
- Apply responsive layout classes (mobile-first)
- Use Shadcn/ui theme variables for consistent colors
- Ensure proper spacing between sections
- Add focus states for accessibility (keyboard navigation)
- Test on mobile, tablet, and desktop breakpoints
- Ensure form is usable on small screens (single column on mobile)

### Step 21: Add Loading States
- Implement skeleton loaders for form while preferences loading
- Show spinner or skeleton for plan count fetch
- Disable form fields during loading states
- Ensure loading overlay covers entire viewport

### Step 22: Test Form Validation
- Test all validation rules:
  - Empty destination
  - Destination > 160 chars
  - Past dates
  - End date before start date
  - Date range > 30 days
  - Note > 20,000 chars
  - People count out of range (0, 21, non-integer)
  - Missing enum selections
- Verify error messages display correctly
- Test cross-field validations

### Step 23: Test API Integration
- Test successful plan creation flow end-to-end
- Test 400 validation error handling
- Test 403 plan limit error (create 10 plans first)
- Test 429 rate limit (make 11 requests in 1 hour)
- Test 500 AI service error (mock or simulate)
- Test 503 timeout (mock or simulate)
- Test network offline scenario
- Verify all error toasts display correctly

### Step 24: Test User Experience
- Test form pre-filling from user preferences
- Test cancel button with dirty form (unsaved changes)
- Test navigation after successful creation
- Test loading overlay appearance and blocking
- Test plan limit alert display and link
- Test character counter color changes
- Test date range helper text updates
- Verify responsive layout on mobile/tablet/desktop

### Step 25: Accessibility Testing
- Test keyboard navigation through entire form
- Verify all form fields have proper labels
- Test form submission with Enter key
- Verify error messages are announced by screen readers
- Test focus management (focus first error on validation failure)
- Ensure color contrast meets WCAG AA standards
- Test with screen reader (VoiceOver on Mac, NVDA on Windows)

### Step 26: Performance Optimization
- Lazy load components if needed (not critical for MVP)
- Optimize re-renders with React.memo if necessary
- Ensure form doesn't lag on large note text input
- Profile component rendering with React DevTools
- Optimize bundle size (code splitting if needed)

### Step 27: Final Integration Testing
- Test complete flow from dashboard -> create plan -> view plan
- Test with mock AI data (development mode)
- Test with real AI data (production mode, if available)
- Test error recovery: error -> fix -> retry
- Test plan limit: reach limit -> delete plan -> create new
- Verify analytics events logged correctly (plan_generated)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Step 28: Documentation and Code Review
- Add JSDoc comments to all components
- Document prop types clearly
- Add README or comments explaining complex validation logic
- Ensure code follows project conventions (from `.github/copilot-instructions.md`)
- Request code review from team
- Address feedback and refactor as needed
