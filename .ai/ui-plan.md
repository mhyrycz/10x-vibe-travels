# UI Architecture for VibeTravels

## 1. UI Structure Overview

The VibeTravels UI architecture is designed as a modern multi-page application (MPA) with a single-page application (SPA) feel, built on a foundation of Astro and React.

-   **Framework**: Astro is used for the overall site structure, static content, and page routing. React is used to create interactive "islands" for dynamic components like forms, modals, and the plan editor.
-   **Component Library**: The entire UI will be built using **Shadcn/ui**, ensuring a consistent, modern, and accessible design system from the start. The initial MVP will be implemented with a **light theme**.
-   **Responsiveness**: The design is **mobile-first**, ensuring a seamless experience on small screens. It will adapt gracefully to tablet and desktop breakpoints using Tailwind CSS's responsive utilities.
-   **State Management**: A dual strategy is employed:
    -   **Global Client State**: React Context will manage global UI state, specifically an `AuthContext` for the user's session and a `UserPreferencesContext` for their travel profile.
    -   **Server State**: **React Query** will handle all communication with the backend API. It will manage data fetching, caching, and mutations (updates/creations/deletions), providing features like optimistic updates and stale-while-revalidate caching out of the box.
-   **Navigation**: Page-to-page navigation is handled by Astro's file-based routing. **Astro View Transitions** will be enabled to provide smooth, animated transitions, mimicking the fluidity of an SPA.

## 2. View List

### 1. Landing Page
-   **Path**: `/` (for unauthenticated users)
-   **Main Purpose**: To introduce the value proposition of VibeTravels and guide users to sign up or log in.
-   **Key Information**: Compelling headline, sub-headline explaining the AI feature, and a primary call-to-action.
-   **Key View Components**: `Header`, `Footer`, `PrimaryButton` ("Get Started for Free").
-   **UX/Accessibility/Security**: A clean, simple, and fast-loading page. The call-to-action will be prominent and keyboard-accessible.

### 2. Register Page
-   **Path**: `/register`
-   **Main Purpose**: To allow new users to create an account (US-001).
-   **Key Information**: Email and password input fields.
-   **Key View Components**: `Card`, `Input`, `Button`, `FormErrorMessage`.
-   **UX/Accessibility/Security**: The form will use `react-hook-form` and `Zod` for client-side validation (e.g., password strength) before submitting to the API. Error messages will be displayed inline.

### 3. Login Page
-   **Path**: `/login`
-   **Main Purpose**: To allow existing users to sign in (US-002).
-   **Key Information**: Email and password input fields.
-   **Key View Components**: `Card`, `Input`, `Button`, `FormErrorMessage`, Link to `/register`.
-   **UX/Accessibility/Security**: Similar to the Register page, with clear inline error handling for incorrect credentials.

### 4. Onboarding Modal
-   **Path**: N/A (Modal shown over the Dashboard after first login)
-   **Main Purpose**: To capture a new user's mandatory travel preferences (US-003).
-   **Key Information**: Form fields for people count, trip type, comfort, budget, etc.
-   **Key View Components**: `Dialog` (as a full-screen modal), `RadioGroup`, `Input`, `Button`.
-   **UX/Accessibility/Security**: This is a mandatory, blocking modal to ensure preferences are captured, which are essential for the core AI feature.

### 5. Dashboard / My Plans Page
-   **Path**: `/` (for authenticated users)
-   **Main Purpose**: To serve as the main hub for logged-in users, allowing them to create a new plan or access existing ones (US-008).
-   **Key Information**: "Create New Plan" button, a list/grid of the user's existing plans.
-   **Key View Components**: `PrimaryButton`, `PlanCard`, `GridContainer`, `EmptyState`.
-   **UX/Accessibility/Security**: Displays an "empty state" message if the user has no plans. The "Create New Plan" button will be disabled with a tooltip if the 10-plan limit is reached.

### 6. Create New Plan Page
-   **Path**: `/plans/new`
-   **Main Purpose**: To allow users to input their travel idea and parameters to generate a plan with AI (US-007).
-   **Key Information**: A single-page form with fields for destination, dates, preferences, and the main `note_text`.
-   **Key View Components**: `Form`, `Input`, `DatePicker`, `Textarea`, `RadioGroup`, `Button`.
-   **UX/Accessibility/Security**: The form will be pre-filled with the user's default preferences from the `UserPreferencesContext`. The `note_text` textarea will be resizable.

### 7. Plan Detail Page
-   **Path**: `/plans/[planId]`
-   **Main Purpose**: To display the full, day-by-day itinerary of a generated travel plan and allow for edits (US-009, US-010, US-011).
-   **Key Information**: Plan name, dates, and a list of days, each containing blocks and activities.
-   **Key View Components**: `Accordion` (for days on mobile), `ActivityCard` (with drag-and-drop handles), `EditPlanModal`, `EditActivityModal`, `DeletePlanDialog`, `RegeneratePlanDialog`.
-   **UX/Accessibility/Security**: Uses `dnd-kit` for drag-and-drop reordering, with accessible button-based alternatives ("Move Up/Down", "Move to..."). Optimistic UI updates will be used for edits and moves.

