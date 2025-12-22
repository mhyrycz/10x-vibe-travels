# View Implementation Plan: Plan Details Page

## 1. Overview

The Plan Details Page is the core view for displaying a complete, generated travel itinerary. It presents a structured, day-by-day breakdown of a user's travel plan, organized into morning, afternoon, and evening blocks, with individual activities listed for each block. The page allows users to view all plan metadata (name, destination, dates, preferences, transport modes), edit plan details, modify individual activities, reorder activities via drag-and-drop, regenerate the entire plan, and delete the plan. This view implements US-009 (View Plan Details), US-010 (Edit Plan), and US-011 (Delete Plan).

The page fetches data from the `GET /api/plans/{planId}` endpoint, which returns a nested structure with full plan details including computed warnings for overloaded blocks. The view emphasizes readability, clear organization of information, and provides immediate feedback through optimistic UI updates when the user makes changes.

## 2. View Routing

**Path**: `/plans/[planId]`

- **Dynamic Route Parameter**: `planId` (string, UUID format)
- **Example**: `/plans/550e8400-e29b-41d4-a716-446655440000`
- **Astro File Location**: `/src/pages/plans/[planId].astro`
- **Access Control**: Requires authenticated user (enforced by middleware)
- **Authorization**: User must own the plan (verified by API endpoint, returns 403 if ownership check fails)

## 3. Component Structure

The Plan Details Page follows a hierarchical component structure optimized for both desktop and mobile views:

```
PlanDetailsPage (Astro wrapper with QueryClientProvider)
└── PlanDetailsView (Main React component)
    ├── PlanHeader
    │   ├── Breadcrumb (Back to "My Plans")
    │   ├── PlanTitle (editable)
    │   └── ActionButtons
    │       ├── EditPlanButton
    │       ├── RegeneratePlanButton
    │       └── DeletePlanButton
    ├── PlanMetadata
    │   ├── DestinationInfo
    │   ├── DateRangeInfo
    │   ├── PreferencesInfo
    │   └── TransportModesInfo
    ├── WarningBanner (conditional, if plan has warnings)
    ├── DaysList
    │   └── DayCard (repeated for each day)
    │       ├── DayHeader (date, day number)
    │       └── BlocksList
    │           └── BlockCard (repeated for morning, afternoon, evening)
    │               ├── BlockHeader (block type, total duration, warning)
    │               └── ActivitiesList (drag-and-drop enabled)
    │                   └── ActivityCard (repeated for each activity)
    │                       ├── DragHandle
    │                       ├── ActivityContent (title, duration, transport)
    │                       └── ActivityActions
    │                           ├── EditActivityButton
    │                           └── ActivityMenu (Move to..., Delete)
    ├── LoadingState (skeleton placeholders)
    ├── ErrorState (error message with retry)
    └── Modals (rendered conditionally)
        ├── EditPlanModal
        ├── EditActivityModal
        ├── RegeneratePlanModal
        └── DeletePlanDialog
```

**Responsive Behavior**:
- **Mobile**: Days displayed in accordion format (Shadcn `Accordion` component), one expanded at a time to save space
- **Tablet/Desktop**: Days displayed as expanded cards in a vertical list, all visible simultaneously

## 4. Component Details

### PlanDetailsPage (Astro Wrapper)

**Description**: Astro page component that serves as the entry point for the dynamic route. Wraps the React view with necessary providers.

**Main Elements**:
- `<Layout>` component (site-wide layout with header/footer)
- `QueryClientProvider` (React Query context)
- `<PlanDetailsView>` component with `client:load` directive

**Props**: None (receives `planId` from Astro params and passes to React component)

**Handled Events**: None (pure wrapper)

**Validation**: None at this level

**Types**: None specific to this component

---

### PlanDetailsView (Main React Component)

**Description**: The root interactive component that orchestrates data fetching, state management, and rendering of all child components. Uses the custom `usePlan(planId)` hook to fetch plan data and manages modal visibility states.

**Main Elements**:
- Conditional rendering based on `isLoading`, `isError`, `data` states
- `<LoadingState />` during data fetch
- `<ErrorState />` on fetch failure
- Main content wrapper `<div className="container mx-auto px-4 py-8">`
- All child components listed in structure above

**Handled Events**:
- Modal open/close triggers (via state setters passed to buttons)
- Refresh trigger after successful mutations

**Validation**: None (delegates to child components and API)

**Types**:
- **DTO**: `PlanDto` (from API response)
- **ViewModel**: `PlanDetailsViewModel` (transformed for UI consumption)
- **Hook Return**: Return type of `usePlan(planId)`

**Props**:
```typescript
interface PlanDetailsViewProps {
  planId: string;
}
```

---

### PlanHeader

**Description**: Displays the top section of the page with navigation breadcrumb, plan title, and action buttons for editing, regenerating, and deleting the plan.

**Main Elements**:
- `<Breadcrumb>` component: "My Plans" link → Current plan name
- Plan title `<h1>` (read-only display)
- Action buttons container (flex row on desktop, stacked on mobile)

**Handled Events**:
- Click "Edit Plan" → Opens `EditPlanModal`
- Click "Regenerate Plan" → Opens `RegeneratePlanModal`
- Click "Delete Plan" → Opens `DeletePlanDialog`

**Validation**: None (triggers modals which handle validation)

