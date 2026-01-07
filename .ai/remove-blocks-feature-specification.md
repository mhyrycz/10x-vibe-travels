# Feature Specification Document (FSD) - VibeTravels: Simplified Day Structure

## 1. Product Overview

VibeTravels is an AI-powered travel itinerary planning application built with Astro 5, React 19, TypeScript 5, and Supabase. The application generates personalized multi-day travel itineraries based on user preferences including destination, duration, and comfort level.

This feature specification addresses a critical UX improvement: removing the morning/afternoon/evening block structure that currently organizes activities within each day. The current three-block system creates confusion about time boundaries and adds unnecessary complexity, as AI typically generates only one activity per block anyway.

The simplified structure will display activities as a flat sequential list directly under each day, improving clarity and user experience while maintaining full functionality for viewing, editing, reordering, and managing activities.

Technology Stack:

- Frontend: Astro 5 (SSR/MPA), React 19 (interactive components), TypeScript 5, TanStack Query
- UI: shadcn/ui, Radix UI, Tailwind 4, @dnd-kit/core for drag-and-drop
- Backend: Astro API routes, Zod validation
- Database: Supabase (PostgreSQL)
- AI: OpenRouter.ai with gpt-4o-mini-2024-07-18 model

## 2. User Problem

Users currently face several pain points with the block-based itinerary structure:

1. Temporal Confusion: The morning/afternoon/evening blocks have undefined time boundaries. Users frequently ask questions like "What time is afternoon?" or "When does morning end?" This ambiguity makes it difficult to evaluate whether an itinerary is realistic.

2. Artificial Complexity: The AI typically generates only 1 activity per block, making the three-block structure feel arbitrary and unnecessarily complex. Users must navigate through an extra layer of nesting (day → block → activity) that provides minimal value.

3. Visual Clutter: The block headers and groupings add visual noise to the interface, making it harder to quickly scan a day's activities at a glance.

4. Mental Model Mismatch: Users think about their day as a sequence of activities, not as three distinct time periods. The current structure forces an unnatural mental model onto the planning process.

5. Limited Flexibility: While users can reorder activities within blocks and move activities between blocks, the block structure imposes organizational constraints that don't align with how people actually plan travel days.

6. Misleading Structure: The presence of morning/afternoon/evening labels suggests that activities must happen during those times, when in reality users have full flexibility to do activities whenever they want.

The core problem: The block structure adds cognitive overhead and confusion without providing meaningful organizational value or user benefit.

## 3. Functional Requirements

### 3.1 Database Schema Simplification

The database structure must be flattened to remove the blocks abstraction layer entirely.

Requirements:

- Drop the plan_blocks table completely, including all foreign key constraints
- Add day_id column to plan_activities table as foreign key referencing plan_days(id)
- Remove block_id column from plan_activities table
- Retain order_index column in plan_activities for sequential ordering within days
- Maintain ON DELETE CASCADE behavior from plan_days to plan_activities
- No data migration required - existing plans can be deleted (development phase)

Database Schema (Before):

```
plans → plan_days → plan_blocks → plan_activities
```

Database Schema (After):

```
plans → plan_days → plan_activities
```

### 3.2 AI Generation Updates

The AI service must generate activities without block categorization.

Requirements:

- AI generates 3-6 activities per day based on comfort level:
  - Relax: 3-4 activities
  - Balanced: 4-5 activities
  - Intense: 5-6 activities
- AI prompt removes all references to morning/afternoon/evening blocks
- AI prompt instructs model to generate sequential activities without time-of-day labels
- Flat JSON response structure: {day_index: number, activities: Array<{title, duration_minutes, transport_minutes}>}
- Update Zod schema to remove blockSchema entirely
- Update Zod schema for daySchema: z.object({day_index: z.number(), activities: z.array(activitySchema)})
- Mock data generator creates 3-6 activities per day for testing

### 3.3 API Schema Updates

All DTOs and type definitions must be updated to remove block references.

Requirements:

- ActivityDto: remove block_id property, add day_id property
- DayDto: remove blocks array, add activities array directly (activities: ActivityDto[])
- Delete BlockDto type entirely from codebase
- UpdateActivityDto: no changes required (title, duration_minutes, transport_minutes)
- MoveActivityDto: replace target_block_id with target_day_id, add target_order_index property
- All API responses return days with flat activities arrays
- Type definitions shared between frontend and backend updated consistently