### 8. Profile & Settings Page
-   **Path**: `/profile`
-   **Main Purpose**: To allow users to manage their preferences, password, and account (US-004, US-005, US-006).
-   **Key Information**: User's current preferences, password change form, account deletion section.
-   **Key View Components**: `Tabs` ("My Preferences", "Security", "Account"), `Card`, `Form`, `Input`, `Button`, `DeleteAccountDialog`.
-   **UX/Accessibility/Security**: The tabbed layout cleanly separates distinct functions. The "Delete Account" action is placed in its own tab and protected by a confirmation dialog requiring the user to type the plan name.

### 9. Admin Placeholder Page
-   **Path**: `/admin`
-   **Main Purpose**: To reserve the route for future admin functionality.
-   **Key Information**: A simple "Coming Soon" or "Admin Panel" message.
-   **Key View Components**: `Header`, `Footer`, `Heading`.
-   **UX/Accessibility/Security**: This page will be protected by middleware in Astro, redirecting any non-admin users to the homepage.

## 3. User Journey Map

### New User Journey
1.  **Landing**: User arrives at the **Landing Page**.
2.  **Registration**: Clicks "Get Started for Free," is taken to the **Register Page**, and creates an account.
3.  **Onboarding**: After the first login, the **Onboarding Modal** appears over the **Dashboard**. The user fills out their preferences.
4.  **First Plan Creation**: After submitting preferences, the user is redirected to the **Create New Plan Page**.
5.  **Generation**: The user fills out the form and clicks "Generate a plan". They are navigated to the **Dashboard**, where a placeholder `PlanCard` appears with a "generating..." state.
6.  **View Plan**: Once generation is complete, the `PlanCard` updates. The user clicks it and is taken to the **Plan Detail Page** to see their new itinerary.

### Returning User Journey (Editing a Plan)
1.  **Login**: User arrives at the **Landing Page**, clicks "Login," and signs in on the **Login Page**.
2.  **Dashboard**: User is on the **Dashboard** and sees their list of plans.
3.  **Select Plan**: User clicks on a `PlanCard` to navigate to the **Plan Detail Page**.
4.  **Edit Activity**: User decides to move an activity. They click the menu on an `ActivityCard` and select "Edit / Move".
5.  **Modal Interaction**: The `EditActivityModal` opens. The user changes the `order_index` and clicks "Save".
6.  **Optimistic Update**: The UI updates instantly while the `useUpdateActivity` mutation runs in the background. If it fails, the change reverts and a toast error is shown.
7.  **Edit Plan Details**: The user then clicks the "Edit Plan" button in the page header. The `EditPlanModal` opens, they change the plan's name, dates (date span has to be the same as currently generated plan) and save. The UI updates optimistically.

## 4. Layout and Navigation Structure

### Main Layout
-   A persistent layout file in Astro (`src/layouts/Layout.astro`) will wrap all pages.
-   It will contain a `<Header />`, a `<main>` content slot, and a `<Footer />`.
-   Astro View Transitions will be enabled in this layout to animate page changes.

### Navigation
-   **Unauthenticated Header**: Contains the "VibeTravels" logo, a "Login" button, and a "Register" button.
-   **Authenticated Header**: Contains the "VibeTravels" logo (links to dashboard), a "My Plans" link, and a user dropdown menu.
-   **User Dropdown Menu**: Triggered by clicking the user's name/email. It contains links to "Profile & Settings" and a "Logout" button. The "View Admin Panel" link will appear here conditionally for admin users.

## 5. Key Components

-   **`PlanCard` (React)**: A card component used on the Dashboard to display a summary of a travel plan. Includes a skeleton state for loading and a "generating" state.
-   **`ActivityCard` (React)**: A card for a single activity within the Plan Detail view. Includes a drag handle, activity details, and a dropdown menu for actions ("Edit / Move").
-   **`EditPlanModal` (React)**: A modal dialog containing the form to edit a plan's metadata (name, preferences, etc.).
-   **`EditActivityModal` (React)**: A modal dialog containing the form to edit an activity's details (title, duration) and/or its location (block, order index). A single "Save" button intelligently calls the correct API endpoint.
-   **`DeleteConfirmationDialog` (React)**: A reusable modal for confirming destructive actions. For deleting plans, it will require the user to type the plan's name.
-   **`AuthContext.Provider` (React)**: A context provider that wraps the application to provide global access to the user's authentication state.
-   **`UserPreferencesContext.Provider` (React)**: A context provider for the user's travel preferences.
-   **Custom Hooks (React)**:
    -   `usePlans()`: A React Query hook to fetch the list of plans.
    -   `usePlan(planId)`: A React Query hook to fetch the details of a single plan.
    -   `useUpdateActivity()`: A React Query mutation hook that handles both editing and moving an activity.