**Types**:
- **ViewModel**: `PlanHeaderViewModel` (subset of plan data)

**Props**:
```typescript
interface PlanHeaderProps {
  planName: string;
  planId: string;
  onEditClick: () => void;
  onRegenerateClick: () => void;
  onDeleteClick: () => void;
}
```

---

### PlanMetadata

**Description**: Displays key metadata about the plan in a clean, card-based layout. Shows destination, date range, travel preferences (people count, trip type, comfort, budget), and selected transport modes.

**Main Elements**:
- `<Card>` wrapper
- Grid layout with labeled info sections:
  - **Destination**: Icon + text (e.g., "Kraków, Poland")
  - **Dates**: Icon + formatted date range (e.g., "June 15 – June 20, 2025")
  - **Preferences**: Icons/badges for people count, trip type, comfort, budget
  - **Transport**: Icons/badges for each selected transport mode (walk, public, car)

**Handled Events**: None (read-only display)

**Validation**: None

**Types**:
- **ViewModel**: `PlanMetadataViewModel`

**Props**:
```typescript
interface PlanMetadataProps {
  destination: string;
  dateStart: string;
  dateEnd: string;
  peopleCount: number;
  tripType: TripTypeEnum;
  comfort: ComfortLevelEnum;
  budget: BudgetLevelEnum;
  transportModes: TransportModeEnum[];
}
```

---

### WarningBanner

**Description**: Conditionally rendered alert banner that appears if any block or day in the plan has warnings about being too intensive (exceeding time thresholds).

**Main Elements**:
- `<Alert variant="warning">` component (Shadcn)
- Warning icon
- Warning message (e.g., "Some blocks in your plan may be too intensive. Review the warnings below.")

**Handled Events**: None

**Validation**: None

**Types**: None specific

**Props**:
```typescript
interface WarningBannerProps {
  hasWarnings: boolean;
}
```

---

### DaysList

**Description**: Container component that renders all days in the plan. On mobile, uses `Accordion` component for collapsible days. On desktop, renders all days as expanded cards.

**Main Elements**:
- **Mobile**: `<Accordion type="single" collapsible>` with `AccordionItem` per day
- **Desktop**: Vertical stack of `<DayCard>` components

**Handled Events**: Accordion expand/collapse (mobile only)

**Validation**: None

**Types**: None specific to container

**Props**:
```typescript
interface DaysListProps {
  days: DayViewModel[];
}
```

---

### DayCard

**Description**: Represents a single day in the itinerary. Displays day number, date, and contains all blocks (morning, afternoon, evening) for that day.

**Main Elements**:
- Day header:
  - Day number (e.g., "Day 1")
  - Formatted date (e.g., "Monday, June 15, 2025")
- `<BlocksList>` component with all blocks for the day

**Handled Events**: None (passes through to child blocks)

**Validation**: None

**Types**:
- **ViewModel**: `DayViewModel`

**Props**:
```typescript
interface DayCardProps {
  day: DayViewModel;
  dayNumber: number;
}
```

---

### BlockCard

**Description**: Represents a time block within a day (morning, afternoon, or evening). Displays block type, total duration, optional warning, and list of activities. Serves as the drop zone for drag-and-drop activity reordering.

**Main Elements**:
- Block header:
  - Block type badge (e.g., "Morning", styled differently per type)
  - Total duration (e.g., "2h 15min")
  - Warning badge (conditional, if `warning` field is present)
- `<ActivitiesList>` component

**Handled Events**:
- Drop zone for dragged activities (handles `onDrop` event from dnd-kit)

**Validation**: None

**Types**:
- **ViewModel**: `BlockViewModel`

**Props**:
```typescript
interface BlockCardProps {
  block: BlockViewModel;
  blockId: string;
}
```

---

### ActivitiesList

**Description**: Drag-and-drop enabled list of activities within a block. Uses `dnd-kit` library for accessible drag-and-drop functionality. Provides visual feedback during drag operations.

**Main Elements**:
- `<SortableContext>` wrapper from dnd-kit
- List of `<ActivityCard>` components (each wrapped in `useSortable` hook)
- Empty state message if no activities in block

**Handled Events**:
- `onDragEnd`: Handles activity reordering within the same block or moving to different block
- Calls `useMoveActivity` mutation hook with new `target_block_id` and `target_order_index`

**Validation**: None (mutation handles server-side validation)

**Types**: None specific to list container

**Props**:
```typescript
interface ActivitiesListProps {
  activities: ActivityViewModel[];
  blockId: string;
}
```

---

### ActivityCard

**Description**: Displays a single activity within a block. Shows activity title, duration, transport time, and provides actions for editing/moving. Includes a drag handle for reordering.

**Main Elements**:
- Drag handle icon (visible on hover/focus)
- Activity content:
  - Title (e.g., "Visit Wawel Castle")
  - Duration icon + time (e.g., "2h")
  - Transport icon + time (conditional, only if `transport_minutes > 0`, e.g., "15min")
- Actions dropdown menu:
  - "Edit" option
  - "Move to..." submenu (lists all other blocks)

**Handled Events**:
- Click "Edit" → Opens `EditActivityModal` with activity data
- Click "Move to..." → Calls `useMoveActivity` mutation
- Drag handle interaction → Enables drag-and-drop

**Validation**: None at card level (validation in modal/API)