### 3.4 API Endpoint Modifications

All API endpoints must be updated to work with day-based routing instead of block-based routing.

Requirements:

- POST /api/plans: handle flat activities array per day during plan creation
- GET /api/plans/{planId}: return DayDto objects with flat activities arrays
- POST /api/plans/{planId}/activities/{activityId}/move: accept {target_day_id: string, target_order_index: number}
- PATCH /api/plans/{planId}/activities/{activityId}: update activity properties (no schema changes)
- All endpoints validate day_id references exist in plan_days table
- All endpoints maintain referential integrity with foreign key constraints
- All endpoints return updated PlanDto with nested days and activities

### 3.5 Move Activity Logic

The move activity endpoint must support repositioning activities within days and between days.

Requirements:

- Endpoint: POST /api/plans/{planId}/activities/{activityId}/move
- Request body: {target_day_id: string, target_order_index: number}
- Validate target_day_id exists and belongs to the plan
- Validate target_order_index is positive integer
- Move activity to target day (update day_id foreign key)
- Insert activity at specified order_index position
- Recompute order_index for all activities in target day to maintain sequential 1, 2, 3... order
- If source day differs from target day, recompute order_index for source day activities
- Update total_duration_minutes for both source and target days
- Recalculate day-level warnings for both days (>12 hours = warning)
- Return 200 OK with complete updated PlanDto
- Support both UI drag-and-drop and programmatic moves
- Trigger full plan refetch in frontend after successful move

### 3.6 Day-Level Warnings

The system must warn users when a day's total duration exceeds reasonable limits.

Requirements:

- Calculate total day duration: sum of (activity.duration_minutes + activity.transport_minutes) for all activities in day
- Display warning when total > 12 hours (720 minutes)
- Warning message: "This day may be too intensive - {hours} hours total"
- Warning displayed in DayCard header area with warning icon
- Warning color: amber/yellow (not red) to indicate caution, not error
- Warning recalculated automatically when activities are moved or updated
- No activity-level warnings (removed from previous implementation)
- Warning visible on both desktop and mobile views
- Warning persists until user reduces day duration below threshold

### 3.7 Frontend ViewModel Updates

All ViewModels must be updated to remove block references and flatten structure.

Requirements:

- DayViewModel structure:
  - id: string
  - dayIndex: number
  - dayDate: Date
  - activities: ActivityViewModel[] (flat array, no nesting)
  - totalDurationMinutes: number
  - hasWarning: boolean
  - warningMessage: string | null
- ActivityViewModel structure:
  - id: string
  - dayId: string (replaces blockId)
  - title: string
  - durationMinutes: number
  - transportMinutes: number | null
  - transportType: string | null
  - orderIndex: number
- Remove BlockViewModel type entirely
- Update transformPlanToViewModel utility to map activities directly to days
- Remove all blockId, blockLabel, blockType properties from ViewModels
- Ensure orderIndex reflects sequential numbering (1, 2, 3...) within each day

### 3.8 UI Component Restructure

The component hierarchy must be simplified to remove block layer.

Requirements:

- Delete BlockCard component entirely including all related files
- Update DayCard component:
  - Display day header with date and day index
  - Display day-level warning if hasWarning is true
  - Render flat list of ActivityCards directly (no grouping)
  - Remove all block rendering logic
  - Remove block state management
- Update ActivityCard component:
  - Remove blockId from props
  - Remove block references from internal logic
  - Keep all existing functionality (edit, drag handle, display)
  - No visual changes to activity display
- Update PlanDetailsView:
  - Remove block-related state variables
  - Remove block expansion/collapse logic
  - Simplify rendering to days → activities (no intermediate layer)
- No visual dividers or grouping hints between activities (pure sequential list)

### 3.9 Drag-and-Drop Between Days

Users must be able to drag activities between different days using drag-and-drop UI.

Requirements:

