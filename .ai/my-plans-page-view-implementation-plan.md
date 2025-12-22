# View Implementation Plan: My Plans Page

## 1. Overview

This document outlines the implementation plan for the "My Plans" page, which serves as the central dashboard for authenticated users. The primary purpose of this view is to display a list of the user's created travel plans, provide a clear entry point for creating new plans, and allow navigation to the detailed view of any existing plan. The view will be responsive, handle loading and empty states gracefully, and enforce the product's 10-plan limit.

## 2. View Routing

-   **Path**: `/`
-   **Authentication**: This view is the default route for authenticated users. Unauthenticated users attempting to access it should be redirected to the `/login` page.

## 3. Component Structure

The view will be structured with a clear hierarchy, using Astro for the page layout and React for interactive components.

```
- MyPlansPage (`/src/pages/index.astro`)
  - MainLayout (`/src/layouts/MainLayout.astro`)
    - Header (React Component)
    - MyPlansView (React Component, client:load)
      - HeaderSection
        - Heading ("My Plans")
        - CreatePlanButton
      - PlanGrid
        - PlanCard (repeated for each plan)
          - Plan Title, Destination, Dates
          - Link to Plan Detail
      - LoadingState
        - PlanCardSkeleton (repeated)
      - EmptyState
        - Message ("You have no plans yet.")
        - CreatePlanButton
      - ErrorState
        - Alert Component with error message
```

## 4. Component Details

### MyPlansView
-   **Component Description**: This is the main interactive component that orchestrates the entire view. It is responsible for fetching the user's plans, managing the view's state (loading, error, success), and rendering the appropriate child components based on that state.
-   **Main Elements**: A container `div` that conditionally renders `HeaderSection`, `LoadingState`, `ErrorState`, or `PlanGrid`/`EmptyState`.
-   **Handled Interactions**: None directly. It delegates interactions to child components.
-   **Handled Validation**: None.
-   **Types**: `MyPlansViewModel`
-   **Props**: None.

### HeaderSection
-   **Component Description**: A simple presentational component that displays the view's title and the primary call-to-action button for creating a new plan.
-   **Main Elements**: An `h1` for the title "My Plans" and the `CreatePlanButton` component.
-   **Handled Interactions**: None directly.
-   **Handled Validation**: None.
-   **Types**: None.
-   **Props**:
    -   `planCount: number`
    -   `planLimit: number`

### CreatePlanButton
-   **Component Description**: A button that navigates the user to the `/plans/new` page. It handles the business logic of disabling itself when the user has reached their plan limit.
-   **Main Elements**: A Shadcn/ui `Button` component, wrapped in a `Tooltip` if disabled.
-   **Handled Interactions**:
    -   `onClick`: Navigates to `/plans/new`.
    -   `onHover` (when disabled): Shows a tooltip explaining the plan limit.
-   **Handled Validation**: Checks if `planCount >= planLimit`.
-   **Types**: None.
-   **Props**:
    -   `planCount: number`
    -   `planLimit: number`

### PlanGrid
-   **Component Description**: A responsive grid that displays the list of `PlanCard` components.
-   **Main Elements**: A `div` with responsive grid styles (e.g., `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`). It maps over the `plans` array to render a `PlanCard` for each item.
-   **Handled Interactions**: None.
-   **Handled Validation**: None.
-   **Types**: `PlanCardViewModel[]`
-   **Props**:
    -   `plans: PlanCardViewModel[]`

### PlanCard
-   **Component Description**: A presentational card that displays summary information for a single travel plan and links to its detail page.
-   **Main Elements**: An `<a>` tag wrapping a Shadcn/ui `Card` component. Inside, it contains `CardHeader` with the plan name and `CardContent` with the destination and creation date.
-   **Handled Interactions**:
    -   `onClick`: Navigates the user to `/plans/[planId]`.
-   **Handled Validation**: None.
-   **Types**: `PlanCardViewModel`
-   **Props**:
    -   `plan: PlanCardViewModel`

### LoadingState, EmptyState, ErrorState
-   **Component Description**: Simple presentational components to handle non-success states. `LoadingState` shows skeleton placeholders. `EmptyState` shows a message and a "Create" button. `ErrorState` shows an alert with an error message.
-   **Main Elements**: `PlanCardSkeleton` (for loading), `Alert` (for errors), `h2` and `Button` (for empty state).
-   **Props**: `errorMessage` (for `ErrorState`).

## 5. Types

### `PlanListItemDto` (from API)
This is the raw data object for a single plan as returned by the `GET /api/plans` endpoint.
```typescript
export type PlanListItemDto = {
  id: string;
  name: string;
  destination_text: string;
  date_start: string; // ISO Date String
  date_end: string;   // ISO Date String
  created_at: string; // ISO DateTime String
};
```