**Types**:
- **ViewModel**: `ActivityViewModel`

**Props**:
```typescript
interface ActivityCardProps {
  activity: ActivityViewModel;
  blockId: string;
  onEditClick: (activity: ActivityViewModel) => void;
  onMoveClick: (targetBlockId: string) => void;
}
```

---

### EditPlanModal

**Description**: Modal dialog containing a form to edit plan metadata (name, budget, note_text, people_count). Does NOT regenerate the itinerary—only updates metadata fields.

**Main Elements**:
- `<Dialog>` component (Shadcn)
- Form fields:
  - Plan name (Input, max 140 chars)
  - Budget (Select dropdown: budget, moderate, luxury)
  - People count (Number input, 1-20)
  - Note text (Textarea, max 20000 chars, optional)
- Form action buttons: "Cancel", "Save Changes"

**Handled Events**:
- Form submission → Calls `useUpdatePlan` mutation
- Validation errors → Display inline error messages
- Success → Close modal, show success toast, refetch plan data

**Validation**:
- **Plan name**: Required, 1-140 characters
- **Budget**: Required, one of: 'budget', 'moderate', 'luxury'
- **People count**: Required, integer, min 1, max 20
- **Note text**: Optional, max 20000 characters

**Types**:
- **DTO**: `UpdatePlanDto` (request body)
- **Response**: `PlanUpdatedDto`

**Props**:
```typescript
interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planData: {
    id: string;
    name: string;
    budget: BudgetLevelEnum;
    peopleCount: number;
    noteText: string | null;
  };
}
```

---

### EditActivityModal

**Description**: Modal dialog for editing an activity's title, duration, and transport time. Also allows moving the activity to a different block via a dropdown selector.

**Main Elements**:
- `<Dialog>` component
- Form fields:
  - Activity title (Input, required)
  - Duration (Number input, minutes, required)
  - Transport time (Number input, minutes, optional)
  - Move to block (Select dropdown, lists all blocks across all days)
- Form action buttons: "Cancel", "Save"

**Handled Events**:
- Form submission:
  - If only title/duration/transport changed → Calls `useUpdateActivity` mutation
  - If block changed → Calls `useMoveActivity` mutation
  - If both changed → Calls both mutations sequentially
- Success → Close modal, show toast, optimistically update UI

**Validation**:
- **Title**: Required, non-empty string
- **Duration**: Required, integer, min 1 minute
- **Transport time**: Optional, integer, min 0 minutes
- **Target block**: Optional, valid block ID from current plan

**Types**:
- **DTO**: `UpdateActivityDto` (for edit), `MoveActivityDto` (for move)
- **Response**: `ActivityUpdatedDto`

**Props**:
```typescript
interface EditActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityViewModel;
  availableBlocks: Array<{ id: string; label: string }>;
}
```

---

### RegeneratePlanModal

**Description**: Modal dialog that allows users to modify plan parameters (dates, comfort, transport modes, note text) and regenerate the entire itinerary. Warns user that current plan will be replaced.

**Main Elements**:
- `<Dialog>` component
- Warning alert: "Regenerating will replace your current itinerary. Any manual edits will be lost."
- Form fields:
  - Date range (Date picker, start and end dates)
  - Comfort (Radio group: relax, balanced, intensive)
  - Transport modes (Checkbox group: walk, public, car)
  - Note text (Textarea, optional)
- Form action buttons: "Cancel", "Regenerate Plan"

**Handled Events**:
- Form submission → Calls `useRegeneratePlan` mutation (POST to `/api/plans/{planId}/regenerate`)
- Success → Replace plan data, show success toast
- Timeout/Error → Show error message with retry option

**Validation**:
- **Date range**: Start and end dates can be modified freely (duration can change)
- **Dates**: Cannot be in the past
- **Comfort**: Required, one of: 'relax', 'balanced', 'intensive'
- **Transport modes**: At least one mode must be selected
- **Note text**: Optional, max 20000 characters

**Types**:
- **DTO**: `RegeneratePlanDto` (request body)
- **Response**: `PlanDto` (full regenerated plan)

**Props**:
```typescript
interface RegeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: {
    id: string;
    dateStart: string;
    dateEnd: string;
    comfort: ComfortLevelEnum;
    transportModes: TransportModeEnum[];
    noteText: string | null;
  };
}
```

---

### DeletePlanDialog

**Description**: Confirmation dialog for permanently deleting a plan. Requires user to type the plan name to confirm deletion (prevents accidental deletions).

**Main Elements**:
- `<AlertDialog>` component (Shadcn)
- Warning message: "This action cannot be undone. This will permanently delete your plan."
- Confirmation input: "Type the plan name to confirm"
- Action buttons: "Cancel", "Delete Plan" (destructive variant, disabled until confirmation matches)

**Handled Events**:
- Confirmation input change → Enable/disable delete button based on match
- Click "Delete Plan" → Calls `useDeletePlan` mutation (DELETE to `/api/plans/{planId}`)
- Success → Redirect to dashboard ("/"), show success toast

**Validation**:
- **Confirmation text**: Must exactly match plan name (case-sensitive)

**Types**:
- **Response**: None (204 No Content on success)

**Props**:
```typescript
interface DeletePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
}
```

---

### LoadingState