- DndContext must span all DayCards to enable cross-day dragging
- Each DayCard acts as droppable zone for ActivityCards
- Visual drop indicator shows insertion point within target day
- handleDragEnd extracts target dayId from drop location
- handleDragEnd calculates target_order_index based on drop position
- If dropped at end of day, order_index = max + 1
- If dropped between activities, order_index = position in list
- Call move API endpoint with target_day_id and target_order_index
- Display loading state during API call
- Optimistic update: immediately show activity in new position
- On API success: full plan refetch to ensure consistency
- On API error: rollback optimistic update, show error message
- Collision detection algorithm handles cross-day scenarios
- Drag-and-drop works smoothly without performance issues (<100ms response)
- Mobile touch support for drag-and-drop on tablets

## 4. Feature Boundaries

### 4.1 In Scope

The following functionality is included in this feature:

- Complete removal of plan_blocks table from database
- Migration to add day_id foreign key to plan_activities
- Update all API endpoints to use day-based routing
- Update all DTOs and types to remove block references
- Flatten AI generation to produce 3-6 activities per day without blocks
- Update Zod schemas to validate flat activity arrays
- Delete BlockCard component and all block UI logic
- Update DayCard to display flat activity list
- Implement day-level warnings for >12 hour days
- Enable cross-day drag-and-drop in UI
- Update move activity endpoint to accept day_id and order_index
- Update all ViewModels to remove block properties
- Update all React hooks to work with day-based data
- Test AI generation with new flat structure
- Test drag-and-drop within and between days
- Test day warnings with various activity durations

### 4.2 Out of Scope

The following functionality is explicitly excluded from this feature:

- Time-of-day scheduling system (no replacement for blocks with actual time slots)
- Calendar view showing activities on timeline
- Activity time constraints or dependencies
- Automatic activity scheduling based on business hours
- Integration with external calendar services (Google Calendar, Outlook)
- Activity recommendations based on time of day
- Weather-based activity suggestions
- Real-time collaboration on itineraries
- Activity booking or reservation functionality
- Map view showing activity locations
- Route optimization between activities
- Transportation booking integration
- Activity ratings and reviews
- Social sharing of itineraries
- Print or PDF export of itineraries
- Activity descriptions feature (separate FSD: advanced-activities-feature-specification.md)
- Custom activity creation (separate FSD: advanced-activities-feature-specification.md)
- Activity deletion functionality (separate FSD: advanced-activities-feature-specification.md)
- Multi-plan management or comparison

### 4.3 Assumptions

- Users are comfortable with sequential activity lists without time constraints
- Application is still in development phase, so existing plan data can be deleted
- AI reliably generates appropriate number of activities (3-6) per day
- Users understand that activity order is flexible and not time-bound
- Drag-and-drop is the primary method for reordering activities
- 12 hours is a reasonable threshold for day warning (can be adjusted later)
- Users will self-organize activities in logical temporal order
- No external systems depend on the block structure
- All users access application through modern browsers supporting drag-and-drop APIs

### 4.4 Dependencies

- Database migration must complete before API changes
- API changes must complete before frontend changes
- BlockCard component deletion depends on DayCard updates
- Drag-and-drop implementation depends on DndContext updates
- AI service updates can proceed in parallel with database changes
- Testing phase depends on completion of all implementation phases

## 5. User Stories

### US-001: View Simplified Day Structure

ID: US-001
Title: View activities in flat list under each day
Description: As a user viewing my travel plan, I want to see all activities listed directly under each day without block groupings, so that I can quickly scan my itinerary without navigating confusing time blocks.

Acceptance Criteria:

- AC-001.1: When viewing a plan, each day displays activities in a flat sequential list without morning/afternoon/evening headers
- AC-001.2: Activities are numbered sequentially (1, 2, 3...) within each day
- AC-001.3: No visual dividers or grouping hints appear between activities
- AC-001.4: Day header shows only date, day index, and optional warning (no block information)
- AC-001.5: All activities are visible immediately without expanding/collapsing blocks
- AC-001.6: Activity order matches order_index value in database
- AC-001.7: UI loads and renders within 2 seconds for plans with up to 10 days

### US-002: Generate Plan with Flat Activity Structure

ID: US-002
Title: AI generates activities without block categorization
Description: As a user creating a new travel plan, I want the AI to generate activities as a sequential list without morning/afternoon/evening labels, so that I receive a clear itinerary without artificial time constraints.

Acceptance Criteria:

