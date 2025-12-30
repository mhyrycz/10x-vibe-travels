# View Implementation Plan: User Preferences Onboarding

## 1. Overview

The User Preferences Onboarding view is a mandatory first-time flow that captures essential travel preferences from new users immediately after their first login. This view serves as a critical onboarding step (US-003) that enables the AI to generate personalized travel plans. The view presents a single-page form with six required fields and guides users through completing their profile in a straightforward, accessible manner.

The implementation uses a modern React form with Astro page routing, Zod validation, React Query for API integration, and Shadcn/ui components for a consistent, accessible user experience.

## 2. View Routing

**Path**: `/onboarding/preferences`

**Access Control**:

- Requires authenticated user (checked via middleware)
- Should be accessible only to users who haven't completed preferences
- After successful submission, redirect to `/plans/new` (first plan creation)

**Navigation Flow**:

- User registers → First login → Automatically redirected to `/onboarding/preferences`
- User completes form → Submits → Redirected to `/plans/new` with success toast
- If user already has preferences and tries to access this URL → Redirect to `/` (dashboard)

## 3. Component Structure

```
PreferencesOnboardingPage.astro (Astro page)
└── PreferencesOnboardingView.tsx (React island, client:load)
    ├── PageHeader.tsx (Heading, description, progress indicator)
    ├── PreferencesForm.tsx (Main form component)
    │   ├── PeopleCountField.tsx (Number input with +/- buttons)
    │   ├── TripTypeField.tsx (Radio group: leisure/business)
    │   ├── AgeField.tsx (Number input)
    │   ├── CountryField.tsx (Text input with autocomplete suggestions)
    │   ├── ComfortField.tsx (Radio group: relax/balanced/intense)
    │   ├── BudgetField.tsx (Radio group: budget/moderate/luxury)
    │   └── FormActions.tsx (Submit button, skip link hidden)
    ├── LoadingOverlay.tsx (Full-screen loading during API call)
    └── ErrorAlert.tsx (Display API errors)
```

## 4. Component Details

### PreferencesOnboardingPage.astro

- **Description**: Astro page component that serves as the entry point for the onboarding view. Handles server-side authentication check and preference existence verification.
- **Main elements**:
  - Layout wrapper with `<Layout>` component
  - Server-side authentication check using `context.locals.supabase`
  - Server-side check if user already has preferences (redirect if yes)
  - Client-side React component loaded with `client:load` directive
- **Handled interactions**: None (static page wrapper)
- **Handled validation**: Server-side authentication and preference existence check
- **Types**: Uses `SupabaseClient` from context
- **Props**: None (page component)

### PreferencesOnboardingView.tsx

- **Description**: Main React orchestrator component that manages the onboarding flow state, coordinates child components, and handles the overall user experience including loading states, error handling, and navigation.
- **Main elements**:
  - `<PageHeader />` for title and description
  - `<PreferencesForm />` for the main form
  - `<LoadingOverlay />` conditionally rendered during submission
  - `<ErrorAlert />` conditionally rendered for API errors
  - React Query `QueryClientProvider` wrapper
- **Handled interactions**:
  - Form submission success: Navigate to `/plans/new`, show success toast, log `preferences_completed` event
  - Form submission error: Display error alert, keep form data
- **Handled validation**: None (delegated to form component)
- **Types**:
  - `CreateUserPreferencesDto` (form data type)
  - `UserPreferencesDto` (response type)
  - `ErrorDto` (error response type)
- **Props**: None (top-level view component)

### PageHeader.tsx

- **Description**: Displays the onboarding header with welcoming message, step indicator, and instructions. Provides context about why preferences are needed.
- **Main elements**:
  - `<h1>` with main heading: "Welcome to VibeTravels!"
  - `<p>` with description: "Complete your travel preferences to get started with personalized plans"
  - Progress indicator: "Step 1 of 1" or simple visual indicator
  - Optional: Icon or illustration
- **Handled interactions**: None (static display)
- **Handled validation**: None
- **Types**: None
- **Props**: None

### PreferencesForm.tsx

- **Description**: Main form component using react-hook-form and Zod validation. Orchestrates all form fields, manages form state, handles validation errors, and coordinates submission with the API mutation hook.
- **Main elements**:
  - `<Form>` wrapper from Shadcn/ui
  - Six form field sections (one per preference)
  - `<FormActions />` at the bottom
  - Accessible form structure with proper labels and ARIA attributes
- **Handled interactions**:
  - Field value changes: Update form state, clear field errors
  - Form submission: Validate all fields, call mutation, handle success/error
  - Form reset: Clear all fields and errors