**Description**: Skeleton placeholder shown while plan data is being fetched. Provides visual feedback that content is loading.

**Main Elements**:
- `<Skeleton>` components (Shadcn) mimicking:
  - Header skeleton (breadcrumb, title, buttons)
  - Metadata card skeleton
  - Multiple day card skeletons with block placeholders

**Handled Events**: None

**Validation**: None

**Types**: None

**Props**: None

---

### ErrorState

**Description**: Error message display shown when plan fetch fails. Provides user-friendly error message and retry option.

**Main Elements**:
- `<Alert variant="destructive">` component
- Error icon
- Error title: "Failed to load plan"
- Error message (from API or generic)
- "Try Again" button

**Handled Events**:
- Click "Try Again" → Refetch plan data via React Query's `refetch` function

**Validation**: None

**Types**: None

**Props**:
```typescript
interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}
```

## 5. Types

### Existing DTOs (from `types.ts`)

These DTOs are already defined and returned by the API:

```typescript
// Complete plan with nested structure (API response for GET /api/plans/{planId})
type PlanDto = Plan & {
  days: DayDto[];
};

// Day with nested blocks
type DayDto = Omit<PlanDay, "plan_id" | "created_at" | "updated_at"> & {
  blocks: BlockDto[];
};

// Block with nested activities and warnings
type BlockDto = Omit<PlanBlock, "day_id" | "created_at"> & {
  activities: ActivityDto[];
  total_duration_minutes: number;
  warning: string | null;
};

// Activity (omits block_id as it's implied by parent)
type ActivityDto = Omit<PlanActivity, "block_id">;

// For mutations
type UpdatePlanDto = Partial<Pick<TablesUpdate<"plans">, "name" | "budget" | "note_text" | "people_count">>;

type UpdateActivityDto = Partial<
  Pick<TablesUpdate<"plan_activities">, "title" | "duration_minutes" | "transport_minutes">
>;

type MoveActivityDto = {
  target_block_id: string;
  target_order_index: number;
};

type RegeneratePlanDto = Partial<
  Pick<TablesUpdate<"plans">, "date_start" | "date_end" | "note_text" | "comfort" | "transport_modes">
>;
```

### New ViewModels (to be created in `/src/components/plan-details/types.ts`)

These types transform DTOs into UI-optimized structures:

```typescript
/**
 * ViewModel for the entire plan details view
 * Transforms PlanDto into UI-ready format with formatted dates and computed properties
 */
export interface PlanDetailsViewModel {
  id: string;
  name: string;
  destination: string;
  dateStart: string; // ISO date
  dateEnd: string; // ISO date
  formattedDateRange: string; // e.g., "June 15 – June 20, 2025"
  peopleCount: number;
  tripType: TripTypeEnum;
  comfort: ComfortLevelEnum;
  budget: BudgetLevelEnum;
  transportModes: TransportModeEnum[];
  noteText: string | null;
  hasWarnings: boolean; // true if any block has warning !== null
  days: DayViewModel[];
}

/**
 * ViewModel for a single day
 */
export interface DayViewModel {
  id: string;
  dayIndex: number; // 1-based
  dayDate: string; // ISO date
  formattedDate: string; // e.g., "Monday, June 15, 2025"
  blocks: BlockViewModel[];
}

/**
 * ViewModel for a time block
 */
export interface BlockViewModel {
  id: string;
  blockType: BlockTypeEnum; // 'morning' | 'afternoon' | 'evening'
  blockLabel: string; // e.g., "Morning", "Afternoon", "Evening"
  totalDurationMinutes: number;
  formattedDuration: string; // e.g., "2h 15min"
  warning: string | null;
  hasWarning: boolean; // computed from warning !== null
  activities: ActivityViewModel[];
}

/**
 * ViewModel for a single activity
 */
export interface ActivityViewModel {
  id: string;
  title: string;
  durationMinutes: number;
  formattedDuration: string; // e.g., "2h" or "45min"
  transportMinutes: number;
  formattedTransport: string | null; // e.g., "15min" or null if 0
  hasTransport: boolean; // computed from transportMinutes > 0
  orderIndex: number;
}

/**
 * Helper type for block selection in EditActivityModal
 */
export interface BlockOption {
  id: string;
  label: string; // e.g., "Day 1 - Morning", "Day 2 - Afternoon"
  dayIndex: number;
  blockType: BlockTypeEnum;
}
```

### Transformation Logic

The transformation from `PlanDto` to `PlanDetailsViewModel` should:
1. Format dates using `date-fns` library (e.g., `format(new Date(dateStart), "MMMM d, yyyy")`)
2. Compute `formattedDateRange` as single string (e.g., "June 15 – June 20, 2025")
3. Compute `hasWarnings` by checking if any block in any day has `warning !== null`
4. For each day:
   - Format `dayDate` to human-readable format with day name (e.g., "Monday, June 15")
5. For each block:
   - Generate `blockLabel` from `blockType` enum (capitalize first letter)
   - Format `totalDurationMinutes` to "Xh Ymin" format
   - Set `hasWarning` flag
6. For each activity:
   - Format `durationMinutes` to "Xh" or "Ymin" format (omit hours if < 60 min)
   - Format `transportMinutes` similarly, return null if 0
   - Set `hasTransport` flag

## 6. State Management

### Custom Hook: `usePlan(planId: string)`