- AC-002.1: When generating a plan with "relax" comfort level, AI produces 3-4 activities per day
- AC-002.2: When generating a plan with "balanced" comfort level, AI produces 4-5 activities per day
- AC-002.3: When generating a plan with "intense" comfort level, AI produces 5-6 activities per day
- AC-002.4: Generated activities do not include morning/afternoon/evening labels in titles or descriptions
- AC-002.5: Activity descriptions focus on content without temporal hints (no "morning visit" phrases)
- AC-002.6: Activities are assigned sequential order_index values starting from 1
- AC-002.7: Each activity includes title, description, duration_minutes, and transport_minutes
- AC-002.8: AI generation completes within 30 seconds for 7-day itinerary

### US-003: Drag Activity Within Same Day

ID: US-003
Title: Reorder activities within a day using drag-and-drop
Description: As a user organizing my itinerary, I want to drag and drop activities to reorder them within the same day, so that I can arrange activities in my preferred sequence.

Acceptance Criteria:

- AC-003.1: When I hover over an activity, a drag handle appears
- AC-003.2: When I click and hold the drag handle, the activity becomes draggable
- AC-003.3: When I drag an activity, a visual placeholder shows the insertion point
- AC-003.4: When I drop an activity at a new position, it moves to that position immediately (optimistic update)
- AC-003.5: Other activities in the day shift positions to accommodate the moved activity
- AC-003.6: After successful API response, the UI reflects the final order_index values
- AC-003.7: If API call fails, the activity returns to its original position and error message displays
- AC-003.8: Drag operation feels smooth with no lag or jank (<100ms response time)

### US-004: Drag Activity Between Different Days

ID: US-004
Title: Move activity to different day using drag-and-drop
Description: As a user reorganizing my itinerary, I want to drag an activity from one day to another day, so that I can easily rebalance my schedule when plans change.

Acceptance Criteria:

- AC-004.1: When I drag an activity over a different day, that day becomes highlighted as drop zone
- AC-004.2: When I drop an activity on a different day, it moves to the end of that day
- AC-004.3: The activity is removed from the source day immediately (optimistic update)
- AC-004.4: The activity appears in the target day with appropriate order_index
- AC-004.5: Activities in the source day reorder to fill the gap
- AC-004.6: Both source and target days recalculate their total_duration_minutes
- AC-004.7: Both days update their warning status based on new durations
- AC-004.8: After successful API response, the full plan refetches to ensure consistency
- AC-004.9: If API call fails, the activity returns to its original day and error message displays

### US-005: Receive Day-Level Intensity Warning

ID: US-005
Title: See warning when day exceeds 12 hours
Description: As a user planning an ambitious itinerary, I want to be warned when a single day has too many hours of activities, so that I can adjust my plans to avoid exhaustion.

Acceptance Criteria:

- AC-005.1: When total day duration (activities + transport) exceeds 12 hours, warning appears in day header
- AC-005.2: Warning message displays: "This day may be too intensive - X hours total"
- AC-005.3: Warning uses amber/yellow color scheme (caution, not error)
- AC-005.4: Warning icon (triangle with exclamation) appears next to message
- AC-005.5: Warning recalculates automatically when activities are added, removed, or updated
- AC-005.6: When day duration drops below 12 hours, warning disappears
- AC-005.7: No activity-level warnings appear anywhere in the UI
- AC-005.8: Warning is visible on both desktop and mobile views

### US-006: Move Activity to Specific Position via API

ID: US-006
Title: Programmatically move activity to precise position
Description: As a user (or automated system), I want to move an activity to a specific position within a day using the API, so that I can precisely control activity order beyond simple drag-and-drop.

Acceptance Criteria:

- AC-006.1: POST /api/plans/{planId}/activities/{activityId}/move accepts {target_day_id, target_order_index}
- AC-006.2: When target_order_index is 1, activity moves to first position in target day
- AC-006.3: When target_order_index equals max + 1, activity moves to last position in target day
- AC-006.4: When target_order_index is between existing activities, activity inserts at that position
- AC-006.5: All activities in target day reorder to maintain sequential 1, 2, 3... numbering
- AC-006.6: If source day differs from target day, activities in source day also reorder sequentially
- AC-006.7: Both days recalculate total_duration_minutes and warning status
- AC-006.8: API returns 200 OK with complete updated PlanDto
- AC-006.9: API returns 400 Bad Request if target_day_id doesn't exist or doesn't belong to plan
- AC-006.10: API returns 404 Not Found if activityId doesn't exist