### `PaginatedPlansDto` (from API)
This is the full response object from the `GET /api/plans` endpoint.
```typescript
export interface PaginatedPlansDto {
  data: PlanListItemDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

### `PlanCardViewModel` (New ViewModel)
This is a transformed version of `PlanListItemDto`, prepared specifically for rendering in the `PlanCard` component.
```typescript
export type PlanCardViewModel = {
  id: string;
  name: string;
  destination: string;
  formattedDate: string; // e.g., "Created on Dec 22, 2025"
  href: string;          // e.g., "/plans/uuid-goes-here"
};
```

### `MyPlansViewModel` (New ViewModel)
This object represents the complete state required by the `MyPlansView` component.
```typescript
export type MyPlansViewModel = {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  plans: PlanCardViewModel[];
  totalPlans: number;
  planLimit: number;
};
```

## 6. State Management

State will be managed within the `MyPlansView` component using a custom React Query hook.

-   **Custom Hook**: `useMyPlans()`
    -   **Purpose**: This hook will encapsulate all the logic for fetching, transforming, and managing the state of the user's plans.
    -   **Implementation**: It will use React Query's `useQuery` hook to call the `GET /api/plans` endpoint.
    -   **State Management**: `useQuery` will automatically manage `isLoading`, `isError`, and `error` states.
    -   **Data Transformation**: Inside the hook, the fetched `PaginatedPlansDto` will be transformed into the `MyPlansViewModel`. This includes formatting dates, creating hrefs, and preparing the data for direct consumption by the UI components.
    -   **Return Value**: The hook will return a `MyPlansViewModel` object.

## 7. API Integration

-   **Endpoint**: `GET /api/plans`
-   **Request**: The frontend will make a `GET` request to this endpoint. For the MVP, no query parameters (`limit`, `offset`, `sort`) need to be sent, as the API defaults are sufficient.
    -   **Request Type**: None (no body).
-   **Response**: The frontend will expect a JSON response matching the `PaginatedPlansDto` type.
    -   **Response Type**: `PaginatedPlansDto`
-   **Integration**: The `useMyPlans` hook will use the `fetch` API or a lightweight client like `ky` to make the request. The response data will be processed and mapped to the `MyPlansViewModel`.

## 8. User Interactions

-   **Viewing Plans**: On page load, the `useMyPlans` hook is triggered, and a loading state is shown. Once data is fetched, the `PlanGrid` is rendered with the list of plans.
-   **Creating a New Plan**: The user clicks the "Create New Plan" button. This triggers a client-side navigation event (handled by Astro) to the `/plans/new` page.
-   **Navigating to Plan Details**: The user clicks on a `PlanCard`. This triggers a client-side navigation event to `/plans/[planId]`.
-   **Interacting with Disabled Button**: If the user has 10 plans, hovering over the disabled "Create New Plan" button will display a tooltip explaining the limit.

## 9. Conditions and Validation

-   **Plan Limit**: The `CreatePlanButton` component will receive `planCount` and `planLimit` as props. It will contain the condition `isDisabled = planCount >= planLimit`. If true, the button is disabled, and a `Tooltip` is rendered.
-   **Empty State**: The `MyPlansView` component will check `!isLoading && !isError && plans.length === 0`. If true, it will render the `EmptyState` component instead of the `PlanGrid`.
-   **Loading State**: The `MyPlansView` component will check `isLoading`. If true, it will render the `LoadingState` component.
-   **Error State**: The `MyPlansView` component will check `isError`. If true, it will render the `ErrorState` component, passing the `error` message to it.

## 10. Error Handling

-   **API Failure**: If the `GET /api/plans` request fails (e.g., network error, 500 status), React Query's `isError` flag will become true. The `MyPlansView` will detect this and render the `ErrorState` component, displaying a user-friendly message like "Could not load your plans. Please try again later."
-   **No Plans (Empty State)**: This is not an error but a specific UI state. It is handled by rendering the `EmptyState` component, which guides the user toward the primary action of creating their first plan.

## 11. Implementation Steps

1.  **Create Page File**: Create the main page file at `/src/pages/index.astro`. Import and render the main React component, `MyPlansView`, with a `client:load` directive.
2.  **Develop `MyPlansView` Component**: Create the `MyPlansView.tsx` component. This will be the root interactive component for the view.
3.  **Implement `useMyPlans` Hook**: Create a `useMyPlans.ts` hook. Inside, use `useQuery` from React Query to fetch data from `/api/plans`. Handle the data transformation from `PaginatedPlansDto` to `MyPlansViewModel`.
4.  **Build State Components**: Create the simple presentational components: `LoadingState`, `EmptyState`, and `ErrorState`. The `LoadingState` should include a `PlanCardSkeleton` component.
5.  **Build Core UI Components**: Create the `HeaderSection`, `CreatePlanButton`, `PlanGrid`, and `PlanCard` components. Ensure they are purely presentational and receive all data and state via props.
6.  **Assemble the View**: In `MyPlansView`, use the `useMyPlans` hook to get the view model. Implement the conditional rendering logic to display the correct state (Loading, Error, Empty, or the Plan Grid).
7.  **Add Navigation**: Implement the `onClick` handlers for the `CreatePlanButton` and `PlanCard` components to navigate to the correct routes using standard `<a>` tags, allowing Astro's View Transitions to handle the navigation.
8.  **Style and Refine**: Apply Tailwind CSS classes to all components to match the desired responsive layout (grid on desktop, list on mobile). Ensure all accessibility considerations are met.


