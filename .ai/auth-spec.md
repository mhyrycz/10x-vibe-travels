# VibeTravels - Authentication Module Technical Specification

This document outlines the technical architecture for implementing user registration, login, and password management functionalities for the VibeTravels application, based on the requirements in `prd.md` (US-001, US-002) and the existing tech stack.

## 1. User Interface Architecture

The frontend will be updated to support both authenticated and unauthenticated user states, with clear separation between public-facing auth pages and protected application pages.

### 1.1. New Pages & Layouts

- **`src/pages/login.astro`**: Public page containing the `LoginForm` component. It will use `AuthLayout`.
- **`src/pages/register.astro`**: Public page containing the `RegisterForm` component. It will use `AuthLayout`.
- **`src/pages/password-reset.astro`**: Public page for users to request a password reset link.
- **`src/pages/update-password.astro`**: Page where users land from the password reset email to set a new password. This page will handle a token from the URL.
- **`src/layouts/AuthLayout.astro`**: A new minimalist layout for authentication pages, featuring a centered content area without the main application navigation, to focus the user on the authentication task.
- **`src/layouts/Layout.astro`**: The existing main layout will be modified to conditionally render UI elements based on the user's authentication state, which will be passed down from the middleware via `Astro.locals.session`.

### 1.2. New & Modified Components

- **`src/components/auth/LoginForm.tsx`**:
  - **Responsibility**: Renders email and password fields, a "Log In" button, and a link to the `/password-reset` page.
  - **Interaction**: On submit, it will make a `POST` request to the `/api/auth/login` endpoint. It will handle loading states and display error messages returned from the API (e.g., "Invalid credentials"). On success, it will redirect the user to the main dashboard (`/`).
  - **Validation**: Client-side validation for email format and non-empty password.

- **`src/components/auth/RegisterForm.tsx`**:
  - **Responsibility**: Renders email, password, and password confirmation fields, and a "Register" button.
  - **Interaction**: On submit, it will make a `POST` request to `/api/auth/register`. It will handle loading states and display API errors (e.g., "User already exists"). On success, it will display a message instructing the user to check their email to confirm their account.
  - **Validation**: Client-side validation for email format and password strength (min. 10 chars, one uppercase, one special character), and ensures passwords match.

- **`src/components/navigation/UserMenu.tsx`**:
  - **Responsibility**: This component will be updated to reflect the user's auth state.
  - **Unauthenticated State**: It will render a "Log In" button that navigates to `/login`.
  - **Authenticated State**: It will render the existing user avatar and dropdown menu, which will include a "Log Out" button. The logout button will trigger a `POST` request to `/api/auth/logout` and redirect to `/login` on success.

### 1.3. Scenarios & Error Handling

- **Invalid Login**: `LoginForm` displays "Invalid email or password."
- **User Exists During Registration**: `RegisterForm` displays "A user with this email already exists."
- **Password Mismatch**: `RegisterForm` displays "Passwords do not match."
- **Session Expiration**: The middleware will automatically redirect the user to `/login` if their session expires and they attempt to access a protected page.

## 2. Backend Logic

Backend logic will be implemented using Astro API routes, which will securely interact with the Supabase Auth service.

### 2.1. API Endpoints (Contracts)

All endpoints will be located under `src/pages/api/auth/`.

- **`POST /api/auth/login`**:
  - **Request Body**: `{ email: string, password: string }`
  - **Action**: Calls `supabase.auth.signInWithPassword()`. On success, it sets the session cookie.
  - **Success Response**: `200 OK` with user data.
  - **Error Response**: `401 Unauthorized` for invalid credentials.

- **`POST /api/auth/register`**:
  - **Request Body**: `{ email: string, password: string }`
  - **Action**: Calls `supabase.auth.signUp()`. Supabase will handle sending the confirmation email.
  - **Success Response**: `200 OK` with a message indicating that a confirmation email has been sent.
  - **Error Response**: `400 Bad Request` if the user already exists or password is weak.

- **`POST /api/auth/logout`**:
  - **Request Body**: None.
  - **Action**: Calls `supabase.auth.signOut()`.
  - **Success Response**: `200 OK`.
  - **Error Response**: `500 Internal Server Error` if sign-out fails.

- **`POST /api/auth/callback`**:
  - **Request Body**: `{ event: 'SIGNED_IN' | 'SIGNED_OUT', session: Session }` (from Supabase Auth redirect).
  - **Action**: Handles the OAuth callback from Supabase after email confirmation. It exchanges the auth code for a session and sets the session cookie.
  - **Redirects**: To `/onboarding` for new users or `/` for returning users.

### 2.2. Data Validation

- **Zod**: All API route inputs will be validated using Zod schemas to ensure type safety and correctness before processing. This prevents invalid data from reaching the Supabase client.

### 2.3. Server-Side Rendering (SSR)

- As confirmed in `astro.config.mjs`, the app uses `output: "server"`. This is critical for the authentication strategy.
- The middleware (`src/middleware/index.ts`) will run on every request, allowing server-side session validation and redirection, which is more secure than client-side-only protection.

## 3. Authentication System

The core of the authentication system will be Supabase Auth, integrated into the Astro application via middleware and API routes.

### 3.1. Middleware for Page Protection

- **File**: `src/middleware/index.ts`
- **Logic**:
  1.  Define public routes (`/login`, `/register`, `/api/*`, etc.) and protected routes (everything else).
  2.  On each request to a protected route, create a server-side Supabase client using the request's cookies.
  3.  Attempt to fetch the user's session using `supabase.auth.getSession()`.
  4.  **If no session**: Redirect the user to `/login`.
  5.  **If session exists**: Store the session and user data in `Astro.locals` (`context.locals.session = session; context.locals.user = session.user;`). This makes user data available to all Astro pages and components during server-side rendering.
  6.  Proceed to the requested page using `next()`.

### 3.2. Supabase Integration

- **Client**: A server-side Supabase client will be instantiated in the middleware for handling sessions. Client-side components will not directly handle authentication logic but will instead call the backend API routes.
- **Email Templates**: Supabase dashboard will be used to customize the email templates for "Confirm Your Email" and "Reset Your Password" to match the VibeTravels branding.
- **Redirect URLs**: The Supabase Auth settings will be configured with the correct redirect URLs for the application (e.g., `http://localhost:4321/api/auth/callback`).

### 3.3. Environment Variables

- The `.env` file will securely store the Supabase URL and anonymous key, which will be accessed on the server via `import.meta.env`. These keys will not be exposed to the client-side.