**Purpose**: Fetches plan details from the API and transforms the response into a ViewModel for UI consumption.

**Implementation**:
- Uses React Query's `useQuery` hook
- Query key: `["plan", planId]`
- Query function: Fetches from `GET /api/plans/{planId}`
- Handles transformation from `PlanDto` to `PlanDetailsViewModel` in the `select` option
- Stale time: 5 minutes (plans don't change frequently)
- Retry: 1 attempt (ownership/not found errors shouldn't retry)

**Returns**:
```typescript
{
  data: PlanDetailsViewModel | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### Mutation Hooks

**`useUpdatePlan()`**
- Mutation function: `PATCH /api/plans/{planId}`
- Request body: `UpdatePlanDto`
- Optimistic update: Immediately update plan name/budget/etc in cache
- On success: Invalidate `["plan", planId]` query
- On error: Revert optimistic update, show error toast

**`useUpdateActivity()`**
- Mutation function: `PATCH /api/plans/{planId}/activities/{activityId}`
- Request body: `UpdateActivityDto`
- Optimistic update: Update activity in cached plan structure
- On success: Invalidate `["plan", planId]` query
- On error: Revert optimistic update, show error toast

**`useMoveActivity()`**
- Mutation function: `POST /api/plans/{planId}/activities/{activityId}/move`
- Request body: `MoveActivityDto`
- Optimistic update: Move activity to new block/position in cache
- On success: Invalidate `["plan", planId]` query
- On error: Revert optimistic update, show error toast

**`useRegeneratePlan()`**
- Mutation function: `POST /api/plans/{planId}/regenerate`
- Request body: `RegeneratePlanDto`
- No optimistic update (full regeneration takes time)
- On success: Replace entire plan data in cache, show success toast
- On error: Show error toast with retry option
- On timeout (503): Show specific "AI service unavailable" message

**`useDeletePlan()`**
- Mutation function: `DELETE /api/plans/{planId}`
- No request body
- On success: Navigate to dashboard ("/"), invalidate `["plans"]` query, show success toast
- On error: Show error toast

**Note**: There is no `useDeleteActivity()` hook in MVP - activity deletion is not supported.

### Modal State Management

Modal visibility is managed via local React state in `PlanDetailsView`:
```typescript
const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
const [editActivityModalOpen, setEditActivityModalOpen] = useState(false);
const [editActivityData, setEditActivityData] = useState<ActivityViewModel | null>(null);
const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

## 7. API Integration

### Primary Endpoint: `GET /api/plans/{planId}`

**Request**:
- Method: `GET`
- Path: `/api/plans/{planId}`
- Path parameter: `planId` (string, UUID)
- Headers: None (authentication handled by middleware via cookies)

**Response (200 OK)**:
- Type: `PlanDto`
- Structure: Full nested plan with days, blocks, activities, and warnings
- Example:
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
        }
      ]
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid planId format
- `403 Forbidden`: User doesn't own this plan (message: "You do not have permission to access this plan")
- `404 Not Found`: Plan doesn't exist (message: "Plan not found")
- `500 Internal Server Error`: Unexpected error

### Mutation Endpoints

**Update Plan**: `PATCH /api/plans/{planId}`
- Request body: `UpdatePlanDto`
- Response (200): `PlanUpdatedDto`

**Update Activity**: `PATCH /api/plans/{planId}/activities/{activityId}`
- Request body: `UpdateActivityDto`
- Response (200): `ActivityUpdatedDto`

**Move Activity**: `POST /api/plans/{planId}/activities/{activityId}/move`
- Request body: `MoveActivityDto`
- Response (200): `ActivityUpdatedDto`

**Regenerate Plan**: `POST /api/plans/{planId}/regenerate`
- Request body: `RegeneratePlanDto`
- Response (200): `PlanDto`
- Response (503): Service unavailable (AI timeout)

**Delete Plan**: `DELETE /api/plans/{planId}`
- No request body
- Response (204): No content

## 8. User Interactions

### View Plan Details
1. User navigates to `/plans/{planId}` from dashboard
2. Loading state displays skeleton placeholders
3. API fetches plan data via `usePlan(planId)` hook
4. On success: Full plan details render with all days/blocks/activities
5. On error (403): Display "You don't have access to this plan" message
6. On error (404): Display "Plan not found" message with link back to dashboard

### Edit Plan Metadata
1. User clicks "Edit Plan" button in header
2. `EditPlanModal` opens with current plan data pre-filled
3. User modifies name, budget, people count, or note text
4. User clicks "Save Changes"
5. Form validates input (name length, people count range, etc.)
6. On valid: `useUpdatePlan` mutation fires
7. Optimistic UI update: Plan name changes immediately in header
8. On success: Modal closes, success toast shows, cache updates
9. On error: Revert to original values, show error toast with message

### Edit Activity
1. User clicks "Edit" in activity card's dropdown menu
2. `EditActivityModal` opens with activity data pre-filled
3. User modifies title, duration, or transport time
4. User can also select "Move to..." dropdown to change block
5. User clicks "Save"
6. Form validates inputs (title non-empty, duration > 0, etc.)
7. On valid:
   - If only metadata changed: `useUpdateActivity` mutation fires
   - If block changed: `useMoveActivity` mutation fires
   - If both changed: Both mutations fire sequentially