### US-007: View Day Without Activities

ID: US-007
Title: See empty state when day has no activities
Description: As a user viewing a plan where a day has no activities (due to moving all activities away), I want to see a clear empty state, so that I understand the day is empty.

Acceptance Criteria:

- AC-007.1: When a day has zero activities, "No activities for this day" message appears
- AC-007.2: Empty state includes icon (calendar with X or empty box)
- AC-007.3: Drag-and-drop into empty day works correctly
- AC-007.4: No warning appears for empty day (total duration = 0 hours)
- AC-007.5: Day remains in plan structure (not deleted automatically)

### US-009: Validate Day Belongs to Plan

ID: US-009
Title: Prevent unauthorized day access
Description: As the system, I want to validate that a day belongs to the specified plan before performing operations, so that users cannot access or modify days from other users' plans.

Acceptance Criteria:

- AC-009.1: When API endpoint receives dayId parameter, system verifies day.plan_id matches planId in URL
- AC-009.2: If day belongs to different plan, API returns 403 Forbidden
- AC-009.3: If day doesn't exist, API returns 404 Not Found
- AC-009.4: If user doesn't own the plan, API returns 401 Unauthorized
- AC-009.5: Validation occurs before any data modifications
- AC-009.6: Validation applies to all endpoints: move, update
- AC-009.7: Error response includes clear message explaining authorization failure

### US-010: Validate Activity Belongs to Plan

ID: US-010
Title: Prevent unauthorized activity access
Description: As the system, I want to validate that an activity belongs to the specified plan before performing operations, so that users cannot access or modify activities from other users' plans.

Acceptance Criteria:

- AC-010.1: When API endpoint receives activityId parameter, system verifies activity's day belongs to planId in URL
- AC-010.2: If activity belongs to different plan, API returns 403 Forbidden
- AC-010.3: If activity doesn't exist, API returns 404 Not Found
- AC-010.4: If user doesn't own the plan, API returns 401 Unauthorized
- AC-010.5: Validation occurs before any data modifications
- AC-010.6: Validation applies to all endpoints: move, update
- AC-010.7: Error response includes clear message explaining authorization failure

### US-011: Handle Database Migration

ID: US-011
Title: Execute database schema changes safely
Description: As a developer/system administrator, I want to execute a database migration that drops plan_blocks and adds day_id to plan_activities, so that the schema reflects the new simplified structure.

Acceptance Criteria:

- AC-011.1: Migration script creates backup of plan_blocks and plan_activities tables
- AC-011.2: Migration script drops all foreign key constraints referencing plan_blocks
- AC-011.3: Migration script drops plan_blocks table
- AC-011.4: Migration script adds day_id column to plan_activities as UUID NOT NULL
- AC-011.5: Migration script adds foreign key constraint: plan_activities.day_id REFERENCES plan_days(id) ON DELETE CASCADE
- AC-011.6: Migration script removes block_id column from plan_activities
- AC-011.7: Migration executes successfully without errors
- AC-011.8: Rollback script is available to reverse changes if needed
- AC-011.9: Migration is idempotent (can be run multiple times safely)
- AC-011.10: Documentation includes pre-migration and post-migration schema diagrams

### US-012: Update AI Service Schema

ID: US-012
Title: Modify AI response validation to accept flat activities
Description: As the system, I want to update Zod schemas in AI service to validate flat activity arrays without blocks, so that AI responses are correctly parsed and validated.

Acceptance Criteria:

- AC-012.1: activitySchema validates: {title: string, duration_minutes: number, transport_minutes: number, description: string}
- AC-012.2: daySchema validates: {day_index: number, activities: array of activitySchema}
- AC-012.3: itinerarySchema validates: {days: array of daySchema}
- AC-012.4: blockSchema is deleted from codebase
- AC-012.5: AI prompt removes all references to morning/afternoon/evening
- AC-012.6: AI prompt instructs model to generate 3-6 activities per day based on comfort level
- AC-012.7: AI prompt instructs model to avoid time-of-day labels in descriptions
- AC-012.8: Schema validation rejects responses with block_type or block structures
- AC-012.9: Mock data generator creates 3-6 activities per day for testing
- AC-012.10: All existing AI service tests updated to use new schema

### US-013: Remove BlockCard Component