- **Handled validation**:
  - `people_count`: Integer between 1 and 20 (required)
  - `trip_type`: Must be 'leisure' or 'business' (required)
  - `age`: Integer between 13 and 120 (required)
  - `country`: String, 2-120 characters (required)
  - `comfort`: Must be 'relax', 'balanced', or 'intense' (required)
  - `budget`: Must be 'budget', 'moderate', or 'luxury' (required)
  - All fields are required (no empty values allowed)
- **Types**:
  - `CreateUserPreferencesDto` (form data)
  - `PreferencesFormSchema` (Zod schema)
- **Props**:
  - `onSubmitSuccess: (data: UserPreferencesDto) => void` - Callback on successful submission
  - `onSubmitError: (error: ErrorDto) => void` - Callback on submission error

### PeopleCountField.tsx

- **Description**: Number input field with increment/decrement buttons for selecting the number of travelers. Provides an intuitive interface for adjusting the count without manual typing.
- **Main elements**:
  - `<FormField>` wrapper from react-hook-form
  - `<FormLabel>`: "Number of travelers"
  - `<div>` with horizontal layout:
    - `<Button variant="outline">` with minus icon (decrement)
    - `<Input type="number">` displaying current value
    - `<Button variant="outline">` with plus icon (increment)
  - `<FormDescription>`: "How many people will be traveling? (1-20)"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Minus button click: Decrease value by 1 (min: 1)
  - Plus button click: Increase value by 1 (max: 20)
  - Direct input: Parse and validate number
  - Keyboard arrows: Adjust value
- **Handled validation**:
  - Must be integer between 1 and 20
  - Cannot be empty
  - Display error: "Number of travelers must be between 1 and 20"
- **Types**: `number` from form state
- **Props**: Controlled by `useFormContext()` from react-hook-form

### TripTypeField.tsx

- **Description**: Radio group for selecting the primary trip type. Uses clear visual distinction between leisure (vacation) and business travel types.
- **Main elements**:
  - `<FormField>` wrapper
  - `<FormLabel>`: "Trip type"
  - `<RadioGroup>`:
    - `<RadioGroupItem value="leisure">` with label "Leisure / Vacation"
    - `<RadioGroupItem value="business">` with label "Business"
  - `<FormDescription>`: "Select the primary purpose of your typical trips"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Radio selection: Update form value
  - Keyboard navigation: Arrow keys to switch between options
- **Handled validation**:
  - Must be either 'leisure' or 'business'
  - Cannot be empty
  - Display error: "Please select a trip type"
- **Types**: `TripTypeEnum` from types
- **Props**: Controlled by `useFormContext()`

### AgeField.tsx

- **Description**: Simple number input for user's age. Used by AI to tailor activity recommendations appropriately.
- **Main elements**:
  - `<FormField>` wrapper
  - `<FormLabel>`: "Age"
  - `<Input type="number">` with placeholder "e.g., 30"
  - `<FormDescription>`: "Your age helps us recommend age-appropriate activities (13-120)"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Number input: Update form value
  - Input blur: Validate range
- **Handled validation**:
  - Must be integer between 13 and 120
  - Cannot be empty
  - Display error: "Age must be between 13 and 120 years"
- **Types**: `number` from form state
- **Props**: Controlled by `useFormContext()`

### CountryField.tsx

- **Description**: Text input with optional autocomplete for country of origin. Helps AI understand travel context and distance considerations.
- **Main elements**:
  - `<FormField>` wrapper
  - `<FormLabel>`: "Country of origin"
  - `<Input type="text">` with placeholder "e.g., Poland"
  - Optional: Autocomplete/combobox with common country names
  - `<FormDescription>`: "Your home country (2-120 characters)"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Text input: Update form value
  - Autocomplete selection (if implemented): Fill input with selected country
- **Handled validation**:
  - Must be string with 2-120 characters
  - Cannot be empty
  - Display error: "Country must be between 2 and 120 characters"
- **Types**: `string` from form state
- **Props**: Controlled by `useFormContext()`

### ComfortField.tsx

- **Description**: Radio group for selecting travel comfort level. Provides clear descriptions of what each comfort level means in terms of activity intensity.
- **Main elements**:
  - `<FormField>` wrapper
  - `<FormLabel>`: "Travel comfort style"
  - `<RadioGroup>`:
    - `<RadioGroupItem value="relax">` with label "Relax" and description "Leisurely pace, plenty of rest"
    - `<RadioGroupItem value="balanced">` with label "Balanced" and description "Mix of activities and downtime"
    - `<RadioGroupItem value="intense">` with label "Intense" and description "Packed schedule, maximize sightseeing"
  - `<FormDescription>`: "How do you prefer to experience your travels?"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Radio selection: Update form value
  - Keyboard navigation: Arrow keys to switch
