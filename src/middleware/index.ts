import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/login",
  "/register",
  "/password-reset",
  "/update-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/reset-password",
  "/api/auth/update-password",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase instance for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase available to all routes
  locals.supabase = supabase;

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always populate locals.user if session exists (even for public paths)
  if (user) {
    locals.user = {
      email: user.email,
      id: user.id,
    };
  }

  // Skip auth requirement for public paths (but locals.user is still set if authenticated)
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Redirect to login for protected routes without authentication
  if (!user) {
    return redirect("/login");
  }

  return next();
});