8. Optimistic UI update: Activity updates immediately in view
9. On success: Modal closes, success toast, cache updates
10. On error: Revert changes, show error toast

### Drag-and-Drop Activity Reordering
1. User hovers over activity card, drag handle becomes visible
2. User clicks and drags activity card
3. Visual feedback: Card becomes semi-transparent, drag preview follows cursor
4. User drags over target block (visual highlight on valid drop zone)
5. User releases mouse button (drops activity)
6. `useMoveActivity` mutation fires with:
   - `target_block_id`: ID of destination block
   - `target_order_index`: Computed position in destination block
7. Optimistic update: Activity moves immediately in UI
8. On success: Toast shows "Activity moved", cache updates
9. On error: Activity reverts to original position, error toast shows

### Regenerate Plan
1. User clicks "Regenerate Plan" button in header
2. `RegeneratePlanModal` opens with warning message
3. Current plan parameters pre-fill form (dates, comfort, transport, note)
4. User modifies parameters (e.g., changes comfort from "balanced" to "intensive")
5. User clicks "Regenerate Plan" button
6. Form validates:
   - Date range does not exceed 30 days
   - Dates not in past
   - At least one transport mode selected
7. On valid: `useRegeneratePlan` mutation fires
8. Loading indicator shows in modal (no optimistic update for full regeneration)
9. On success (200): Full plan replaces current data, modal closes, success toast
10. On timeout (503): Error toast shows "AI service is temporarily unavailable, please try again"
11. On other error: Generic error toast with retry option

### Delete Plan
1. User clicks "Delete Plan" button in header
2. `DeletePlanDialog` opens with warning
3. Dialog prompts: "Type the plan name to confirm"
4. User types plan name in confirmation input
5. "Delete Plan" button enables only when input exactly matches plan name
6. User clicks "Delete Plan"
7. `useDeletePlan` mutation fires
8. On success (204):
   - User is navigated to dashboard ("/")
   - "Plans" query is invalidated (dashboard will refetch)
   - Success toast shows "Plan deleted successfully"
9. On error (403/404): Error toast shows appropriate message

### Navigate Back to Dashboard
1. User clicks "My Plans" breadcrumb link in header
2. Astro View Transition animates page change
3. User is taken to dashboard ("/")

## 9. Conditions and Validation

### Component-Level Validation

**EditPlanModal**:
- **Plan name**:
  - Required: Yes
  - Min length: 1 character
  - Max length: 140 characters
  - Error message: "Plan name is required" / "Plan name must be less than 140 characters"
- **Budget**:
  - Required: Yes
  - Valid values: 'budget', 'moderate', 'luxury'
  - Error message: "Please select a budget level"
- **People count**:
  - Required: Yes
  - Type: Integer
  - Min value: 1
  - Max value: 20
  - Error message: "Must be between 1 and 20 people"
- **Note text**:
  - Required: No
  - Max length: 20000 characters
  - Error message: "Note must be less than 20000 characters"

**EditActivityModal**:
- **Title**:
  - Required: Yes
  - Min length: 1 character
  - Error message: "Activity title is required"
- **Duration**:
  - Required: Yes
  - Type: Integer
  - Min value: 1 minute
  - Error message: "Duration must be at least 1 minute"
- **Transport time**:
  - Required: No (defaults to 0)
  - Type: Integer
  - Min value: 0 minutes
  - Error message: "Transport time cannot be negative"
- **Target block**:
  - Required: No (if not changing block)
  - Valid values: Must be an existing block ID from the current plan
  - Error message: "Please select a valid block"

**RegeneratePlanModal**:
- **Date range**:
  - Required: Yes (both start and end dates)
  - Duration: Can be different from original plan (no restriction on number of days)
  - Past dates: Not allowed (start date must be >= today)
  - Max duration: 30 days (as per PRD requirement)
  - Error messages:
    - "Start date cannot be in the past"
    - "Date range cannot exceed 30 days"
- **Comfort**:
  - Required: Yes
  - Valid values: 'relax', 'balanced', 'intensive'
  - Error message: "Please select a comfort level"
- **Transport modes**:
  - Required: Yes (at least one mode)
  - Valid values: Array of 'walk', 'public', 'car'
  - Error message: "Please select at least one transport mode"
- **Note text**:
  - Required: No
  - Max length: 20000 characters
  - Error message: "Note must be less than 20000 characters"

**DeletePlanDialog**:
- **Confirmation text**:
  - Required: Yes
  - Must exactly match plan name (case-sensitive)
  - Delete button disabled until match
  - Error message: "Please type the plan name exactly as shown"

### API-Level Validation (Handled by Backend)

The backend enforces additional validation rules:
- **Plan ownership**: User must be the owner of the plan (403 if not)
- **Plan existence**: Plan must exist in database (404 if not)
- **Activity existence**: Activity must exist and belong to the plan (404 if not)
- **Block existence**: Target block must exist in the plan (400 if not)
- **Order index**: Must be valid for target block (backend adjusts if needed)

### Conditional Rendering

**Warning Banner**:
- **Condition**: `hasWarnings === true`
- **Shows**: Alert banner at top of plan details
- **Hides**: When no blocks have warnings

**Block Warning Badge**:
- **Condition**: `block.warning !== null`
- **Shows**: Warning badge with message in block header
- **Hides**: When block has no warnings