- **Handled validation**:
  - Must be 'relax', 'balanced', or 'intense'
  - Cannot be empty
  - Display error: "Please select a comfort level"
- **Types**: `ComfortLevelEnum` from types
- **Props**: Controlled by `useFormContext()`

### BudgetField.tsx

- **Description**: Radio group for selecting typical budget level. Helps AI recommend appropriately priced activities and accommodations.
- **Main elements**:
  - `<FormField>` wrapper
  - `<FormLabel>`: "Travel budget"
  - `<RadioGroup>`:
    - `<RadioGroupItem value="budget">` with label "Budget" and description "Cost-conscious, affordable options"
    - `<RadioGroupItem value="moderate">` with label "Moderate" and description "Balance of value and comfort"
    - `<RadioGroupItem value="luxury">` with label "Luxury" and description "Premium experiences, high-end options"
  - `<FormDescription>`: "Select your typical travel budget range"
  - `<FormMessage>`: Error message display
- **Handled interactions**:
  - Radio selection: Update form value
  - Keyboard navigation: Arrow keys to switch
- **Handled validation**:
  - Must be 'budget', 'moderate', or 'luxury'
  - Cannot be empty
  - Display error: "Please select a budget level"
- **Types**: `BudgetLevelEnum` from types
- **Props**: Controlled by `useFormContext()`

### FormActions.tsx

- **Description**: Form action buttons at the bottom of the form. Contains the primary submit button with loading state indication.
- **Main elements**:
  - `<div>` with horizontal layout (flex, justify between)
  - `<Button type="submit" variant="default">` with text "Complete Setup"
  - Loading state: Show spinner icon and "Saving..." text when submitting
  - Disabled state: Disable button during submission
- **Handled interactions**:
  - Submit button click: Trigger form submission
  - Disabled during loading: Prevent double submission
- **Handled validation**: None (validation handled by form component)
- **Types**: None
- **Props**:
  - `isLoading: boolean` - Whether the form is currently submitting
  - `disabled?: boolean` - Additional disabled state (e.g., no changes made)

### LoadingOverlay.tsx

- **Description**: Full-screen overlay with loading spinner displayed during API submission. Prevents user interaction while preferences are being saved and provides clear feedback.
- **Main elements**:
  - `<div>` with fixed positioning, full viewport coverage, backdrop blur
  - `<Card>` centered in viewport
  - `<Loader2>` spinning icon from lucide-react
  - `<p>`: "Saving your preferences..."
  - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- **Handled interactions**: None (blocks all interactions)
- **Handled validation**: None
- **Types**: None
- **Props**:
  - `isVisible: boolean` - Whether to show the overlay

### ErrorAlert.tsx

- **Description**: Alert component for displaying API errors in a user-friendly format. Provides clear error messages with retry options.
- **Main elements**:
  - `<Alert variant="destructive">` from Shadcn/ui
  - `<AlertCircle>` icon
  - `<AlertTitle>`: "Error saving preferences"
  - `<AlertDescription>`: Error message from API or generic fallback
  - Optional: Retry button or close button
- **Handled interactions**:
  - Close button: Dismiss error alert
  - Retry button (optional): Trigger form resubmission
- **Handled validation**: None
- **Types**: `ErrorDto` from types
- **Props**:
  - `error: ErrorDto | null` - Error object to display
  - `onDismiss?: () => void` - Callback to dismiss the error

## 5. Types

### Existing Types (from types.ts)

```typescript
// Request DTO for creating user preferences
export type CreateUserPreferencesDto = Pick<
  TablesInsert<"user_preferences">,
  "people_count" | "trip_type" | "age" | "country" | "comfort" | "budget"
>;

// Response DTO after successful creation
export type UserPreferencesDto = UserPreferences;

// Enum types for form fields
export type TripTypeEnum = Enums<"trip_type_enum">; // 'leisure' | 'business'
export type ComfortLevelEnum = Enums<"comfort_level_enum">; // 'relax' | 'balanced' | 'intense'
export type BudgetLevelEnum = Enums<"budget_level_enum">; // 'budget' | 'moderate' | 'luxury'

// Error response structure
export interface ErrorDto {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetailsDto;
  };
}
```

### New Types Required