ID: US-013
Title: Delete block UI layer from codebase
Description: As a developer, I want to remove BlockCard component and all block-related UI logic, so that the codebase reflects the simplified day structure.

Acceptance Criteria:

- AC-013.1: BlockCard.tsx file is deleted from src/components/
- AC-013.2: All imports of BlockCard are removed from other components
- AC-013.3: DayCard component no longer renders BlockCard instances
- AC-013.4: DayCard component renders activities directly in flat list
- AC-013.5: No block expansion/collapse state exists in DayCard
- AC-013.6: No block-related props are passed to ActivityCard
- AC-013.7: No block-related state exists in PlanDetailsView
- AC-013.8: TypeScript compilation succeeds with zero errors
- AC-013.9: All tests pass after component deletion
- AC-013.10: No unused imports or dead code remains related to blocks

### US-014: Implement Cross-Day Drag-and-Drop

ID: US-014
Title: Enable dragging activities between days in UI
Description: As a user, I want to drag activities from one day and drop them onto another day, so that I can easily rebalance my itinerary across days.

Acceptance Criteria:

- AC-014.1: DndContext wraps all DayCard components to enable cross-day dragging
- AC-014.2: Each DayCard has unique droppable ID based on day.id
- AC-014.3: When I drag activity over different day, that day highlights as drop zone
- AC-014.4: Drop indicator shows where activity will be inserted
- AC-014.5: handleDragEnd extracts target dayId from over.id
- AC-014.6: handleDragEnd calculates appropriate target_order_index
- AC-014.7: Move mutation is called with target_day_id and target_order_index
- AC-014.8: Activity moves to target day immediately (optimistic update)
- AC-014.9: Collision detection algorithm correctly identifies target day
- AC-014.10: Drag-and-drop works smoothly without lag (<100ms response)
- AC-014.11: Touch events work on tablet devices for drag-and-drop

### US-015: Recalculate Order Index After Move

ID: US-015
Title: Maintain sequential ordering after activity moves
Description: As the system, I want to recalculate order_index for all activities in affected days after a move, so that activities maintain sequential 1, 2, 3... numbering without gaps.

Acceptance Criteria:

- AC-015.1: After moving activity to target day, system recomputes order_index for all activities in target day
- AC-015.2: Target day activities are sorted by new order_index in ascending order
- AC-015.3: Target day activities receive sequential order_index values: 1, 2, 3, ..., N
- AC-015.4: If source day differs from target day, source day activities are also recomputed
- AC-015.5: Source day activities fill the gap left by moved activity
- AC-015.6: Source day activities receive sequential order_index values: 1, 2, 3, ..., N
- AC-015.7: No gaps exist in order_index sequences (no missing numbers)
- AC-015.8: Recomputation completes within same database transaction as move
- AC-015.9: If recomputation fails, entire move operation is rolled back
- AC-015.10: Updated order_index values are reflected in API response

### US-016: Update ViewModels to Remove Blocks

ID: US-018
Title: Flatten ViewModels by removing block layer
Description: As a developer, I want to update ViewModels to remove block properties and flatten the structure, so that frontend code works with simplified day-based data.

Acceptance Criteria:

- AC-018.1: DayViewModel.activities is array of ActivityViewModel (no nesting)
- AC-018.2: ActivityViewModel.blockId property is removed
- AC-018.3: ActivityViewModel.blockLabel property is removed
- AC-018.4: ActivityViewModel.dayId property is added
- AC-018.5: BlockViewModel type is deleted entirely
- AC-018.6: transformPlanToViewModel maps activities directly to days
- AC-018.7: No blockId or blockLabel appears anywhere in ViewModels
- AC-016.8: ActivityViewModel.orderIndex reflects sequential position within day
- AC-016.9: TypeScript compilation succeeds with zero errors
- AC-016.10: All components consuming ViewModels are updated accordingly

### US-017: Handle Empty Activity List Edge Case

ID: US-017
Title: Prevent errors when day has no activities
Description: As the system, I want to handle edge cases where a day has zero activities without crashing or showing errors, so that the UI remains stable during all operations.

Acceptance Criteria:

- AC-017.1: When day.activities is empty array, no error is thrown
- AC-017.2: Empty state message "No activities for this day" displays
- AC-017.3: total_duration_minutes calculates as 0 for empty day
- AC-017.4: hasWarning is false for empty day
- AC-017.5: Drag-and-drop into empty day works correctly (first activity gets order_index = 1)
- AC-017.6: Day header renders normally
- AC-017.7: No console errors or warnings appear
- AC-017.8: Empty day can receive activities via move API endpoint
- AC-017.9: Empty day displays correctly on both desktop and mobile

### US-018: Test AI Generation with New Schema

ID: US-018
Title: Verify AI generates valid flat activity arrays
Description: As a QA engineer, I want to test that AI generates activities in the new flat structure, so that I can confirm the AI service works correctly after schema changes.

Acceptance Criteria:

- AC-018.1: Test "relax" comfort level generates 3-4 activities per day
- AC-018.2: Test "balanced" comfort level generates 4-5 activities per day
- AC-018.3: Test "intense" comfort level generates 5-6 activities per day
- AC-018.4: Test AI response validates successfully against daySchema
- AC-018.5: Test AI response contains no block_type or block structures
- AC-018.6: Test activity descriptions contain no time-of-day references
- AC-018.7: Test activities include all required fields (title, duration_minutes, transport_minutes, description)
- AC-018.8: Test AI generation completes within 30 seconds for 7-day itinerary
- AC-018.9: Test mock data generator creates valid flat structure
- AC-018.10: Test Zod validation rejects responses with old block structure

### US-019: Test Drag-and-Drop Performance

ID: US-019
Title: Verify drag-and-drop works smoothly
Description: As a QA engineer, I want to test drag-and-drop performance under various conditions, so that I can confirm the UI remains responsive during dragging operations.

Acceptance Criteria:

- AC-019.1: Test dragging within same day completes in <100ms
- AC-019.2: Test dragging between days completes in <100ms
- AC-019.3: Test dragging activity in plan with 10 days shows no lag
- AC-019.4: Test dragging activity in plan with 50 activities shows no lag
- AC-019.5: Test multiple rapid drag-and-drop operations without errors
- AC-019.6: Test drag-and-drop on Chrome browser
- AC-019.7: Test touch drag-and-drop on tablet devices
- AC-019.8: Test collision detection correctly identifies drop zones
- AC-019.9: Test drop indicators appear immediately during drag
- AC-019.10: Test drag handles are easily clickable/tappable (minimum 44x44px touch target)

### US-020: Test Day Warning Calculations

ID: US-020
Title: Verify day warnings display correctly
Description: As a QA engineer, I want to test day warning calculations under various scenarios, so that I can confirm warnings appear accurately based on activity durations.

Acceptance Criteria:

- AC-020.1: Test day with 11 hours total shows no warning
- AC-020.2: Test day with 12 hours total shows no warning (boundary condition)
- AC-020.3: Test day with 12.1 hours total shows warning
- AC-020.4: Test day with 15 hours total shows warning with correct total (e.g., "15 hours")
- AC-020.5: Test moving activity between days updates warnings on both days
- AC-020.6: Test editing activity duration updates warning status
- AC-020.7: Test warning message displays correctly on desktop and mobile
- AC-020.8: Test warning icon and color scheme (amber/yellow) render correctly

### US-021: Test API Authorization

ID: US-021
Title: Verify API endpoints enforce authorization
Description: As a security tester, I want to test that API endpoints properly authorize access to plans, days, and activities, so that users cannot access or modify other users' data.

Acceptance Criteria:

- AC-021.1: Test unauthenticated request to any endpoint returns 401 Unauthorized
- AC-021.2: Test authenticated user accessing their own plan returns 200 OK
- AC-021.3: Test authenticated user accessing another user's plan returns 403 Forbidden
- AC-021.4: Test moving activity to day from different plan returns 403 Forbidden
- AC-021.5: Test updating activity from different plan returns 403 Forbidden
- AC-021.6: Test request with invalid dayId returns 404 Not Found
- AC-021.7: Test request with invalid activityId returns 404 Not Found
- AC-021.8: Test error responses include clear messages without leaking sensitive information

### US-022: Test Order Index Recomputation

ID: US-026
Title: Verify order_index remains sequential after operations
Description: As a QA engineer, I want to test that order_index values remain sequential (1, 2, 3...) after various operations, so that I can confirm the ordering system works correctly.

Acceptance Criteria:

- AC-026.1: Test moving activity within day maintains sequential order_index
- AC-026.2: Test moving activity between days maintains sequential order_index in both days
- AC-026.3: Test deleting activity causes remaining activities to reorder sequentially
- AC-026.4: Test creating activity assigns next sequential order_index
- AC-026.5: Test moving activity to position 1 reorders all activities after it
- AC-026.6: Test moving activity to last position assigns highest order_index + 1
- AC-026.7: Test no gaps exist in order_index sequences after any operation
- AC-026.8: Test order_index values match visual display order in UI
- AC-026.9: Test recomputation happens within same transaction as main operation
- AC-026.10: Test rollback occurs if recomputation fails

### US-023: Test Mobile Responsiveness

ID: US-023
Title: Verify UI works on mobile devices
Description: As a QA engineer, I want to test the UI on mobile devices, so that I can confirm the simplified day structure displays correctly on small screens.

Acceptance Criteria:

- AC-023.1: Test day cards stack vertically on mobile screens (<768px width)
- AC-023.2: Test activity cards display full information without horizontal scrolling
- AC-023.3: Test drag-and-drop works with touch events on tablets
- AC-023.4: Test day warnings display correctly on mobile without overflow
- AC-023.5: Test EditActivityModal fits within mobile viewport
- AC-023.6: Test all buttons have minimum 44x44px touch targets
- AC-023.7: Test no horizontal scrolling occurs at any mobile breakpoint
- AC-023.8: Test UI remains usable on iPhone SE (375px width) and larger

### US-024: Test Error Handling

ID: US-024
Title: Verify graceful error handling across features
Description: As a QA engineer, I want to test error scenarios, so that I can confirm the application handles failures gracefully without crashing.

Acceptance Criteria:

- AC-024.1: Test API endpoint returns 500 error shows user-friendly message
- AC-024.2: Test network timeout shows retry option
- AC-024.3: Test optimistic update rollback works correctly on error
- AC-024.4: Test invalid form submission shows validation errors
- AC-024.5: Test dragging activity to invalid location shows error message
- AC-024.6: Test moving activity to nonexistent day shows 404 error message
- AC-024.7: Test concurrent modifications show conflict resolution message
- AC-024.8: Test error messages disappear after 5 seconds or user dismissal
- AC-024.9: Test no console errors appear during normal usage
- AC-024.10: Test application recovers from errors without requiring page refresh

### US-025: Authenticate User for Plan Access

ID: US-025
Title: Verify user owns plan before allowing operations
Description: As the system, I want to authenticate users and verify they own the plan they're accessing, so that unauthorized users cannot view or modify plans.

Acceptance Criteria:

- AC-025.1: System checks user authentication status before processing any request
- AC-025.2: Unauthenticated requests to any plan endpoint return 401 Unauthorized
- AC-025.3: System verifies plan.user_id matches authenticated user's ID
- AC-025.4: Requests to access another user's plan return 403 Forbidden
- AC-025.5: Authentication check occurs before any database queries
- AC-025.6: Authentication uses Supabase session token validation
- AC-025.7: Expired sessions are rejected with 401 Unauthorized
- AC-025.8: Invalid tokens are rejected with 401 Unauthorized
- AC-025.9: Error responses include WWW-Authenticate header for proper HTTP semantics
- AC-025.10: Frontend redirects to login page when receiving 401 responses

### US-026: Test Database Constraints

ID: US-026
Title: Verify database enforces referential integrity
Description: As a QA engineer, I want to test database constraints, so that I can confirm data integrity is maintained at the database level.

Acceptance Criteria:

- AC-026.1: Test deleting plan cascades to delete all associated days
- AC-026.2: Test deleting plan cascades to delete all associated activities
- AC-026.3: Test deleting day cascades to delete all associated activities
- AC-026.4: Test creating activity with invalid day_id fails with foreign key error
- AC-026.5: Test creating activity with null day_id fails with not-null constraint
- AC-026.6: Test plan_activities.day_id foreign key points to plan_days.id
- AC-026.7: Test ON DELETE CASCADE works correctly for plan_days → plan_activities
- AC-026.8: Test plan_blocks table no longer exists in database
- AC-026.9: Test no orphaned activities exist without valid day reference
- AC-026.10: Test database transaction rolls back completely on constraint violation