**Transport Time in Activity**:
- **Condition**: `activity.transportMinutes > 0`
- **Shows**: Transport icon and formatted time
- **Hides**: When transport time is 0

**Empty Block State**:
- **Condition**: `block.activities.length === 0`
- **Shows**: "No activities in this block" message
- **Hides**: When block has activities

**Delete Plan Button Enable State**:
- **Condition**: User has typed exact plan name in confirmation input
- **Enabled**: When input matches
- **Disabled**: When input doesn't match or is empty

**Create Plan Button (in dashboard, not this view)**:
- **Condition**: User has reached 10-plan limit
- **Disabled**: When limit reached
- **Tooltip**: "You've reached the maximum of 10 plans"

## 10. Error Handling

### Fetch Errors

**403 Forbidden (Ownership Check Failed)**:
- **Scenario**: User tries to access a plan they don't own
- **Display**: ErrorState component with message "You don't have permission to access this plan"
- **Action**: Provide "Back to My Plans" button to return to dashboard
- **No retry**: This is a permanent error (user will never have access)

**404 Not Found**:
- **Scenario**: Plan ID doesn't exist in database
- **Display**: ErrorState component with message "Plan not found. It may have been deleted."
- **Action**: Provide "Back to My Plans" button
- **No retry**: Plan doesn't exist, retry won't help

**500 Internal Server Error**:
- **Scenario**: Unexpected backend error during fetch
- **Display**: ErrorState component with message "An unexpected error occurred while loading the plan"
- **Action**: Provide "Try Again" button to refetch
- **Retry**: Allow user to retry fetch

**Network Error**:
- **Scenario**: No internet connection or network timeout
- **Display**: ErrorState component with message "Network error. Please check your connection."
- **Action**: Provide "Try Again" button
- **Retry**: Allow user to retry when connection restored

### Mutation Errors

**400 Bad Request (Validation Error)**:
- **Scenario**: Client-side validation missed something, or user manipulated request
- **Display**: Inline error messages in form/modal with specific validation details
- **Action**: Keep modal open, allow user to correct input
- **Toast**: Show error toast with summary message

**403 Forbidden (Ownership Check Failed)**:
- **Scenario**: User tries to modify a plan/activity they don't own
- **Display**: Error toast with message "You don't have permission to modify this plan"
- **Action**: Close modal, revert optimistic update
- **Reload**: Refetch plan data to ensure sync

**404 Not Found (Activity/Plan Deleted)**:
- **Scenario**: Plan or activity was deleted by another client/process
- **Display**: Error toast with message "The item you're trying to edit no longer exists"
- **Action**: Close modal, refetch plan data
- **Redirect**: If plan deleted, redirect to dashboard

**503 Service Unavailable (AI Timeout)**:
- **Scenario**: Plan regeneration times out because AI service is slow/down
- **Display**: Error toast with message "AI service is temporarily unavailable. Please try again in a few minutes."
- **Action**: Keep modal open, allow user to retry regeneration
- **No optimistic update**: Original plan remains visible

**Optimistic Update Rollback**:
- **Scenario**: Any mutation fails after optimistic UI update
- **Display**: Revert UI changes immediately, show error toast with failure reason
- **Action**: Refetch plan data to ensure cache is synced with server
- **Toast**: "Failed to update. Changes have been reverted."

### Edge Cases

**Concurrent Edits**:
- **Scenario**: User has plan open in multiple tabs, edits in one tab
- **Handling**: React Query cache is shared across tabs (via BroadcastChannel API)
- **Result**: Changes in one tab automatically reflect in other tabs
- **Conflict**: If server returns 409 Conflict, show toast "This item was modified elsewhere. Reloading..."

**Deleted Plan While Viewing**:
- **Scenario**: User views plan, another user/tab deletes it
- **Handling**: Next mutation returns 404
- **Display**: Error toast "This plan has been deleted"
- **Action**: Redirect user to dashboard

**Missing Blocks/Activities After Move**:
- **Scenario**: User moves activity to a block that was deleted
- **Handling**: Backend returns 400 with message "Target block not found"
- **Display**: Error toast, revert move, refetch plan
- **Prevention**: Validate target block exists before mutation

**Very Long Plan Names/Titles**:
- **Scenario**: User enters extremely long text that passes validation but breaks layout
- **Handling**: CSS `line-clamp-2` on titles to truncate with ellipsis
- **Tooltip**: Show full text on hover for truncated items