```typescript
/**
 * Zod schema for client-side form validation
 * Mirrors CreateUserPreferencesDto structure with runtime validation
 */
export const preferencesFormSchema = z.object({
  people_count: z
    .number()
    .int("Number of travelers must be a whole number")
    .min(1, "At least 1 traveler is required")
    .max(20, "Maximum 20 travelers allowed"),
  trip_type: z.enum(["leisure", "business"], {
    required_error: "Please select a trip type",
  }),
  age: z
    .number()
    .int("Age must be a whole number")
    .min(13, "Minimum age is 13 years")
    .max(120, "Maximum age is 120 years"),
  country: z
    .string()
    .min(2, "Country name must be at least 2 characters")
    .max(120, "Country name must not exceed 120 characters"),
  comfort: z.enum(["relax", "balanced", "intense"], {
    required_error: "Please select a comfort level",
  }),
  budget: z.enum(["budget", "moderate", "luxury"], {
    required_error: "Please select a budget level",
  }),
});

/**
 * TypeScript type inferred from Zod schema
 * Used for form state typing in react-hook-form
 */
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

/**
 * Props for the main view component
 */
export interface PreferencesOnboardingViewProps {
  // Optional: initial values if user partially completed form
  initialValues?: Partial<PreferencesFormValues>;
}

/**
 * Props for form submission callbacks
 */
export interface PreferencesFormProps {
  onSubmitSuccess: (data: UserPreferencesDto) => void;
  onSubmitError: (error: ErrorDto) => void;
}
```

## 6. State Management

### Form State Management (react-hook-form)

The form state is managed using `react-hook-form` with `zodResolver` for validation:

```typescript
const form = useForm<PreferencesFormValues>({
  resolver: zodResolver(preferencesFormSchema),
  defaultValues: {
    people_count: 2, // Sensible default
    trip_type: undefined, // Force user selection
    age: undefined, // Force user input
    country: "", // Empty default
    comfort: undefined, // Force user selection
    budget: undefined, // Force user selection
  },
  mode: "onBlur", // Validate on blur for better UX
});
```

**Key Features**:

- **Field-level validation**: Validates individual fields on blur
- **Form-level validation**: Validates all fields on submit
- **Error display**: Automatically populates `<FormMessage>` components with error text
- **Dirty state tracking**: Tracks which fields have been modified
- **Reset capability**: Can reset form to default values

### API State Management (React Query)

Create a custom hook `useCreateUserPreferences` for the API mutation:

```typescript
/**
 * Custom hook for creating user preferences
 * Handles API call, loading state, and error handling
 * Located in: src/components/onboarding/hooks/useCreateUserPreferences.ts
 */
export function useCreateUserPreferences() {
  const navigate = useNavigate();

  return useMutation<UserPreferencesDto, ErrorDto, CreateUserPreferencesDto>({
    mutationFn: async (data: CreateUserPreferencesDto) => {
      const response = await fetch("/api/users/me/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Show success toast
      toast.success("Preferences saved successfully!");

      // Navigate to create first plan
      navigate("/plans/new");
    },
    onError: (error) => {
      // Error handled in component via error state
      console.error("Failed to create preferences:", error);
    },
  });
}
```

**State Variables**:

- `isLoading`: Boolean indicating if mutation is in progress
- `isSuccess`: Boolean indicating successful completion
- `isError`: Boolean indicating error state
- `error`: Error object if mutation failed
- `data`: Response data if mutation succeeded

### Component State

Minimal local state in `PreferencesOnboardingView`:

```typescript
const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
const [apiError, setApiError] = useState<ErrorDto | null>(null);
```

## 7. API Integration

### Endpoint Details

**Endpoint**: `POST /api/users/me/preferences`

**Request**:

```typescript
// Headers
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>" // Automatically handled by Supabase client
}

// Body Type: CreateUserPreferencesDto
{
  "people_count": 2,
  "trip_type": "leisure",
  "age": 30,
  "country": "Poland",
  "comfort": "balanced",
  "budget": "moderate"
}
```

**Success Response** (201 Created):

```typescript
// Response Type: UserPreferencesDto
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

**Error Responses**:

```typescript
// 400 Bad Request - Validation Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid field values",
    "details": {
      "field": "people_count",
      "constraint": "must be between 1 and 20"
    }
  }
}

// 401 Unauthorized - Not authenticated
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 409 Conflict - Preferences already exist
{
  "error": {
    "code": "CONFLICT",
    "message": "User preferences already exist. Use PATCH to update."
  }
}

// 500 Internal Server Error - Server error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create user preferences"
  }
}
```

### Integration Implementation

The API integration is handled through the `useCreateUserPreferences` hook:

1. **Form Submission**: User fills form and clicks "Complete Setup"
2. **Client Validation**: Zod schema validates all fields
3. **API Call**: If valid, mutation hook sends POST request to `/api/users/me/preferences`
4. **Loading State**: `LoadingOverlay` displays while waiting for response
5. **Success Handling**:
   - Store preferences in UserPreferencesContext
   - Show success toast
   - Log `preferences_completed` event (handled by backend)
   - Navigate to `/plans/new`
6. **Error Handling**:
   - Display `ErrorAlert` with error message
   - Keep form data so user can retry
   - Specific handling for 409 (redirect to dashboard if preferences exist)

## 8. User Interactions

### Primary User Flow

1. **Page Load**:
   - User lands on `/onboarding/preferences`
   - Page displays header with welcome message
   - Form loads with default values (people_count: 2, others empty/unselected)
   - Focus automatically moves to first required field (people_count)

2. **Form Filling**:
   - User adjusts people count using +/- buttons or direct input
   - User selects trip type (leisure/business) via radio buttons
   - User enters age in number field
   - User types country name (with optional autocomplete)
   - User selects comfort level via radio buttons with descriptions
   - User selects budget level via radio buttons with descriptions

3. **Field Validation**:
   - On blur: Field validates individually, shows inline error if invalid
   - User corrects invalid field → Error message disappears
   - Visual indicators: Red border on invalid fields, checkmark on valid fields (optional)

4. **Form Submission**:
   - User clicks "Complete Setup" button
   - All fields validate simultaneously
   - If invalid: Form scrolls to first error, displays all error messages
   - If valid: Loading overlay appears, form data sent to API

5. **Success Scenario**:
   - API returns 201 Created
   - Loading overlay shows brief success message (optional)
   - Success toast appears: "Preferences saved successfully!"
   - User automatically navigated to `/plans/new`
   - Preferences available in UserPreferencesContext for plan creation

6. **Error Scenarios**:
   - **Validation Error (400)**: Display specific field error, keep form data
   - **Conflict (409)**: Redirect to dashboard with info message
   - **Network Error**: Show retry option, keep form data
   - **Server Error (500)**: Show generic error, offer retry button

### Keyboard Navigation

- **Tab Order**:
  1. People count minus button
  2. People count input
  3. People count plus button
  4. Trip type radio group (arrow keys to navigate)
  5. Age input
  6. Country input
  7. Comfort radio group (arrow keys to navigate)
  8. Budget radio group (arrow keys to navigate)
  9. Submit button

- **Keyboard Shortcuts**:
  - `Enter`: Submit form (when focus on submit button)
  - `Escape`: Close error alert (if visible)
  - Arrow keys: Navigate radio group options
  - `+/-` keys: Increment/decrement number inputs (when focused)

### Accessibility Considerations

- **Screen Reader Support**:
  - All form fields have associated labels
  - Radio groups have descriptive group labels
  - Error messages announced via ARIA live regions
  - Loading overlay has `role="dialog"` with descriptive text

- **Visual Indicators**:
  - Clear focus indicators on all interactive elements
  - Error states with red borders and error icons
  - Required field indicators (asterisk or "required" text)
  - High contrast color scheme for readability

## 9. Conditions and Validation

### Client-Side Validation (Zod Schema)

All validations are defined in `preferencesFormSchema` and enforced before API call:

| Field          | Validation Rules                                                           | Error Messages                                                                                                            |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `people_count` | - Type: number (integer)<br>- Min: 1<br>- Max: 20<br>- Required            | - "Number of travelers must be a whole number"<br>- "At least 1 traveler is required"<br>- "Maximum 20 travelers allowed" |
| `trip_type`    | - Type: enum<br>- Values: 'leisure' \| 'business'<br>- Required            | - "Please select a trip type"                                                                                             |
| `age`          | - Type: number (integer)<br>- Min: 13<br>- Max: 120<br>- Required          | - "Age must be a whole number"<br>- "Minimum age is 13 years"<br>- "Maximum age is 120 years"                             |
| `country`      | - Type: string<br>- Min length: 2<br>- Max length: 120<br>- Required       | - "Country name must be at least 2 characters"<br>- "Country name must not exceed 120 characters"                         |
| `comfort`      | - Type: enum<br>- Values: 'relax' \| 'balanced' \| 'intense'<br>- Required | - "Please select a comfort level"                                                                                         |
| `budget`       | - Type: enum<br>- Values: 'budget' \| 'moderate' \| 'luxury'<br>- Required | - "Please select a budget level"                                                                                          |

### Server-Side Validation (API Endpoint)

The API endpoint validates the same rules using Zod schema in `userPreferences.service.ts`:

```typescript
export const createUserPreferencesSchema = z.object({
  people_count: z.number().int().min(1).max(20),
  trip_type: z.enum(["leisure", "business"]),
  age: z.number().int().min(13).max(120),
  country: z.string().min(2).max(120),
  comfort: z.enum(["relax", "balanced", "intense"]),
  budget: z.enum(["budget", "moderate", "luxury"]),
});
```

**Backend-Specific Validations**:

- **User Authentication**: Verified via JWT token in request
- **Duplicate Check**: Ensures user doesn't already have preferences (409 Conflict)
- **Event Logging**: Automatically logs `preferences_completed` event on success

### UI State Conditions

| Condition                     | Component State                    | UI Effect                                       |
| ----------------------------- | ---------------------------------- | ----------------------------------------------- |
| Form is pristine (no changes) | `form.formState.isDirty === false` | Submit button possibly disabled (optional)      |
| Field has error               | `form.formState.errors[fieldName]` | Red border, error message below field           |
| Form is submitting            | `isLoading === true`               | Loading overlay visible, submit button disabled |
| API returned error            | `apiError !== null`                | Error alert displayed at top of form            |
| User already has preferences  | Detected on page load              | Redirect to dashboard                           |
| User not authenticated        | Detected in middleware             | Redirect to login page                          |

## 10. Error Handling

### Client-Side Errors

**Validation Errors** (before API call):

- **Trigger**: User submits form with invalid/missing fields
- **Handling**:
  - Display inline error messages below each invalid field
  - Focus first invalid field
  - Prevent API call until all fields valid
- **User Recovery**: User corrects fields, errors disappear on valid input

**Network Errors**:

- **Trigger**: Network request fails (timeout, offline, DNS failure)
- **Handling**:
  - Hide loading overlay
  - Display error alert: "Network error. Please check your connection and try again."
  - Show retry button
- **User Recovery**: User clicks retry or fixes network issue and resubmits

### Server-Side Errors

**400 Validation Error**:

- **Scenario**: Client validation missed something, server rejects invalid data
- **Handling**:
  - Parse error details from response
  - Display specific field error if `details.field` provided
  - Otherwise show general error alert with message
- **User Recovery**: User corrects the specific field and resubmits

**401 Unauthorized**:

- **Scenario**: User's session expired during onboarding
- **Handling**:
  - Display error: "Your session has expired. Please log in again."
  - After 2 seconds, redirect to `/login`
- **User Recovery**: User logs in again, redirected back to onboarding

**409 Conflict**:

- **Scenario**: User already has preferences (edge case: duplicate tab, race condition)
- **Handling**:
  - Display info message: "You've already completed onboarding."
  - Redirect to dashboard `/`
- **User Recovery**: User proceeds to dashboard, can edit preferences from profile

**500 Internal Server Error**:

- **Scenario**: Server-side error during database insert or event logging
- **Handling**:
  - Display error: "Something went wrong. Please try again."
  - Log error to console for debugging
  - Show retry button
- **User Recovery**: User retries submission, or contacts support if persists

### Error Display Components

**ErrorAlert Component**:

```typescript
// Displays at top of form, dismissible
<ErrorAlert
  error={apiError}
  onDismiss={() => setApiError(null)}