**Empty Plan (No Days)**:
- **Scenario**: Edge case where plan has no days (shouldn't happen, but defensive)
- **Display**: Empty state message "This plan has no days. Try regenerating the plan."
- **Action**: Show "Regenerate Plan" button prominently

**Empty Block (No Activities)**:
- **Scenario**: Block has no activities (valid state)
- **Display**: Empty state in block: "No activities planned for this time block"
- **Action**: Show "Add Activity" button (future feature, not in MVP)

## 11. Implementation Steps

### Step 1: Create Astro Page File and Route
- Create `/src/pages/plans/[planId].astro`
- Import `Layout` component
- Import `PlanDetailsPage` React component
- Wrap with `QueryClientProvider`
- Pass `planId` from Astro params as prop

### Step 2: Create Type Definitions
- Create `/src/components/plan-details/types.ts`
- Define all ViewModel interfaces:
  - `PlanDetailsViewModel`
  - `DayViewModel`
  - `BlockViewModel`
  - `ActivityViewModel`
  - `BlockOption`
- Create transformation helper functions:
  - `transformPlanToViewModel(planDto: PlanDto): PlanDetailsViewModel`
  - `formatDuration(minutes: number): string`
  - `formatDateRange(start: string, end: string): string`

### Step 3: Implement `usePlan` Custom Hook
- Create `/src/components/plan-details/hooks/usePlan.ts`
- Implement React Query `useQuery` hook
- Define query function to fetch from `GET /api/plans/{planId}`
- Use `select` option to transform `PlanDto` to `PlanDetailsViewModel`
- Configure stale time, retry, error handling
- Return data, loading, error states, and refetch function

### Step 4: Implement Mutation Hooks
- Create `/src/components/plan-details/hooks/usePlanMutations.ts`
- Implement mutation hooks:
  - `useUpdatePlan()`
  - `useUpdateActivity()`
  - `useMoveActivity()`
  - `useRegeneratePlan()`
  - `useDeletePlan()`
- Configure optimistic updates for each mutation
- Handle success/error scenarios with toast notifications
- Implement cache invalidation strategies

### Step 5: Build Loading and Error State Components
- Create `/src/components/plan-details/LoadingState.tsx`
- Create `/src/components/plan-details/ErrorState.tsx`
- Use Shadcn `Skeleton` and `Alert` components
- Implement retry logic for ErrorState

### Step 6: Build PlanDetailsView Main Component
- Create `/src/components/plan-details/PlanDetailsView.tsx`
- Implement component structure with conditional rendering
- Manage modal visibility states
- Connect `usePlan` hook for data fetching
- Pass data to child components

### Step 7: Build PlanHeader Component
- Create `/src/components/plan-details/PlanHeader.tsx`
- Implement breadcrumb navigation
- Add plan title display (editable inline or via modal)
- Add action buttons with click handlers
- Style with responsive layout (stacked on mobile, row on desktop)

### Step 8: Build PlanMetadata Component
- Create `/src/components/plan-details/PlanMetadata.tsx`
- Display destination, dates, preferences, transport modes
- Use icons from Lucide React library
- Use Shadcn `Card` component for layout
- Implement responsive grid layout

### Step 9: Build WarningBanner Component
- Create `/src/components/plan-details/WarningBanner.tsx`
- Use Shadcn `Alert` component with warning variant
- Conditionally render based on `hasWarnings` prop
- Display summary warning message

### Step 10: Build Day, Block, and Activity Components
- Create `/src/components/plan-details/DayCard.tsx`
- Create `/src/components/plan-details/BlockCard.tsx`
- Create `/src/components/plan-details/ActivityCard.tsx`
- Implement nested structure with proper data passing
- Add drag-and-drop handles using `dnd-kit` library
- Style blocks differently based on `blockType` (morning/afternoon/evening)
- Display warnings in block headers conditionally

### Step 11: Implement Drag-and-Drop Functionality
- Install and configure `dnd-kit` library
- Create `/src/components/plan-details/ActivitiesList.tsx` with `SortableContext`
- Wrap ActivityCard with `useSortable` hook
- Implement `onDragEnd` handler to call `useMoveActivity` mutation
- Add visual feedback for drag operations (opacity, drop zone highlights)
- Ensure accessibility (keyboard navigation for reordering)

### Step 12: Build Modal Components
- Create `/src/components/plan-details/modals/EditPlanModal.tsx`
- Create `/src/components/plan-details/modals/EditActivityModal.tsx`
- Create `/src/components/plan-details/modals/RegeneratePlanModal.tsx`
- Create `/src/components/plan-details/modals/DeletePlanDialog.tsx`
- Use Shadcn `Dialog` and `AlertDialog` components
- Implement forms with `react-hook-form` and `Zod` validation
- Connect to mutation hooks
- Handle form submission, success, and error states

### Step 13: Implement Responsive Behavior
- Add mobile-specific styles with Tailwind breakpoints
- Implement accordion for days on mobile (Shadcn `Accordion`)
- Test layout on mobile, tablet, and desktop screen sizes
- Ensure touch-friendly interactions (larger tap targets)

### Step 14: Add Toast Notifications
- Configure toast provider (Shadcn `Toaster` component)
- Add toast calls in mutation success/error handlers
- Display appropriate messages for each operation:
  - "Plan updated successfully"
  - "Activity moved"
  - "Plan regenerated successfully"
  - "Failed to update: [error message]"

### Step 15: Integrate with Navigation
- Ensure Astro View Transitions are enabled in Layout
- Test navigation from dashboard to plan details and back
- Test breadcrumb navigation
- Verify URL changes and browser history work correctly

### Step 16: Testing and Refinement
- Test all user interactions end-to-end:
  - View plan details
  - Edit plan metadata
  - Edit activity details
  - Move activities via drag-and-drop
  - Move activities via modal
  - Regenerate plan
  - Delete plan
- Test error scenarios:
  - 403 Forbidden (access denied)
  - 404 Not Found (plan doesn't exist)
  - Network errors
  - Validation errors
  - Mutation failures
- Verify optimistic updates work correctly
- Check accessibility (keyboard navigation, screen reader compatibility)
- Validate responsive design on different devices
- Ensure loading states are smooth and informative