/>
```

**Inline Field Errors**:

```typescript
// Automatically rendered by FormMessage from react-hook-form
<FormMessage />
// Displays error text from Zod validation
```

### Error Logging

All errors should be logged for debugging:

```typescript
console.error("Preferences creation failed:", {
  code: error.error.code,
  message: error.error.message,
  details: error.error.details,
  timestamp: new Date().toISOString(),
  userId: user?.id,
});
```

## 11. Implementation Steps

### Phase 1: Setup and Routing (Steps 1-3)

**Step 1: Create Astro Page Route**

- Create file: `src/pages/onboarding/preferences.astro`
- Add Layout wrapper
- Implement server-side authentication check using `context.locals.supabase`
- Add server-side check for existing preferences (redirect to `/` if found)
- Add client:load directive for React component

**Step 2: Define Types and Schemas**

- Create file: `src/components/onboarding/validation.ts`
- Define `preferencesFormSchema` using Zod (matching API validation exactly)
- Export `PreferencesFormValues` type inferred from schema
- Define prop types for view and form components

**Step 3: Create React Query Hook**

- Create file: `src/components/onboarding/hooks/useCreateUserPreferences.ts`
- Implement `useCreateUserPreferences` mutation hook
- Configure success handler: toast, navigation, context update
- Configure error handler: log error, allow component to display

### Phase 2: View Components (Steps 4-6)

**Step 4: Implement Main View Component**

- Create file: `src/components/onboarding/PreferencesOnboardingView.tsx`
- Add QueryClientProvider wrapper
- Implement loading overlay state management
- Implement error state management
- Add success and error callbacks for form
- Add navigation logic after success

**Step 5: Create PageHeader Component**

- Create file: `src/components/onboarding/PageHeader.tsx`
- Implement heading: "Welcome to VibeTravels!"
- Add description paragraph
- Add step indicator (optional)
- Style with Tailwind for responsive layout

**Step 6: Create Supporting Components**

- Create `LoadingOverlay.tsx`: Full-screen loading indicator with spinner
- Create `ErrorAlert.tsx`: Reusable error display with dismiss action
- Add ARIA attributes for accessibility

### Phase 3: Form Structure (Steps 7-9)

**Step 7: Create Main Form Component**

- Create file: `src/components/onboarding/PreferencesForm.tsx`
- Initialize react-hook-form with zodResolver
- Set up default values for all fields
- Create form submit handler that calls mutation hook
- Add Form wrapper from Shadcn/ui
- Implement FormActions integration

**Step 8: Implement FormActions Component**

- Create file: `src/components/onboarding/FormActions.tsx`
- Add submit button with loading state
- Style with primary variant
- Add disabled state during submission
- Display loading spinner when `isLoading` is true

**Step 9: Add Basic Form Structure**

- In `PreferencesForm.tsx`, add fieldset/section structure
- Create placeholder divs for each of 6 form fields
- Verify form submission flow without actual fields

### Phase 4: Form Fields (Steps 10-15)

**Step 10: Implement PeopleCountField**

- Create file: `src/components/onboarding/PeopleCountField.tsx`
- Add FormField wrapper connected to react-hook-form
- Implement number input with +/- buttons
- Add increment/decrement click handlers (min: 1, max: 20)
- Add label, description, and error message display
- Test validation for boundary cases (0, 21, non-integer)

**Step 11: Implement TripTypeField**

- Create file: `src/components/onboarding/TripTypeField.tsx`
- Add RadioGroup from Shadcn/ui
- Add two radio options: leisure and business
- Add clear labels and descriptions
- Connect to form state with useFormContext
- Test keyboard navigation (arrow keys)

**Step 12: Implement AgeField**

- Create file: `src/components/onboarding/AgeField.tsx`
- Add number input field
- Connect to form state
- Add validation feedback (min: 13, max: 120)
- Test edge cases and error messages

**Step 13: Implement CountryField**

- Create file: `src/components/onboarding/CountryField.tsx`
- Add text input field
- Optional: Add Combobox for autocomplete (can be deferred)
- Connect to form state
- Add character length validation feedback
- Test with various country names (short and long)

**Step 14: Implement ComfortField**

- Create file: `src/components/onboarding/ComfortField.tsx`
- Add RadioGroup with 3 options: relax, balanced, intense
- Add descriptive labels for each option explaining what it means
- Connect to form state
- Test keyboard navigation and visual feedback

**Step 15: Implement BudgetField**

- Create file: `src/components/onboarding/BudgetField.tsx`
- Add RadioGroup with 3 options: budget, moderate, luxury
- Add descriptive labels for each option
- Connect to form state
- Test selection and validation

### Phase 5: Integration and Flow (Steps 16-18)

**Step 16: Connect Form to API**

- In PreferencesForm, integrate mutation hook
- Implement onSubmit handler:
  - Validate form
  - Call mutation with form data
  - Handle loading state (show overlay)
  - Handle success (call parent callback)
  - Handle error (call parent callback)
- Test with API endpoint (may need to mock initially)

**Step 17: Implement Success Flow**

- In PreferencesOnboardingView, handle success callback
- Show success toast notification
- Navigate to `/plans/new` using navigation utility
- Verify preferences are accessible in UserPreferencesContext (if implemented)
- Test event logging: verify `preferences_completed` event in database

**Step 18: Implement Error Handling**

- Handle all error scenarios:
  - Display 400 validation errors with specific messages
  - Handle 401 with redirect to login
  - Handle 409 with redirect to dashboard
  - Handle 500 with retry option
- Test each error scenario with mocked responses
- Verify error messages are clear and actionable

### Phase 6: Polish and Accessibility (Steps 19-21)

**Step 19: Styling and Responsiveness**

- Apply Tailwind CSS for consistent spacing
- Ensure mobile-first responsive design:
  - Stack fields vertically on mobile
  - Larger touch targets for buttons
  - Readable text sizes
- Test on mobile (375px), tablet (768px), and desktop (1200px) viewports
- Ensure form fits without horizontal scrolling

**Step 20: Accessibility Enhancements**

- Add aria-labels to all interactive elements
- Ensure proper tab order (test with keyboard only)
- Add focus indicators with high contrast
- Test with screen reader (VoiceOver or NVDA)
- Add skip links if necessary
- Verify color contrast meets WCAG AA standards

**Step 21: Loading States and Feedback**

- Polish loading overlay with smooth transitions
- Add skeleton loaders if fetching initial data (not applicable for this view)
- Ensure loading states don't block navigation (can user cancel?)
- Add progress indicators if multi-step (currently single page)
- Test perceived performance and user feedback

### Phase 7: Testing and Validation (Steps 22-24)

**Step 22: Form Validation Testing**

- Test all validation rules for each field:
  - Empty fields (all required)
  - Boundary values (min/max for numbers)
  - Invalid enum values
  - String length constraints
- Test form submission with various invalid combinations
- Verify error messages are displayed correctly
- Test error message dismissal on field correction

**Step 23: API Integration Testing**

- Test successful preference creation:
  - Verify 201 response
  - Verify preferences saved in database
  - Verify event logged
  - Verify navigation to `/plans/new`
- Test error scenarios:
  - 400: Mock invalid data response
  - 401: Mock expired session
  - 409: Mock existing preferences
  - 500: Mock server error
  - Network failure: Disconnect network
- Verify retry functionality works

**Step 24: User Flow Testing**

- Test complete happy path:
  1. New user registers
  2. Redirected to onboarding
  3. Fills all fields correctly
  4. Submits successfully
  5. Lands on `/plans/new` with preferences loaded
- Test edge cases:
  - User refreshes page mid-form (data persists?)
  - User navigates back (can they return?)
  - User tries to access after completing (redirected to dashboard)
- Test accessibility:
  - Complete form using only keyboard
  - Use screen reader to fill form
  - Verify all interactions are accessible

### Phase 8: Final Polish (Steps 25-26)

**Step 25: Performance Optimization**

- Minimize re-renders in form fields
- Lazy load non-critical components if needed
- Ensure form validation is debounced for expensive checks
- Test performance with React DevTools Profiler
- Optimize bundle size (check imports)

**Step 26: Documentation and Code Review**

- Add JSDoc comments to all components and hooks
- Document prop types and expected behavior
- Add inline comments for complex logic
- Create README in component directory explaining structure
- Self-review code for consistency with style guide
- Prepare for peer code review if applicable

### Phase 9: Deployment Preparation (Steps 27-28)

**Step 27: Integration with Existing App**

- Verify middleware redirects new users to onboarding
- Verify onboarding redirects users with preferences
- Test integration with auth flow (register → onboard → create plan)
- Verify UserPreferencesContext updates after onboarding
- Test onboarding appears correctly in navigation flow

**Step 28: Final Testing and Launch**

- Perform end-to-end testing on staging environment
- Test with real database and API (not mocks)
- Verify event logging works in production environment
- Test on various devices and browsers:
  - Chrome, Firefox, Safari (desktop)
  - iOS Safari, Android Chrome (mobile)
- Get stakeholder approval
- Deploy to production
- Monitor error logs and user completion rates

---

## Summary

This implementation plan provides a comprehensive guide for building the User Preferences Onboarding view for VibeTravels. The view is designed as a mandatory first-time flow that captures essential travel preferences to enable personalized AI-generated travel plans.

**Key Features**:

- Single-page form with 6 required fields
- Client-side validation with Zod
- Server-side validation and conflict checking
- React Query for API state management
- Accessible, responsive design with Shadcn/ui components
- Clear error handling and user feedback
- Automatic navigation to plan creation after completion

**Tech Stack**:

- Astro 5 for page routing
- React 19 for interactive form
- TypeScript 5 for type safety
- react-hook-form with zodResolver for form management
- TanStack Query v5 for API integration
- Shadcn/ui for UI components
- Tailwind 4 for styling

The implementation follows a phased approach with 28 detailed steps, ensuring each component is built, tested, and integrated systematically. The plan emphasizes accessibility, user experience, and error handling throughout.
